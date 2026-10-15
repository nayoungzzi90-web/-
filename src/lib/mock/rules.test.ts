import { beforeEach, describe, expect, it } from 'vitest';
import { Db, emptyDb, StoredChart } from './db';
import { appendLedger, balanceOf, CoinError, redeemCoins } from './ledger';
import { captureReferral, completeReferral } from './referral';
import { confirmPayment, createOrder, PayError, requestRefund } from './payment';
import { accessReport, purgeExpired } from './service';
import { calculator } from '../saju/sampleCalculator';
import { buildCharacter } from '../content/characters';
import { generateReport } from '../content/report';
import { buildDaily } from '../content/daily';
import { BirthInput } from '../saju/types';

const input: BirthInput = { calendar: 'solar', leapMonth: false, year: 1995, month: 5, day: 17, hour: 14, minute: 0, timeUnknown: false, country: 'KR' };
let db: Db;
const mkUser = (id: string) => (db.users[id] = { id, email: `${id}@t.io`, nickname: id, referralCode: `CODE_${id}`, createdAt: '' });
const mkChart = (guestId: string): StoredChart => {
  const facts = calculator.calculate(input);
  const c = { id: facts.chartId + guestId, guestId, input, facts, character: buildCharacter(facts), createdAt: '' };
  db.charts[c.id] = c;
  return c;
};
const invite = (referrerId: string, n: number, now = new Date('2026-10-14T03:00:00Z')) => {
  // n 번째 새 친구(새 게스트 세션)가 A 링크로 체험 후 가입
  db.guestId = `guest_${referrerId}_${n}`;
  captureReferral(db, `CODE_${referrerId}`, now);
  mkChart(db.guestId);
  const friend = mkUser(`friend_${referrerId}_${n}`);
  return completeReferral(db, friend, { isNewUser: true, now });
};

beforeEach(() => { db = emptyDb(); mkUser('A'); });

