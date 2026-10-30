import { describe, expect, it } from 'vitest';
import { calculate } from '../../../engine/manse/src/engine';
import { toSajuFacts } from '../../../engine/manse/src/adapter';
import { analyzeR002toR005, fromManse } from '../../../engine/saju-rules/src';
import { buildRuleCards, cardTextCatalog } from './cards';
import { usableClaims } from './claims';
import { buildInterpretation } from './interpretation';
import { buildPlan } from './plan';
import { JARGON } from './qa';

const POLICY = { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never;
function chartOf(y: number, m: number, d: number, h: number | null) {
  const r = calculate({ calendar: 'solar', year: y, month: m, day: d, ...(h === null ? { timeUnknown: true } : { hour: h, minute: 0 }), gender: 'F' }, POLICY);
  if (!r.ok) throw new Error('engine');
  const { chart, monthTerm, birth } = fromManse(r.value);
  return { facts: toSajuFacts(r.value), rules: analyzeR002toR005(chart, { monthTerm, birth }) };
}
function rng(seed: number) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

describe('판단 카드(R-002~R-005 → 사실 줄·해석 명제)', () => {
  it('실제 원국(乙亥 辛巳 戊申 己未): 계절·뿌리·곁의 기운·구조 후보 카드가 만들어진다', () => {
    const { rules } = chartOf(1995, 5, 17, 14);
    const c = buildRuleCards(rules);
    const ids = c.claims.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['C-card-season', 'C-card-root', 'C-card-role-peer', 'C-card-role-output', 'C-card-role-officer', 'C-card-struct-0']));
    expect(c.claims.find((x) => x.id === 'C-card-season')!.thesis).toContain('길러');
    expect(c.claims.find((x) => x.id === 'C-card-root')!.thesis).toContain('나 자신을 뜻하는 자리');
    expect(c.claims.every((x) => x.status === 'DRAFT')).toBe(true);
    expect(c.claims.find((x) => x.id === 'C-card-struct-0')!.limitation).toContain('판단하지 않았어요');
  });
  it('해석 생성에 rules 를 주면 십성 개수 근사 명제와 그 사실 줄이 빠지고 카드로 바뀐다', () => {
    const { facts, rules } = chartOf(1995, 5, 17, 14);
    const f = buildInterpretation('basic', facts, { rules });
    const ruleIds = f.claims.map((x) => x.ruleId);
    for (const old of ['R-CLM-AUTONOMY', 'R-CLM-EXPRESSION', 'R-CLM-PRACTICALITY', 'R-CLM-STRUCTURE', 'R-CLM-SUPPORT', 'R-CLM-POWER', 'R-CLM-SEASON']) expect(ruleIds).not.toContain(old);
    expect(ruleIds).toContain('SJ-R002-SEASON');
    expect(f.lines.map((l) => l.id)).not.toEqual(expect.arrayContaining(['gods']));
    expect(f.lines.some((l) => l.id === 'power')).toBe(false);
    // 모든 명제의 근거 사실 줄이 존재한다
    const lineIds = new Set(f.lines.map((l) => l.id));
    for (const cl of f.claims) for (const id of cl.factIds) expect(lineIds.has(id), `${cl.id}→${id}`).toBe(true);
  });
  it('무작위 300개 원국: 카드 문장에 한자·전문용어가 없고, 기본사주 모든 섹션에 쓸 명제가 있다', () => {
    const r = rng(42);
    for (let i = 0; i < 300; i++) {
      const y = 1900 + Math.floor(r() * 151), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
      const h = r() < 0.15 ? null : Math.floor(r() * 24);
      const { facts, rules } = chartOf(y, m, d, h);
      const c = buildRuleCards(rules);
      const text = [...c.claims.flatMap((x) => [x.thesis, x.condition, x.limitation]), ...c.lines.map((l) => l.text)].join('\n');
      expect(text, `${y}-${m}-${d} ${h}`).not.toMatch(/\p{Script=Han}/u);
      expect(text.match(JARGON)?.[0] ?? null, `${y}-${m}-${d}`).toBeNull();
      const f = buildInterpretation('basic', facts, { rules });
      const usable = usableClaims(f.claims, true);
      for (const s of buildPlan('basic', f).sections) expect(usable.some((cl) => cl.tags.some((t) => s.focusTags.includes(t))), `${y}-${m}-${d} ${s.title}`).toBe(true);
    }
  });
  it('토월 출생은 계절 카드가 잠정으로 표시된다', () => {
    const { rules } = chartOf(1990, 4, 19, 1); // 辰월
    expect(rules.r002.grade_status).toBe('provisional');
    expect(buildRuleCards(rules).claims.find((x) => x.id === 'C-card-season')!.thesis).toContain('잠정');
  });
});

