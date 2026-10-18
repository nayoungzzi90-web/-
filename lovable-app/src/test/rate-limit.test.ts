import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  readRateEnv,
  _previewMemoryKeys,
  resolveClientIdentity,
  hmacIdentity,
  _resetPreviewMemory,
  RATE_LIMIT_MAX,
  UNKNOWN_KEY_MAX,
  type RateRpc,
  type RateEnv,
} from "@/lib/rate-limit.server";

const PEPPER = "p".repeat(40);
const prodEnv: RateEnv = { mode: "production", pepper: PEPPER, trustedHeader: "cf-connecting-ip" };

function mockAtomicRpc(): RateRpc & { store: Map<string, number> } {
  const store = new Map<string, number>();
  return {
    store,
    async hit(scope, h, max) {
      const k = `${scope}|${h}`;
      const n = (store.get(k) ?? 0) + 1; // INSERT ... ON CONFLICT DO UPDATE count+1 RETURNING 모의
      store.set(k, n);
      return { allowed: n <= max };
    },
  };
}
const hdr = (o: Record<string, string>) => (n: string) => o[n];

describe("R-015 rate limit", () => {
  beforeEach(() => _resetPreviewMemory());

  it("30회 허용 / 31번째 거부", async () => {
    const rpc = mockAtomicRpc();
    const g = hdr({ "cf-connecting-ip": "203.0.113.5" });
    for (let i = 0; i < RATE_LIMIT_MAX; i++)
      expect((await checkRateLimit({ env: prodEnv, getHeader: g, rpc })).allowed).toBe(true);
    expect(await checkRateLimit({ env: prodEnv, getHeader: g, rpc })).toEqual({
      allowed: false,
      reason: "limited",
    });
  });

  it("DB RPC 오류 시 production fail-closed", async () => {
    const rpc: RateRpc = {
      hit: async () => {
        throw new Error("db down");
      },
    };
    const r = await checkRateLimit({
      env: prodEnv,
      getHeader: hdr({ "cf-connecting-ip": "203.0.113.5" }),
      rpc,
    });
    expect(r).toEqual({ allowed: false, reason: "unavailable" });
  });

  it("서로 다른 IP는 서로 다른 해시 키", async () => {
    const a = await hmacIdentity(PEPPER, "203.0.113.5");
    const b = await hmacIdentity(PEPPER, "203.0.113.6");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203.0.113.5");
    const rpc = mockAtomicRpc();
    for (let i = 0; i < 31; i++)
      await checkRateLimit({
        env: prodEnv,
        getHeader: hdr({ "cf-connecting-ip": "203.0.113.5" }),
        rpc,
      });
    expect(
      (
        await checkRateLimit({
          env: prodEnv,
          getHeader: hdr({ "cf-connecting-ip": "203.0.113.6" }),
          rpc,
        })
      ).allowed,
    ).toBe(true);
  });

  it("클라이언트 x-forwarded-for는 신뢰하지 않음", () => {
    expect(
      resolveClientIdentity(hdr({ "x-forwarded-for": "1.2.3.4" }), "cf-connecting-ip"),
    ).toEqual({ key: "unknown", shared: true });
    // 설정값이 x-forwarded-for여도 허용 목록 밖이므로 무시
    expect(resolveClientIdentity(hdr({ "x-forwarded-for": "1.2.3.4" }), "x-forwarded-for")).toEqual(
      { key: "unknown", shared: true },
    );
    expect(
      resolveClientIdentity(hdr({ "cf-connecting-ip": "1.2.3.4, 5.6.7.8" }), "cf-connecting-ip")
        .shared,
    ).toBe(true);
  });

  it("신뢰 헤더 없음 → 공유 unknown 키, 더 엄격한 한도", async () => {
    const rpc = mockAtomicRpc();
    const g = hdr({ "x-forwarded-for": "9.9.9.9" });
    for (let i = 0; i < UNKNOWN_KEY_MAX; i++)
      expect((await checkRateLimit({ env: prodEnv, getHeader: g, rpc })).allowed).toBe(true);
    expect((await checkRateLimit({ env: prodEnv, getHeader: hdr({}), rpc })).allowed).toBe(false);
  });

  it("production 비밀값/RPC 누락 시 fail-closed", async () => {
    const g = hdr({ "cf-connecting-ip": "203.0.113.5" });
    expect(
      await checkRateLimit({
        env: { ...prodEnv, pepper: undefined },
        getHeader: g,
        rpc: mockAtomicRpc(),
      }),
    ).toEqual({ allowed: false, reason: "unavailable" });
    expect(
      await checkRateLimit({
        env: { ...prodEnv, pepper: "short" },
        getHeader: g,
        rpc: mockAtomicRpc(),
      }),
    ).toEqual({ allowed: false, reason: "unavailable" });
    expect(await checkRateLimit({ env: prodEnv, getHeader: g, rpc: null })).toEqual({
      allowed: false,
      reason: "unavailable",
    });
  });

  it("preview 모드는 메모리 최선노력으로 명시 표기", async () => {
    const r = await checkRateLimit({
      env: { mode: "preview", pepper: undefined, trustedHeader: undefined },
      getHeader: hdr({}),
      rpc: null,
    });
    expect(r).toEqual({ allowed: true, backend: "preview-memory-best-effort" });
  });

  it("응답에 비밀값·원시 IP 미포함", async () => {
    const r = await checkRateLimit({
      env: prodEnv,
      getHeader: hdr({ "cf-connecting-ip": "203.0.113.5" }),
      rpc: mockAtomicRpc(),
    });
    const s = JSON.stringify(r);
    expect(s).not.toContain(PEPPER);
    expect(s).not.toContain("203.0.113.5");
  });

  it("preview + pepper 없음: 메모리 키에 원시 IP 미저장, 공유 10회 한도", async () => {
    const env: RateEnv = { mode: "preview", pepper: undefined, trustedHeader: "cf-connecting-ip" };
    const g = hdr({ "cf-connecting-ip": "203.0.113.5" });
    for (let i = 0; i < UNKNOWN_KEY_MAX; i++)
      expect((await checkRateLimit({ env, getHeader: g, rpc: null })).allowed).toBe(true);
    expect((await checkRateLimit({ env, getHeader: g, rpc: null })).allowed).toBe(false);
    expect(_previewMemoryKeys()).toEqual(["unknown"]);
    expect(_previewMemoryKeys().join()).not.toContain("203.0.113.5");
  });

  it("preview + RPC 실패: 메모리 키는 해시만", async () => {
    const env: RateEnv = { mode: "preview", pepper: PEPPER, trustedHeader: "cf-connecting-ip" };
    const rpc: RateRpc = {
      hit: async () => {
        throw new Error("x");
      },
    };
    await checkRateLimit({ env, getHeader: hdr({ "cf-connecting-ip": "203.0.113.5" }), rpc });
    expect(_previewMemoryKeys().join()).not.toContain("203.0.113.5");
    expect(_previewMemoryKeys()[0]).toMatch(/^h:[0-9a-f]{64}$/);
  });

  it("배포 빌드(isDev=false)는 RATE_LIMIT_MODE=preview여도 production", () => {
    const prev = process.env["RATE_LIMIT_MODE"];
    process.env["RATE_LIMIT_MODE"] = "preview";
    try {
      expect(readRateEnv(false).mode).toBe("production");
      expect(readRateEnv(true).mode).toBe("preview");
    } finally {
      if (prev === undefined) delete process.env["RATE_LIMIT_MODE"];
      else process.env["RATE_LIMIT_MODE"] = prev;
    }
  });
});
