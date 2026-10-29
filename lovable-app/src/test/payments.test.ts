import http from "node:http";
import type { AddressInfo } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PaymentError,
  SandboxProvider,
  paymentsService,
  readPaymentsMode,
  supabaseOrdersApi,
  type AdminLike,
  type CreditResult,
  type OrderRow,
  type OrdersApi,
} from "@/lib/payments.server";
import { safeNext } from "@/lib/safe-next";
import { COIN_KRW, PRODUCTS } from "@/lib/coins";

function fakeApi(over: Partial<OrdersApi> = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const orders = new Map<string, OrderRow>();
  const api: OrdersApi = {
    async createOrder(userId, coins, consent) {
      calls.push({ fn: "createOrder", args: [userId, coins, consent] });
      const id = `order-${orders.size + 1}`;
      orders.set(id, { userId, coins, amountKrw: coins * COIN_KRW, status: "created" });
      return id;
    },
    async getOrder(id) {
      return orders.get(id) ?? null;
    },
    async credit(id, provider, pid, amount): Promise<CreditResult> {
      calls.push({ fn: "credit", args: [id, provider, pid, amount] });
      return { credited: true, alreadyCredited: false, balance: 1, referral: "none" };
    },
    ...over,
  };
  return { api, calls, orders };
}

describe("결제 모드", () => {
  it("기본은 꺼짐, 모르는 값도 꺼짐, sandbox·live 만 켜짐", () => {
    expect(readPaymentsMode({})).toBe("disabled");
    expect(readPaymentsMode({ PAYMENTS_MODE: "yes" })).toBe("disabled");
    expect(readPaymentsMode({ PAYMENTS_MODE: "sandbox" })).toBe("sandbox");
    expect(readPaymentsMode({ PAYMENTS_MODE: "sandbox", NODE_ENV: "production" })).toBe("disabled");
    expect(readPaymentsMode({ PAYMENTS_MODE: "sandbox" })).toBe("sandbox");
    expect(readPaymentsMode({ PAYMENTS_MODE: "live" })).toBe("live");
  });

  it("disabled 면 주문·확정 모두 거부하고 DB 를 건드리지 않는다", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "disabled", provider: new SandboxProvider(), api: f.api });
    await expect(svc.createOrder("u1", 1, "v1")).rejects.toMatchObject({
      code: "PAYMENTS_DISABLED",
    });
    await expect(svc.confirm("u1", "order-1", "sandbox_abcd")).rejects.toMatchObject({
      code: "PAYMENTS_DISABLED",
    });
    expect(f.calls).toEqual([]);
  });

  it("live 인데 실제 PG 구현이 없으면 NOT_CONFIGURED(실제 결제 불가)", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "live", provider: null, api: f.api });
    await expect(svc.createOrder("u1", 1, "v1")).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(f.calls).toEqual([]);
  });
});

