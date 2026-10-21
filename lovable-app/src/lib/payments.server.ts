// 엽전 충전 결제(서버 전용). 결제는 기본 꺼짐: PAYMENTS_MODE 가 없거나 'disabled' 면 모든 호출이 PAYMENTS_DISABLED 로 거부된다.
//   disabled → sandbox(가짜 결제 확인, 테스트용) → live(실제 PG, 아직 구현·계약 없음: NOT_CONFIGURED)
// 돈 안전 원칙
//   · 금액은 서버(DB 함수 create_coin_order)가 팩 크기로 정한다. 클라이언트가 보낸 금액은 쓰지 않는다.
//   · PG 가 돌려준 승인 금액이 주문 금액과 같을 때만 충전(credit_purchase)한다. 충전은 DB 한 트랜잭션·멱등.
//   · 주문은 요청한 로그인 사용자의 것만 확정할 수 있다.
import { COIN_KRW } from "./coins";

export type PaymentsMode = "disabled" | "sandbox" | "live";
export type PaymentErrorCode =
  | "PAYMENTS_DISABLED"
  | "NOT_CONFIGURED"
  | "INVALID_PACK"
  | "ORDER_NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_PAYABLE"
  | "PROVIDER_REJECTED"
  | "AMOUNT_MISMATCH";
