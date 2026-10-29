// 엽전 충전·내역 화면의 순수 로직(서버·화면 모두에서 안전). 결제 모드가 sandbox 일 때만 실제로 동작하며, 실제 돈은 움직이지 않는다.
import { COIN_KRW, won } from "./coins";

export const PACKS = [1, 2, 3, 4].map((coins) => ({
  coins,
  amountKrw: coins * COIN_KRW,
  label: `엽전 ${coins}닢`,
  price: won(coins),
}));

export type PaymentsStatus = { mode: "disabled" | "sandbox" | "live"; available: boolean };

/** 서버가 던진 PaymentError 코드(메시지)를 사용자 문구로 */
export function chargeErrorKo(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("PAYMENTS_DISABLED") || m.includes("NOT_CONFIGURED"))
    return "결제는 아직 준비 중이에요.";
  if (m.includes("CONSENT_REQUIRED")) return "이용약관과 환불정책에 동의해 주세요.";
  if (m.includes("AMOUNT_MISMATCH"))
    return "결제 금액이 맞지 않아 취소됐어요. 잠시 후 다시 시도해 주세요.";
  if (m.includes("PROVIDER_REJECTED")) return "결제가 승인되지 않았어요.";
  if (m.includes("NOT_PAYABLE")) return "이미 처리됐거나 취소된 주문이에요.";
  if (m.includes("FORBIDDEN") || m.includes("ORDER_NOT_FOUND")) return "주문을 찾을 수 없어요.";
  return "충전에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

/** 테스트용(sandbox) 결제 키. 서버 SandboxProvider 가 이 모양만 승인한다. */
export function newSandboxPaymentKey(): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2).padEnd(12, "0");
  return `sandbox_${r}`;
}

export interface ChargeDeps {
  createOrder(input: {
    data: { coins: number; consentVersion: string };
  }): Promise<{ orderId: string; coins: number; amountKrw: number; orderName: string }>;
  confirmOrder(input: { data: { orderId: string; paymentKey: string } }): Promise<{
    credited: boolean;
    alreadyCredited: boolean;
    balance: number | null;
    referral: string | null;
  }>;
  paymentKey?: () => string;
}
export type ChargeResult =
  { ok: true; balance: number | null; coins: number } | { ok: false; message: string };

/** 팩 하나를 충전한다: 주문 생성 → (sandbox 승인) → 확정. 금액은 서버가 정하므로 클라이언트는 팩 크기만 보낸다. */
export async function runCharge(
  coins: number,
  consentVersion: string,
  deps: ChargeDeps,
): Promise<ChargeResult> {
  try {
    const order = await deps.createOrder({ data: { coins, consentVersion } });
    const r = await deps.confirmOrder({
      data: { orderId: order.orderId, paymentKey: (deps.paymentKey ?? newSandboxPaymentKey)() },
    });
    return { ok: true, balance: r.balance, coins };
  } catch (e) {
    return { ok: false, message: chargeErrorKo(e instanceof Error ? e.message : String(e)) };
  }
}

export interface LedgerRow {
  id: number;
  delta: number;
  reason: string;
  ref: string | null;
  balanceAfter: number;
  createdAt: string;
}
const LEDGER_LABEL: Record<string, string> = {
  purchase: "엽전 충전",
  referral_reward: "친구 초대 보상",
  spend: "풀이 열람",
  refund: "환불",
  reward_clawback: "초대 보상 회수",
  adjust: "조정",
};
export const ledgerLabel = (reason: string) => LEDGER_LABEL[reason] ?? "기타";

/** 원장 한 줄을 화면 문구로: "엽전 충전 +1닢 (잔액 3닢)" */
export function ledgerText(r: LedgerRow): string {
  return `${ledgerLabel(r.reason)} ${r.delta > 0 ? "+" : ""}${r.delta}닢 (잔액 ${r.balanceAfter}닢)`;
}