describe("주문·확정 흐름(sandbox)", () => {
  it("팩은 1~4닢, 금액은 서버가 900원 단위로 계산해 돌려준다", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "sandbox", provider: new SandboxProvider(), api: f.api });
    const r = await svc.createOrder("u1", 3, "v1");
    expect(r).toEqual({ orderId: "order-1", coins: 3, amountKrw: 2700, orderName: "엽전 3닢" });
    for (const bad of [0, 5, 1.5, -1, Number.NaN])
      await expect(svc.createOrder("u1", bad, "v1")).rejects.toMatchObject({
        code: "INVALID_PACK",
      });
    expect(PRODUCTS.basic.coins * COIN_KRW).toBe(900);
  });

  it("확정: 주문 금액 그대로 승인 → 충전 1회. 다른 사람의 주문은 FORBIDDEN, 없는 주문은 ORDER_NOT_FOUND", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "sandbox", provider: new SandboxProvider(), api: f.api });
    const { orderId } = await svc.createOrder("u1", 2, "v1");
    await expect(svc.confirm("u2", orderId, "sandbox_abcd1234")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(svc.confirm("u1", "nope", "sandbox_abcd1234")).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
    expect(f.calls.filter((c) => c.fn === "credit")).toHaveLength(0);
    const r = await svc.confirm("u1", orderId, "sandbox_abcd1234");
    expect(r).toMatchObject({ credited: true });
    expect(f.calls.find((c) => c.fn === "credit")!.args).toEqual([
      orderId,
      "sandbox",
      "sandbox_abcd1234",
      1800,
    ]);
  });

  it("약관 동의 버전이 없거나 이상하면 주문을 만들지 않는다(CONSENT_REQUIRED)", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "sandbox", provider: new SandboxProvider(), api: f.api });
    for (const bad of ["", " ", "a".repeat(41), "v 1", "v1;drop", undefined as unknown as string])
      await expect(svc.createOrder("u1", 1, bad), String(bad)).rejects.toMatchObject({
        code: "CONSENT_REQUIRED",
      });
    expect(f.calls).toEqual([]);
    await svc.createOrder("u1", 1, "draft-2026-10-29");
    expect(f.calls[0]).toEqual({ fn: "createOrder", args: ["u1", 1, "draft-2026-10-29"] });
  });

  it("PG 가 거절(잘못된 paymentKey)하면 충전하지 않는다", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "sandbox", provider: new SandboxProvider(), api: f.api });
    const { orderId } = await svc.createOrder("u1", 1, "v1");
    await expect(svc.confirm("u1", orderId, "real_key_123")).rejects.toMatchObject({
      code: "PROVIDER_REJECTED",
    });
    expect(f.calls.filter((c) => c.fn === "credit")).toHaveLength(0);
  });

  it("PG 승인 금액이 주문 금액과 다르면 충전하지 않는다", async () => {
    const f = fakeApi();
    const cheat = {
      name: "cheat",
      confirm: async (i: { amountKrw: number }) => ({
        providerPaymentId: "x1234",
        amountKrw: i.amountKrw - 900,
      }),
    };
    const svc = paymentsService({ mode: "sandbox", provider: cheat, api: f.api });
    const { orderId } = await svc.createOrder("u1", 3, "v1");
    await expect(svc.confirm("u1", orderId, "sandbox_abcd")).rejects.toMatchObject({
      code: "AMOUNT_MISMATCH",
    });
    expect(f.calls.filter((c) => c.fn === "credit")).toHaveLength(0);
  });

  it("저장된 주문 금액이 팩 가격과 다르거나 취소된 주문이면 중단", async () => {
    const f = fakeApi();
    const svc = paymentsService({ mode: "sandbox", provider: new SandboxProvider(), api: f.api });
    const { orderId } = await svc.createOrder("u1", 2, "v1");
    f.orders.get(orderId)!.amountKrw = 100;
    await expect(svc.confirm("u1", orderId, "sandbox_abcd")).rejects.toMatchObject({
      code: "AMOUNT_MISMATCH",
    });
    f.orders.get(orderId)!.amountKrw = 1800;
    f.orders.get(orderId)!.status = "canceled";
    await expect(svc.confirm("u1", orderId, "sandbox_abcd")).rejects.toMatchObject({
      code: "NOT_PAYABLE",
    });
    expect(PaymentError).toBeTruthy();
  });
});