export class PaymentError extends Error {
  constructor(
    public code: PaymentErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function readPaymentsMode(
  env: Record<string, string | undefined> = process.env,
): PaymentsMode {
  const m = env["PAYMENTS_MODE"];
  return m === "sandbox" || m === "live" ? m : "disabled";
}

export interface ConfirmedPayment {
  providerPaymentId: string;
  amountKrw: number;
}
export interface PaymentProvider {
  name: string;
  /** PG 서버에 결제 승인을 확인한다. 거절·오류는 PaymentError("PROVIDER_REJECTED") 로 던진다. */
  confirm(i: { orderId: string; paymentKey: string; amountKrw: number }): Promise<ConfirmedPayment>;
}

/** 테스트용: paymentKey 가 "sandbox_" 로 시작하면 주문 금액 그대로 승인한다. 실제 돈은 움직이지 않는다. */
export class SandboxProvider implements PaymentProvider {
  name = "sandbox";
  async confirm(i: {
    orderId: string;
    paymentKey: string;
    amountKrw: number;
  }): Promise<ConfirmedPayment> {
    if (!/^sandbox_[A-Za-z0-9_-]{4,64}$/.test(i.paymentKey))
      throw new PaymentError("PROVIDER_REJECTED");
    return { providerPaymentId: i.paymentKey, amountKrw: i.amountKrw };
  }
}

/** credit_purchase 결과(직렬화 가능한 모양). 같은 결제를 다시 처리하면 credited=false, alreadyCredited=true */
export interface CreditResult {
  credited: boolean;
  alreadyCredited: boolean;
  balance: number | null;
  referral: string | null;
}
export interface OrderRow {
  userId: string;
  coins: number;
  amountKrw: number;
  status: string;
}
export interface OrdersApi {
  createOrder(userId: string, coins: number): Promise<string>;
  getOrder(orderId: string): Promise<OrderRow | null>;
  credit(
    orderId: string,
    provider: string,
    providerPaymentId: string,
    amountKrw: number,
  ): Promise<CreditResult>;
}

export function packAmount(coins: number): number {
  return coins * COIN_KRW;
}

export function paymentsService(opts: {
  mode: PaymentsMode;
  provider: PaymentProvider | null;
  api: OrdersApi;
}) {
  const guard = () => {
    if (opts.mode === "disabled") throw new PaymentError("PAYMENTS_DISABLED");
    if (!opts.provider) throw new PaymentError("NOT_CONFIGURED");
  };
  return {
    async createOrder(userId: string, coins: number) {
      guard();
      if (!Number.isInteger(coins) || coins < 1 || coins > 4)
        throw new PaymentError("INVALID_PACK");
      const orderId = await opts.api.createOrder(userId, coins);
      return { orderId, coins, amountKrw: packAmount(coins), orderName: `엽전 ${coins}닢` };
    },
    async confirm(userId: string, orderId: string, paymentKey: string) {
      guard();
      const order = await opts.api.getOrder(orderId);
      if (!order) throw new PaymentError("ORDER_NOT_FOUND");
      if (order.userId !== userId) throw new PaymentError("FORBIDDEN");
      if (order.amountKrw !== packAmount(order.coins)) throw new PaymentError("AMOUNT_MISMATCH"); // 저장된 금액이 팩 가격과 다르면 중단
      // 이미 확정된 주문은 PG 를 다시 부르지 않고 결과만 멱등 반환
      if (order.status !== "created" && order.status !== "paid")
        throw new PaymentError("NOT_PAYABLE");
      const p = await opts.provider!.confirm({ orderId, paymentKey, amountKrw: order.amountKrw });
      if (p.amountKrw !== order.amountKrw) throw new PaymentError("AMOUNT_MISMATCH");
      const result = await opts.api.credit(
        orderId,
        opts.provider!.name,
        p.providerPaymentId,
        p.amountKrw,
      );
      return result;
    },
  };
}

/** service_role 클라이언트로 DB 함수를 부르는 구현. 반드시 admin.rpc(...) 메서드 호출 형태로 부른다(this 소실 방지). */
export function supabaseOrdersApi(admin: AdminLike): OrdersApi {
  return {
    async createOrder(userId, coins) {
      const { data, error } = await admin.rpc("create_coin_order", {
        p_user: userId,
        p_coins: coins,
      });
      if (error || typeof data !== "string")
        throw new PaymentError("INVALID_PACK", "주문을 만들지 못했어요.");
      return data;
    },
    async getOrder(orderId) {
      const { data, error } = await admin
        .from("coin_orders")
        .select("user_id, coins, amount_krw, status")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw new Error("주문 조회 실패");
      if (!data) return null;
      const d = data as { user_id: string; coins: number; amount_krw: number; status: string };
      return { userId: d.user_id, coins: d.coins, amountKrw: d.amount_krw, status: d.status };
    },
    async credit(orderId, provider, providerPaymentId, amountKrw) {
      const { data, error } = await admin.rpc("credit_purchase", {
        p_order_id: orderId,
        p_provider: provider,
        p_provider_payment_id: providerPaymentId,
        p_amount_krw: amountKrw,
      });
      if (error) {
        const msg = (error as { message?: string }).message ?? "";
        if (msg.includes("AMOUNT_MISMATCH")) throw new PaymentError("AMOUNT_MISMATCH");
        if (msg.includes("ORDER_NOT_PAYABLE") || msg.includes("ORDER_ALREADY_PAID"))
          throw new PaymentError("NOT_PAYABLE");
        throw new Error("충전 실패");
      }
      const d = (data ?? {}) as {
        credited?: boolean;
        already_credited?: boolean;
        balance?: number;
        referral?: string;
      };
      return {
        credited: d.credited === true,
        alreadyCredited: d.already_credited === true,
        balance: typeof d.balance === "number" ? d.balance : null,
        referral: typeof d.referral === "string" ? d.referral : null,
      };
    },
  };
}

/** supabase-js 클라이언트 중 우리가 쓰는 부분(테스트에서 실제 클라이언트를 그대로 넣는다) */
export interface AdminLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  from(table: string): {
    select(cols: string): {
      eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
}

/** 환경 설정으로 서비스를 만든다. 실제 PG 연동이 없으므로 live 는 provider=null(NOT_CONFIGURED). */
export async function buildPaymentsService() {
  const mode = readPaymentsMode();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const provider: PaymentProvider | null = mode === "sandbox" ? new SandboxProvider() : null;
  return paymentsService({
    mode,
    provider,
    api: supabaseOrdersApi(supabaseAdmin as unknown as AdminLike),
  });
}
