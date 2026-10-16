import type { Db } from './mock/db';

/** 퍼널 지표. 이 샌드박스에서는 이 브라우저 한 곳의 이벤트만 집계된다(실서비스는 서버 이벤트 테이블 기준). */
export interface Funnel {
  visits: number; birthStarts: number; completions: number; shares: number; shareCopies: number; signups: number;
  productViews: number; checkouts: number; paidOrders: number; buyers: number; repeatBuyers: number; coinRedeems: number;
  reportsReady: number; reportsFailed: number; calcErrors: number; dailyViews: number; inviteClicks: number;
  rewardsApproved: number; rewardsRejected: number; revenueKrw: number;
}
const rate = (a: number, b: number) => (b > 0 ? a / b : null);

export function funnel(db: Db): Funnel {
  const n = (name: string) => db.events.filter((e) => e.name === name).length;
  const paid = Object.values(db.orders).filter((o) => o.status === 'paid' && o.method === 'cash');
  const byUser = new Map<string, number>();
  Object.values(db.orders).filter((o) => o.status === 'paid').forEach((o) => byUser.set(o.userId, (byUser.get(o.userId) ?? 0) + 1));
  return {
    visits: db.events.filter((e) => e.name === 'home_view' && e.props.step === 'home').length,
    birthStarts: n('birth_start'), completions: n('guest_trial_completed'), shares: n('share_intent'), shareCopies: n('share_copy'),
    signups: n('signup_completed'), productViews: n('product_view'), checkouts: n('checkout_started'),
    paidOrders: paid.length, buyers: byUser.size, repeatBuyers: [...byUser.values()].filter((c) => c >= 2).length, coinRedeems: n('coin_redeemed'),
    reportsReady: n('report_ready'), reportsFailed: n('report_failed'), calcErrors: n('calc_error'), dailyViews: n('daily_view'), inviteClicks: n('invite_click'),
    rewardsApproved: db.rewards.filter((r) => r.status === 'approved').length, rewardsRejected: db.rewards.filter((r) => r.status === 'rejected').length,
    revenueKrw: paid.reduce((a, o) => a + o.amountKrw, 0),
  };
}

export interface Kpi { id: string; label: string; priority: 'P0' | 'P1'; value: number | null; unit: '%' | '건' | '원'; note: string }
export function kpis(f: Funnel, dailyDays: string[] = []): Kpi[] {
  const pct = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 10);
  return [
    { id: 'complete', label: '진입→결과 완료율', priority: 'P0', value: pct(rate(f.completions, f.visits)), unit: '%', note: '결과 완료 ÷ 홈 방문' },
    { id: 'share', label: '결과→공유율', priority: 'P0', value: pct(rate(f.shares, f.completions)), unit: '%', note: '공유 시도 ÷ 결과 완료' },
    { id: 'first', label: '결과→첫 구매 전환율', priority: 'P0', value: pct(rate(f.buyers, f.completions)), unit: '%', note: '구매 계정 ÷ 결과 완료' },
    { id: 'ref', label: '유효 추천 가입 수', priority: 'P0', value: f.rewardsApproved, unit: '건', note: '보상이 승인된 추천 가입' },
    { id: 'fraud', label: '부정 보상률', priority: 'P0', value: pct(rate(f.rewardsRejected, f.rewardsApproved + f.rewardsRejected)), unit: '%', note: '거절된 보상 ÷ 심사된 보상(거절=지급 안 됨)' },
    { id: 'calcerr', label: '계산 오류율', priority: 'P0', value: pct(rate(f.calcErrors, f.calcErrors + f.completions)), unit: '%', note: '계산 실패 ÷ (실패+완료)' },
    { id: 'genfail', label: '생성 실패율', priority: 'P0', value: pct(rate(f.reportsFailed, f.reportsFailed + f.reportsReady)), unit: '%', note: '리포트 생성 최종 실패 ÷ 전체' },
    { id: 'repeat', label: '첫 구매→추가 구매 전환율', priority: 'P1', value: pct(rate(f.repeatBuyers, f.buyers)), unit: '%', note: '2건 이상 구매 계정 ÷ 구매 계정' },
    { id: 'rev', label: '신규 방문자당 매출', priority: 'P0', value: f.visits ? Math.round(f.revenueKrw / f.visits) : null, unit: '원', note: '현금 매출 ÷ 홈 방문' },
    ...retention(dailyDays),
  ];
}

/** 첫 방문일 기준 재방문: 첫날 이후 7일/30일 안에 다시 본 적이 있는가(이 기기 한 명 기준) */
export function retention(days: string[]): Kpi[] {
  const sorted = [...new Set(days)].sort();
  const first = sorted[0];
  const diff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const back = (w: number) => (first ? (sorted.some((d) => diff(first, d) >= 1 && diff(first, d) <= w) ? 100 : 0) : null);
  return [
    { id: 'ret7', label: '7일 재방문(이 기기)', priority: 'P1', value: back(7), unit: '%', note: '첫 운세 확인 후 7일 안에 다시 확인' },
    { id: 'ret30', label: '30일 재방문(이 기기)', priority: 'P1', value: back(30), unit: '%', note: '첫 운세 확인 후 30일 안에 다시 확인' },
  ];
}

/** 연속 출석 일수: today 부터 거꾸로 하루도 빠짐없이 이어진 날 수 */
export function streak(days: string[], today: string): number {
  const set = new Set(days);
  let n = 0, cur = Date.parse(today);
  if (!set.has(today)) return 0;
  while (set.has(new Date(cur).toISOString().slice(0, 10))) { n++; cur -= 86400000; }
  return n;
}