// 실제 supabase-js 클라이언트가 PostgREST 로 올바르게 요청하는지(this 소실 같은 연결 버그 방지) 가짜 서버로 확인한다.
describe("supabaseOrdersApi (실제 supabase-js → 가짜 PostgREST)", () => {
  let srv: http.Server;
  const seen: { method: string | undefined; url: string | undefined; body: string }[] = [];
  const replies: Record<string, unknown> = {};
  let admin: AdminLike;
  beforeAll(async () => {
    srv = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        seen.push({ method: req.method, url: req.url, body });
        const key = (req.url ?? "").split("?")[0]!;
        const r = replies[key];
        res.setHeader("content-type", "application/json");
        if (r && typeof r === "object" && "error" in (r as object)) {
          res.statusCode = 400;
          res.end(JSON.stringify((r as { error: unknown }).error));
        } else res.end(JSON.stringify(r ?? null));
      });
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    admin = createClient(
      `http://127.0.0.1:${(srv.address() as AddressInfo).port}`,
      "x".repeat(40),
      { auth: { persistSession: false } },
    ) as unknown as AdminLike;
  });
  afterAll(() => srv.close());

  it("create_coin_order·credit_purchase 를 올바른 경로·본문으로 호출하고 결과를 직렬화 가능한 모양으로 돌려준다", async () => {
    const api = supabaseOrdersApi(admin);
    replies["/rest/v1/rpc/create_coin_order"] = "11111111-1111-4111-8111-111111111111";
    expect(await api.createOrder("22222222-2222-4222-8222-222222222222", 2, "v1")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(JSON.parse(seen.at(-1)!.body)).toEqual({
      p_user: "22222222-2222-4222-8222-222222222222",
      p_coins: 2,
      p_consent_version: "v1",
    });

    replies["/rest/v1/rpc/credit_purchase"] = {
      credited: true,
      balance: 2,
      purchase_id: "p",
      referral: "rewarded",
    };
    expect(await api.credit("o1", "sandbox", "sandbox_abcd", 1800)).toEqual({
      credited: true,
      alreadyCredited: false,
      balance: 2,
      referral: "rewarded",
    });
    expect(seen.at(-1)!.url).toBe("/rest/v1/rpc/credit_purchase");
    expect(JSON.parse(seen.at(-1)!.body)).toEqual({
      p_order_id: "o1",
      p_provider: "sandbox",
      p_provider_payment_id: "sandbox_abcd",
      p_amount_krw: 1800,
    });

    replies["/rest/v1/rpc/credit_purchase"] = { credited: false, already_credited: true };
    expect(await api.credit("o1", "sandbox", "sandbox_abcd", 1800)).toMatchObject({
      credited: false,
      alreadyCredited: true,
    });
  });

  it("DB 가 AMOUNT_MISMATCH 등으로 거부하면 PaymentError 로 바꾼다", async () => {
    const api = supabaseOrdersApi(admin);
    replies["/rest/v1/rpc/credit_purchase"] = {
      error: { message: "AMOUNT_MISMATCH", code: "P0001" },
    };
    await expect(api.credit("o1", "sandbox", "sandbox_abcd", 900)).rejects.toMatchObject({
      code: "AMOUNT_MISMATCH",
    });
    replies["/rest/v1/rpc/credit_purchase"] = {
      error: { message: "ORDER_ALREADY_PAID_DIFFERENT_PAYMENT" },
    };
    await expect(api.credit("o1", "sandbox", "other", 900)).rejects.toMatchObject({
      code: "NOT_PAYABLE",
    });
  });

  it("getOrder: 행이 있으면 모양을 바꿔 돌려주고, 없으면 null", async () => {
    const api = supabaseOrdersApi(admin);
    replies["/rest/v1/coin_orders"] = {
      user_id: "u1",
      coins: 2,
      amount_krw: 1800,
      status: "created",
    };
    expect(await api.getOrder("o1")).toEqual({
      userId: "u1",
      coins: 2,
      amountKrw: 1800,
      status: "created",
    });
    replies["/rest/v1/coin_orders"] = null;
    expect(await api.getOrder("o2")).toBeNull();
  });
});

describe("safeNext (로그인 후 이동 경로)", () => {
  it("같은 사이트 안의 경로만 허용", () => {
    expect(safeNext("/basic")).toBe("/basic");
    expect(safeNext("/my?tab=1")).toBe("/my?tab=1");
    for (const bad of [
      undefined,
      null,
      "",
      "basic",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "/a\nb",
      "/a\\b",
    ])
      expect(safeNext(bad as string | undefined)).toBe("/");
  });
});
