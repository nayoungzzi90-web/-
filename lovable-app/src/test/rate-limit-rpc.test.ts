import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// 실제 supabase-js 클라이언트가 PostgREST RPC 요청을 보내는지 가짜 서버로 확인한다.
// (이전에는 rpc 메서드를 떼어 호출해 TypeError → production 에서 모든 요청이 영구 차단되는 버그가 있었다.)
let srv: http.Server;
let reply = "true";
const seen: {
  method: string | undefined;
  url: string | undefined;
  body: string;
  auth: string | undefined;
}[] = [];

beforeAll(async () => {
  srv = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({
        method: req.method,
        url: req.url,
        body,
        auth: req.headers["apikey"] as string | undefined,
      });
      res.setHeader("content-type", "application/json");
      res.end(reply);
    });
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  process.env["SUPABASE_URL"] = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key-not-real-0123456789";
});
afterAll(() => srv.close());

describe("createSupabaseRateRpc (실제 supabase-js → 가짜 PostgREST)", () => {
  it("rpc 를 올바른 경로·본문으로 호출하고 true/false 를 허용/거부로 변환", async () => {
    const { createSupabaseRateRpc } = await import("@/lib/rate-limit.server");
    const rpc = await createSupabaseRateRpc();
    expect(rpc).not.toBeNull();
    const hash = "a".repeat(64);

    reply = "true";
    expect(await rpc!.hit("saju_preview", hash, 30, 60)).toEqual({ allowed: true });
    reply = "false";
    expect(await rpc!.hit("saju_preview_unknown", hash, 10, 60)).toEqual({ allowed: false });

    expect(seen).toHaveLength(2);
    expect(seen[0]!.method).toBe("POST");
    expect(seen[0]!.url).toBe("/rest/v1/rpc/saju_rate_limit_hit");
    expect(JSON.parse(seen[0]!.body)).toEqual({ p_scope: "saju_preview", p_identity_hash: hash });
    expect(seen[0]!.auth).toBe("test-service-role-key-not-real-0123456789");
    // 한도·창은 앱이 보내지 않는다(DB 고정)
    expect(seen[0]!.body).not.toMatch(/max|window/i);
  });

  it("boolean 이 아닌 응답과 서버 오류는 예외(→ production fail-closed)", async () => {
    const { createSupabaseRateRpc } = await import("@/lib/rate-limit.server");
    const rpc = (await createSupabaseRateRpc())!;
    reply = '"yes"';
    await expect(rpc.hit("saju_preview", "b".repeat(64), 30, 60)).rejects.toThrow();
    reply = '{"message":"function not found","code":"PGRST202"}';
    await expect(rpc.hit("saju_preview", "b".repeat(64), 30, 60)).rejects.toThrow();
  });
});
