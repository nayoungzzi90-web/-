// 엽전 충전·내역 화면의 순수 로직. 결제는 꺼져 있어 이 파일은 표시용 팩 목록과 내역 문구만 만든다.
import { COIN_KRW, won } from "./coins";

export const PACKS = [1, 2, 3, 4].map((coins) => ({
  coins,
  amountKrw: coins * COIN_KRW,
  label: `${coins}닢`,
  price: won(coins),
}));

export interface LedgerRow {
  id: number;
  delta: number;
  reason: string;
  ref: string | null;
  balanceAfter: number;
  createdAt: string;
}
const LEDGER_LABEL: Record<string, string> = {
  purchase: "닢 충전",
  referral_reward: "친구 초대 보상",
  spend: "풀이 열람",
  refund: "환불",
  reward_clawback: "초대 보상 회수",
  adjust: "조정",
};
export const ledgerLabel = (reason: string) => LEDGER_LABEL[reason] ?? "기타";

/** 원장 한 줄을 화면 문구로: "닢 충전 +1닢 (잔액 3닢)" */
export function ledgerText(r: LedgerRow): string {
  return `${ledgerLabel(r.reason)} ${r.delta > 0 ? "+" : ""}${r.delta}닢 (잔액 ${r.balanceAfter}닢)`;
}
