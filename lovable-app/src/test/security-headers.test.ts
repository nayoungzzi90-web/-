import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "@/lib/security-headers";

describe("보안 헤더", () => {
  it("기본 헤더를 붙이고 본문·상태·기존 헤더는 그대로 둔다", async () => {
    const r = withSecurityHeaders(
      new Response("hi", { status: 201, headers: { "x-content-type-options": "custom", a: "b" } }),
    );
    expect(r.status).toBe(201);
    expect(await r.text()).toBe("hi");
    expect(r.headers.get("a")).toBe("b");
    expect(r.headers.get("x-content-type-options")).toBe("custom");
    expect(r.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(r.headers.get("strict-transport-security")).toMatch(/max-age=/);
  });
  it("읽기 전용 헤더(Response.redirect)에도 동작한다", () => {
    const r = withSecurityHeaders(Response.redirect("https://example.com/", 302));
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://example.com/");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