describe('추천 보상 (AC-03, AC-04)', () => {
  it('유효한 신규 가입은 +2냥, 지급 요청이 3번 와도 원장은 1번', () => {
    db.guestId = 'g1'; captureReferral(db, 'CODE_A'); mkChart('g1');
    const b = mkUser('B');
    expect(completeReferral(db, b, { isNewUser: true })).toMatchObject({ status: 'awarded', coins: 2, duplicate: false });
    completeReferral(db, b, { isNewUser: true });
    completeReferral(db, b, { isNewUser: true });
    expect(db.ledger.filter((l) => l.userId === 'A')).toHaveLength(1);
    expect(balanceOf(db, 'A')).toBe(2);
  });
  it('링크 캡처/복사만으로는 지급 없음, 무료 체험 전에는 pending', () => {
    db.guestId = 'g2'; captureReferral(db, 'CODE_A');
    expect(balanceOf(db, 'A')).toBe(0);
    expect(completeReferral(db, mkUser('B'), { isNewUser: true })).toMatchObject({ status: 'pending' });
    expect(balanceOf(db, 'A')).toBe(0);
  });
  it('셀프 추천과 기존 회원은 거절', () => {
    db.guestId = 'g3'; captureReferral(db, 'CODE_A'); mkChart('g3');
    expect(completeReferral(db, db.users.A, { isNewUser: false })).toMatchObject({ status: 'rejected', reason: 'self_referral' });
    db.guestId = 'g4'; captureReferral(db, 'CODE_A'); mkChart('g4');
    expect(completeReferral(db, mkUser('old'), { isNewUser: false })).toMatchObject({ status: 'rejected', reason: 'existing_member' });
    expect(balanceOf(db, 'A')).toBe(0);
  });
  it('일 5건 상한: 6번째는 지급 없이 사유 기록', () => {
    for (let i = 1; i <= 5; i++) expect(invite('A', i)).toMatchObject({ status: 'awarded' });
    expect(invite('A', 6)).toMatchObject({ status: 'rejected', reason: 'daily_cap' });
    expect(balanceOf(db, 'A')).toBe(10);
    expect(db.rewards.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
  it('월 30건 상한 (KST 날짜 경계): 6일에 걸쳐 30건 후 31번째 거절', () => {
    let n = 0;
    for (let day = 1; day <= 6; day++) for (let k = 0; k < 5; k++) invite('A', ++n, new Date(`2026-10-${String(day + 1).padStart(2, '0')}T03:00:00Z`));
    expect(balanceOf(db, 'A')).toBe(60);
    expect(invite('A', ++n, new Date('2026-10-09T03:00:00Z'))).toMatchObject({ status: 'rejected', reason: 'monthly_cap' });
    // 다음 달에는 다시 가능
    expect(invite('A', ++n, new Date('2026-11-01T03:00:00Z'))).toMatchObject({ status: 'awarded' });
  });
  it('UTC 와 KST 날짜가 다른 시각은 KST 로 집계', () => {
    // 2026-10-14T16:00Z = KST 10-15 01:00
    for (let i = 1; i <= 5; i++) invite('A', i, new Date('2026-10-14T14:00:00Z')); // KST 10-14 23:00
    expect(invite('A', 6, new Date('2026-10-14T16:00:00Z'))).toMatchObject({ status: 'awarded' }); // 다음 KST 날
  });
});

describe('엽전 원장·교환 (AC-06)', () => {
  it('idempotency_key 중복은 한 번만 반영, 음수 잔액 차단', () => {
    appendLedger(db, { userId: 'A', delta: 4, reason: 't', sourceId: 'x', idempotencyKey: 'k1' });
    expect(appendLedger(db, { userId: 'A', delta: 4, reason: 't', sourceId: 'x', idempotencyKey: 'k1' }).duplicate).toBe(true);
    expect(balanceOf(db, 'A')).toBe(4);
    expect(() => appendLedger(db, { userId: 'A', delta: -5, reason: 't', sourceId: 'y', idempotencyKey: 'k2' })).toThrow(CoinError);
  });
  it('잔액 4냥으로 기본사주 교환을 두 번 눌러도 1회 차감·권한 1개', () => {
    appendLedger(db, { userId: 'A', delta: 4, reason: 'seed', sourceId: 's', idempotencyKey: 'seed' });
    const r1 = redeemCoins(db, 'A', 'basic', 'chart1');
    const r2 = redeemCoins(db, 'A', 'basic', 'chart1');
    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(balanceOf(db, 'A')).toBe(0);
    expect(Object.values(db.entitlements)).toHaveLength(1);
  });
  it('잔액 부족·P1 상품은 교환 불가, 부족 시 권한 미생성', () => {
    expect(() => redeemCoins(db, 'A', 'basic', 'c')).toThrow(CoinError);
    appendLedger(db, { userId: 'A', delta: 30, reason: 'seed', sourceId: 's', idempotencyKey: 'seed' });
    expect(() => redeemCoins(db, 'A', 'date_selection', 'c')).toThrow(/교환할 수 없는/);
    expect(Object.values(db.entitlements)).toHaveLength(0);
  });
  it('교환량은 4/4/12', () => {
    appendLedger(db, { userId: 'A', delta: 20, reason: 'seed', sourceId: 's', idempotencyKey: 'seed' });
    redeemCoins(db, 'A', 'basic', 'c'); redeemCoins(db, 'A', 'compatibility', 'c'); redeemCoins(db, 'A', 'love_deep', 'c');
    expect(balanceOf(db, 'A')).toBe(0);
  });
});

describe('결제 (AC-05)', () => {
  it('서버 카탈로그 가격으로 주문, 1원 변조 결제는 거부되고 권한 없음', () => {
    const o = createOrder(db, 'A', 'basic', 'c1');
    expect(o.amountKrw).toBe(990);
    expect(() => confirmPayment(db, { orderId: o.id, userId: 'A', paymentKey: `mock_${o.id}`, amount: 1 })).toThrow(PayError);
    expect(Object.values(db.entitlements)).toHaveLength(0);
    expect(db.orders[o.id].status).toBe('pending');
  });
  it('중복 웹훅은 주문/권한을 중복 생성하지 않음', () => {
    const o = createOrder(db, 'A', 'love_deep', 'c1');
    expect(o.amountKrw).toBe(3900);
    const a = confirmPayment(db, { orderId: o.id, userId: 'A', paymentKey: `mock_${o.id}`, amount: 3900 });
    const b = confirmPayment(db, { orderId: o.id, userId: 'A', paymentKey: `mock_${o.id}`, amount: 3900 });
    expect(a.duplicate).toBe(false);
    expect(b.duplicate).toBe(true);
    expect(Object.values(db.entitlements)).toHaveLength(1);
    expect(Object.values(db.payments)).toHaveLength(1);
  });
  it('실제 PG 키는 라이브 결제 플래그 OFF 상태에서 거부, 타인 주문 승인 불가, P1 상품 주문 불가', () => {
    const o = createOrder(db, 'A', 'basic', 'c1');
    expect(() => confirmPayment(db, { orderId: o.id, userId: 'A', paymentKey: 'tosspay_real', amount: 990 })).toThrow(/비활성/);
    mkUser('B');
    expect(() => confirmPayment(db, { orderId: o.id, userId: 'B', paymentKey: `mock_${o.id}`, amount: 990 })).toThrow(PayError);
    expect(() => createOrder(db, 'A', 'saju_deep', 'c1')).toThrow(PayError);
  });
  it('환불은 요청 상태로만 기록', () => {
    const o = createOrder(db, 'A', 'basic', 'c1');
    confirmPayment(db, { orderId: o.id, userId: 'A', paymentKey: `mock_${o.id}`, amount: 990 });
    requestRefund(db, 'A', o.id, '생성 실패');
    expect(db.orders[o.id].status).toBe('refund_requested');
    expect(db.refunds[0].status).toBe('requested');
  });
});

describe('리포트·접근 제어·궁합 삭제', () => {
  it('심층 연애운은 생성 연도 포함 연속 5개 연도 (AC-12)', () => {
    const facts = calculator.calculate(input);
    const r = generateReport({ productId: 'love_deep', facts, baseYear: 2026 });
    expect(r.years).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(r.qa.find((c) => c.id === 'years')?.status).toBe('pass');
    expect(r.sections[5].body).toContain('2030년');
  });
  it('시간 미상이면 리포트에 시주를 만들지 않음 (AC-02)', () => {
    const facts = calculator.calculate({ ...input, timeUnknown: true, hour: undefined });
    for (const productId of ['basic', 'love_deep'] as const) {
      const r = generateReport({ productId, facts, baseYear: 2026 });
      expect(r.sections.map((s) => s.body).join(' ')).not.toMatch(/시주 [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
      expect(r.qa.find((c) => c.id === 'hour')?.status).toBe('pass');
    }
  });
  it('샘플 리포트는 분량 미달을 숨기지 않고 FAIL 로 표시(자동 PASS 금지)', () => {
    const r = generateReport({ productId: 'basic', facts: calculator.calculate(input), baseYear: 2026 });
    expect(r.mode).toBe('MOCK_SANDBOX');
    expect(r.qa.find((c) => c.id === 'length')?.status).toBe('fail');
  });
  it('타인 리포트 접근 거부 (AC-10)', () => {
    db.reports.r1 = { id: 'r1', userId: 'A', productId: 'basic', subjectId: 'c', report: generateReport({ productId: 'basic', facts: calculator.calculate(input), baseYear: 2026 }), generatedAt: '' };
    expect(accessReport(db, 'r1', 'A').ok).toBe(true);
    expect(accessReport(db, 'r1', 'B')).toMatchObject({ ok: false, reason: 'FORBIDDEN' });
    expect(accessReport(db, 'r1', null)).toMatchObject({ ok: false, reason: 'FORBIDDEN' });
  });
  it('궁합은 만료 후 삭제되고 만료 직전에는 조회 가능 (AC-09)', () => {
    const facts = calculator.calculate(input);
    const gen = new Date('2026-10-01T00:00:00Z'), exp = new Date(gen.getTime() + 30 * 86400000);
    db.compat.s1 = { id: 's1', buyerUserId: 'A', inputA: input, inputB: { ...input, year: 1993 }, reportId: 'r1', expiresAt: exp.toISOString() };
    db.reports.r1 = { id: 'r1', userId: 'A', productId: 'compatibility', subjectId: 's1', report: generateReport({ productId: 'compatibility', facts, factsB: facts, baseYear: 2026 }), generatedAt: gen.toISOString(), expiresAt: exp.toISOString() };
    const before = new Date(exp.getTime() - 1000);
    expect(purgeExpired(db, before)).toBe(0);
    expect(accessReport(db, 'r1', 'A', before).ok).toBe(true);
    expect(purgeExpired(db, exp)).toBe(1);
    expect(db.compat.s1.inputB).toBeNull();
    expect(db.reports.r1.report).toBeNull();
    expect(accessReport(db, 'r1', 'A', exp)).toMatchObject({ ok: false, reason: 'EXPIRED' });
  });
});

describe('캐릭터·운세 결정론 (AC-01, AC-11)', () => {
  it('같은 입력과 규칙 버전이면 같은 캐릭터', () => {
    const f = calculator.calculate(input);
    expect(buildCharacter(f)).toEqual(buildCharacter(calculator.calculate(input)));
  });
  it('10개 일간 모두 독립 캐릭터 ID', () => {
    const ids = new Set<string>();
    for (let d = 1; d <= 10; d++) ids.add(buildCharacter(calculator.calculate({ ...input, year: 2000, month: 1, day: d })).characterId);
    expect(ids.size).toBe(10);
  });
  it('캐릭터 결과/공유용 데이터에 출생정보가 없음', () => {
    const c = buildCharacter(calculator.calculate(input));
    expect(JSON.stringify(c)).not.toMatch(/1995|birth|@/);
  });
  it('같은 날짜 운세는 동일, 날짜가 바뀌면 일진 반영', () => {
    const f = calculator.calculate(input);
    expect(buildDaily(f, '2026-10-14')).toEqual(buildDaily(f, '2026-10-14'));
    expect(buildDaily(f, '2026-10-14').dayPillar).not.toBe(buildDaily(f, '2026-10-15').dayPillar);
  });
});
