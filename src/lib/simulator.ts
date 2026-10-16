/** 수익성 시뮬레이터: 시장 전망이 아니라 입력한 가정에 따른 단순 계산이다. 무료 체험 후 한 번의 유료 주문만 발생한다고 단순화한다. */
export interface Assumptions {
  visitors: number; completionRate: number; conversionRate: number; avgOrderKrw: number;
  pgFeeRate: number; vatIncluded: boolean; aiCostPerOrderKrw: number; refundRate: number;
  referralRewardCostKrw: number; infraFixedKrw: number; otherFixedKrw: number;
}
export const DEFAULTS: Assumptions = {
  visitors: 100_000, completionRate: 0.6, conversionRate: 0.08, avgOrderKrw: 2_500,
  pgFeeRate: 0.033, vatIncluded: true, aiCostPerOrderKrw: 150, refundRate: 0.03,
  referralRewardCostKrw: 0, infraFixedKrw: 300_000, otherFixedKrw: 0,
};
export interface Result {
  completions: number; orders: number; grossKrw: number; refundKrw: number; vatKrw: number; pgKrw: number; aiKrw: number;
  referralKrw: number; contributionKrw: number; fixedKrw: number; profitBeforeTaxKrw: number; contributionPerVisitorKrw: number; contributionPerOrderKrw: number;
}
export function simulate(a: Assumptions): Result {
  const completions = a.visitors * a.completionRate;
  const orders = completions * a.conversionRate;
  const grossKrw = orders * a.avgOrderKrw;
  const refundKrw = grossKrw * a.refundRate;
  const net = grossKrw - refundKrw;
  const vatKrw = a.vatIncluded ? net - net / 1.1 : 0;
  const pgKrw = net * a.pgFeeRate;
  const aiKrw = orders * (1 - a.refundRate) * a.aiCostPerOrderKrw;
  const referralKrw = a.referralRewardCostKrw;
  const contributionKrw = net - vatKrw - pgKrw - aiKrw - referralKrw;
  const fixedKrw = a.infraFixedKrw + a.otherFixedKrw;
  return {
    completions, orders, grossKrw, refundKrw, vatKrw, pgKrw, aiKrw, referralKrw, contributionKrw, fixedKrw,
    profitBeforeTaxKrw: contributionKrw - fixedKrw,
    contributionPerVisitorKrw: a.visitors ? contributionKrw / a.visitors : 0,
    contributionPerOrderKrw: orders ? contributionKrw / orders : 0,
  };
}
/** 월 세전 이익 목표를 맞추기 위해 필요한 월 방문자 수(전환·단가 가정 고정). 방문자당 공헌이익이 0 이하면 null. */
export function visitorsForTarget(a: Assumptions, targetKrw: number): number | null {
  const perVisitor = simulate({ ...a, visitors: 1_000_000, referralRewardCostKrw: 0 }).contributionPerVisitorKrw;
  if (perVisitor <= 0) return null;
  return Math.ceil((targetKrw + a.infraFixedKrw + a.otherFixedKrw + a.referralRewardCostKrw) / perVisitor);
}