describe('카드 적용 시 모델에 주는 명제 문장 전체가 쉬운 말', () => {
  it('무작위 200개 원국: 기본사주 명제(주제·조건·한계)에 한자·전문용어가 없다', () => {
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      const y = 1900 + Math.floor(r() * 151), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
      const { facts, rules } = chartOf(y, m, d, Math.floor(r() * 24));
      const f = buildInterpretation('basic', facts, { rules });
      const text = usableClaims(f.claims, true).flatMap((c) => [c.thesis, c.condition, c.limitation]).join('\n');
      expect(text, `${y}-${m}-${d}`).not.toMatch(/\p{Script=Han}/u);
      expect(text.match(JARGON)?.[0] ?? null, `${y}-${m}-${d}`).toBeNull();
      expect(f.lines.find((l) => l.id === 'relations')!.text.match(JARGON)).toBeNull();
    }
  });
  it('JARGON 은 합·충 표현을 잡지만 일상어(충분·보충·충실)는 잡지 않는다', () => {
    for (const w of ['육합이 있어요', '합과 충이', '충이 있어요', '천간합']) expect(w.match(JARGON), w).not.toBeNull();
    for (const w of ['충분해요', '보충하면', '충실하게', '충전하기']) expect(w.match(JARGON), w).toBeNull();
  });
});

describe('섹션 제목도 쉬운 말', () => {
  it('기본사주·연애운 섹션 제목에 전문용어가 없다', () => {
    const { facts, rules } = chartOf(1995, 5, 17, 14);
    const f = buildInterpretation('basic', facts, { rules });
    for (const s of buildPlan('basic', f).sections) expect(s.title.match(JARGON), s.title).toBeNull();
    const love = buildInterpretation('love_deep', facts, { rules, years: [2026, 2027, 2028, 2029, 2030], yearPillar: () => '丙午' });
    for (const s of buildPlan('love_deep', love).sections) expect(s.title.match(JARGON), s.title).toBeNull();
  });
});

describe('카드 문장 검토표(cardTextCatalog)', () => {
  const cat = cardTextCatalog();
  const toRe = (t: string) => new RegExp('^' + t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '(나무|불|흙|쇠|물)') + '$');
  it('키가 겹치지 않고, 문장·조건·한계·쓰이는 경우에 한자·전문용어가 없다', () => {
    expect(new Set(cat.map((e) => e.key)).size).toBe(cat.length);
    for (const e of cat) {
      const text = [e.key, e.when, e.thesis, e.condition, e.limitation].join('\n');
      expect(text, e.key).not.toMatch(/\p{Script=Han}/u);
      expect(text.match(JARGON)?.[0] ?? null, e.key).toBeNull();
      expect(e.status).toBe('DRAFT');
    }
  });
  it('무작위 500개 원국: 카드가 실제로 낸 문장은 모두 검토표에 있다', () => {
    const r = rng(99);
    const used = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const y = 1900 + Math.floor(r() * 151), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
      const h = r() < 0.15 ? null : Math.floor(r() * 24);
      const { facts, rules } = chartOf(y, m, d, h);
      const claims = [...buildRuleCards(rules).claims, ...buildInterpretation('basic', facts, { rules }).claims.filter((c) => c.ruleId === 'SJ-BRANCH-PAIRS-DRAFT')];
      for (const c of claims) {
        const hit = cat.find((e) => e.ruleId === c.ruleId && toRe(e.thesis).test(c.thesis) && e.condition === c.condition && e.limitation === c.limitation);
        expect(hit, `${y}-${m}-${d} ${c.ruleId}: ${c.thesis}`).toBeTruthy();
        used.add(hit!.key);
      }
    }
    // 무작위 표본에서 대부분의 변형이 실제로 쓰인다(검토표에 죽은 문장이 쌓이지 않게)
    expect(used.size).toBeGreaterThanOrEqual(cat.length - 4);
  });
});
