import { describe, expect, it } from 'vitest';
import { emptyDb } from './mock/db';
import { funnel, kpis, retention, streak } from './metrics';
import { DEFAULTS, simulate, visitorsForTarget } from './simulator';
import { recommendNext } from './content/upsell';

const ev = (name: string, props: Record<string, string> = {}) => ({ id: Math.random().toString(), name, at: '', props });

describe('퍼널 지표', () => {
  it('이벤트와 주문에서 비율을 계산하고, 분모가 0이면 null', () => {
    const db = emptyDb();
    expect(kpis(funnel(db)).find((k) => k.id === 'complete')?.value).toBeNull();
    db.events.push(...Array.from({ length: 10 }, () => ev('home_view', { step: 'home' })), ...Array.from({ length: 6 }, () => ev('guest_trial_completed')), ev('share_intent'), ev('share_intent'), ev('calc_error'), ev('report_ready'), ev('report_failed'));
    db.orders.o1 = { id: 'o1', userId: 'u1', productId: 'basic', subjectId: 'c', amountKrw: 900, coinCost: 1, method: 'cash', status: 'paid', idempotencyKey: 'k1', createdAt: '' };
    db.orders.o2 = { id: 'o2', userId: 'u1', productId: 'love_deep', subjectId: 'c', amountKrw: 2900, coinCost: 3, method: 'cash', status: 'paid', idempotencyKey: 'k2', createdAt: '' };
    db.orders.o3 = { id: 'o3', userId: 'u2', productId: 'basic', subjectId: 'c', amountKrw: 900, coinCost: 1, method: 'cash', status: 'pending', idempotencyKey: 'k3', createdAt: '' };
    db.rewards.push({ id: 'r1', referrerUserId: 'u1', referredUserId: 'u3', coins: 1, status: 'approved', kstDate: '', idempotencyKey: 'a', createdAt: '' }, { id: 'r2', referrerUserId: 'u1', referredUserId: 'u4', coins: 0, status: 'rejected', kstDate: '', idempotencyKey: 'b', createdAt: '' });
    const k = Object.fromEntries(kpis(funnel(db)).map((x) => [x.id, x.value]));
    expect(k.complete).toBe(60); expect(k.share).toBe(33.3); expect(k.first).toBe(16.7); expect(k.repeat).toBe(100);
    expect(k.ref).toBe(1); expect(k.fraud).toBe(50); expect(k.calcerr).toBe(14.3); expect(k.genfail).toBe(50);
    expect(k.rev).toBe(380); // 3,800원 ÷ 방문 10
  });
  it('7·30일 재방문과 연속 출석', () => {
    expect(retention(['2026-10-01', '2026-10-05']).map((x) => x.value)).toEqual([100, 100]);
    expect(retention(['2026-10-01', '2026-10-20']).map((x) => x.value)).toEqual([0, 100]);
    expect(retention([]).map((x) => x.value)).toEqual([null, null]);
    expect(streak(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-10'], '2026-10-15')).toBe(3);
    expect(streak(['2026-10-13'], '2026-10-15')).toBe(0); // 오늘 안 봤으면 0
    expect(streak(['2026-10-15'], '2026-10-15')).toBe(1);
  });
});

describe('수익성 시뮬레이터', () => {
  it('문서의 가정(10만·60%·8%·2,500원)이면 완료 6만, 주문 4,800건, 매출 1,200만원', () => {
    const r = simulate(DEFAULTS);
    expect(Math.round(r.completions)).toBe(60_000); expect(Math.round(r.orders)).toBe(4_800); expect(Math.round(r.grossKrw)).toBe(12_000_000);
  });
  it('비용을 차감하면 순이익은 매출보다 훨씬 작다 (환불·부가세·PG·AI·고정비)', () => {
    const r = simulate(DEFAULTS);
    expect(r.contributionKrw).toBeLessThan(r.grossKrw * 0.9);
    expect(r.profitBeforeTaxKrw).toBe(r.contributionKrw - 300_000);
    expect(r.refundKrw).toBeCloseTo(360_000, 0);
  });
  it('부가세 별도로 보면 더 많이 남고, 전환율이 높을수록 이익이 늘어난다', () => {
    expect(simulate({ ...DEFAULTS, vatIncluded: false }).contributionKrw).toBeGreaterThan(simulate(DEFAULTS).contributionKrw);
    expect(simulate({ ...DEFAULTS, conversionRate: 0.1 }).profitBeforeTaxKrw).toBeGreaterThan(simulate(DEFAULTS).profitBeforeTaxKrw);
  });
  it('목표 이익을 위한 필요 방문자 수: 그 방문자로 시뮬하면 목표에 닿는다', () => {
    const need = visitorsForTarget(DEFAULTS, 10_000_000)!;
    expect(simulate({ ...DEFAULTS, visitors: need }).profitBeforeTaxKrw).toBeGreaterThanOrEqual(10_000_000);
    expect(simulate({ ...DEFAULTS, visitors: need - 2000 }).profitBeforeTaxKrw).toBeLessThan(10_000_000);
    expect(visitorsForTarget({ ...DEFAULTS, avgOrderKrw: 0 }, 1)).toBeNull();
  });
});

describe('다음 상품 추천', () => {
  it('연애 고민 → 연애운 심층, 관계 고민 → 궁합, 이미 가졌으면 다른 것', () => {
    expect(recommendNext('love', []).productId).toBe('love_deep');
    expect(recommendNext('people', []).productId).toBe('compatibility');
    expect(recommendNext('love', ['love_deep']).productId).toBe('basic');
    expect(recommendNext('career', []).productId).toBe('basic');
    expect(recommendNext(null, ['basic', 'love_deep']).productId).toBeNull();
  });
});
