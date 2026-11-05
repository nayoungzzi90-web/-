import { describe, expect, it } from 'vitest';
import { calculate } from '../../../engine/manse/src/engine';
import { toSajuFacts } from '../../../engine/manse/src/adapter';
import { analyzeR002toR005, fromManse } from '../../../engine/saju-rules/src';
import { branchBind, branchClash, buildCompatCards, buildLoveCards, buildRuleCards, cardTextCatalog, yearPillarOf } from './cards';
import { usableClaims } from './claims';
import { buildCompatInterpretation, buildInterpretation } from './interpretation';
import { buildPlan } from './plan';
import { ELEMENT_REMEDY, JARGON, STRENGTH } from './qa';

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
  const toRe = (t: string) => new RegExp('^' + t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{([^}]+)\}/g, (_m: string, k: string) => (k === '해' ? '\\d{4}' : k === '누구' ? '(나|상대)' : '(나무|불|흙|쇠|물)')) + '$');
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
      const other = chartOf(1900 + Math.floor(r() * 151), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28), Math.floor(r() * 24));
      const claims = [...buildRuleCards(rules).claims, ...buildLoveCards(rules, { gender: i % 2 ? 'F' : 'M', years: [2026, 2027, 2028, 2029, 2030] }).claims, ...buildCompatCards(rules, other.rules, { a: facts.fiveElements, b: other.facts.fiveElements }).claims, ...buildInterpretation('basic', facts, { rules }).claims.filter((c) => c.ruleId === 'SJ-BRANCH-PAIRS-DRAFT')];
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

describe('검수: 힘의 세기 단정·오행 물건 처방(qa-2.1)', () => {
  it('뿌리·계절 사실을 "강하다/단단하다"로 바꾼 문장을 잡는다', () => {
    for (const s of ['바탕이 단단해서 꾸준히 버텨요', '오래 버티며 밀어붙이는 힘이 강한 편이에요', '흙 기운이 가장 강해요', '쉽게 무너지지 않아요', '관계에서 쉽게 무너지기보다 버텨요', '흔들리지 않는 바탕이 있어요', '나무 기운이 약해 보여요']) expect(STRENGTH.test(s), s).toBe(true);
    for (const s of ['같은 기운이 땅 쪽에도 있어 바탕을 받쳐 주는 편이에요', '계절의 도움은 받기 어려운 쪽이에요', '강점이 드러나기 쉬워요', '약속을 먼저 정하면 편해요']) expect(STRENGTH.test(s), s).toBe(false);
  });
  it('오행을 물건·행동 처방으로 바꾼 문장을 잡는다', () => {
    for (const s of ['물 한 컵 마시기가 도움이 돼요', '물을 자주 마시면 좋아요', '행운의 색은 파랑이에요', '빨간 옷을 입어 보세요']) expect(ELEMENT_REMEDY.test(s), s).toBe(true);
    for (const s of ['물 기운은 의식해서 챙기면 좋아요', '쉬는 시간을 일정 사이에 넣어 보세요']) expect(ELEMENT_REMEDY.test(s), s).toBe(false);
  });
  it('카드 문장 자체는 이 검수에 걸리지 않는다', () => {
    for (const e of cardTextCatalog()) for (const t of [e.thesis, e.condition, e.limitation]) {
      expect(STRENGTH.test(t), `${e.key}: ${t}`).toBe(false);
      expect(ELEMENT_REMEDY.test(t), `${e.key}: ${t}`).toBe(false);
    }
  });
});

describe('연애운 카드', () => {
  const YEARS = [2026, 2027, 2028, 2029, 2030];
  it('세운 간지는 60갑자 순환으로 정확하다(2024 갑진, 2026 병오, 1984 갑자)', () => {
    expect(yearPillarOf(2024)).toEqual({ stem: '甲', branch: '辰' });
    expect(yearPillarOf(2026)).toEqual({ stem: '丙', branch: '午' });
    expect(yearPillarOf(1984)).toEqual({ stem: '甲', branch: '子' });
  });
  it('충은 정반대 자리, 육합은 子丑·寅亥·卯戌·辰酉·巳申·午未만', () => {
    expect(branchClash('子', '午')).toBe(true);
    expect(branchClash('子', '丑')).toBe(false);
    const binds = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
    const all = '子丑寅卯辰巳午未申酉戌亥'.split('') as never[];
    for (const a of all) for (const b of all) expect(branchBind(a, b), `${a}${b}`).toBe(binds.includes(`${a}${b}`) || binds.includes(`${b}${a}`));
  });
  it('여성·남성에 따라 인연을 살피는 기운이 다르고, 연도마다 명제가 하나씩 있다', () => {
    const { rules } = chartOf(1995, 5, 17, 14); // 乙亥 辛巳 戊申 己未: 일간 무토, 연간 을목(관살)
    const f = buildLoveCards(rules, { gender: 'F', years: YEARS });
    const m = buildLoveCards(rules, { gender: 'M', years: YEARS });
    expect(f.claims.find((c) => c.id === 'C-card-love-star')!.ruleId).toBe('SJ-LOVE-STAR-PRESENT');
    expect(m.claims.find((c) => c.id === 'C-card-love-star')!.ruleId).toBe('SJ-LOVE-STAR-ABSENT');
    for (const y of YEARS) expect(f.claims.some((c) => c.id === `C-card-year-${y}` && c.thesis.startsWith(`${y}년은`))).toBe(true);
    expect(f.yearPillars[2026]).toBe('丙午');
    // 일지 申(본기 庚 = 무토가 길러 내는 기운)
    expect(f.claims.find((c) => c.id === 'C-card-love-palace')!.ruleId).toBe('SJ-LOVE-PALACE-OUTPUT');
  });
  it('무작위 300개 원국: 연애운 해석에 옛 전문용어 명제가 없고, 모든 섹션에 쓸 명제가 있다', () => {
    const r = rng(11);
    for (let i = 0; i < 300; i++) {
      const y = 1900 + Math.floor(r() * 151), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
      const h = r() < 0.15 ? null : Math.floor(r() * 24);
      const { facts, rules } = chartOf(y, m, d, h);
      const f = buildInterpretation('love_deep', facts, { rules, gender: i % 3 === 0 ? 'F' : i % 3 === 1 ? 'M' : 'X', years: YEARS });
      expect(f.claims.some((c) => /^R-CLM-(PALACE|STAR|PREL|YEAR|LUCK)/.test(c.ruleId)), `${y}-${m}-${d}`).toBe(false);
      const usable = usableClaims(f.claims, true);
      const text = [...usable.flatMap((c) => [c.thesis, c.condition, c.limitation]), ...f.lines.filter((l) => /^card_(love|year|luck)/.test(l.id)).map((l) => l.text)].join('\n');
      expect(text, `${y}-${m}-${d}`).not.toMatch(/\p{Script=Han}/u);
      expect(text.match(JARGON)?.[0] ?? null, `${y}-${m}-${d}`).toBeNull();
      const plan = buildPlan('love_deep', f);
      expect(plan.sections.map((s) => s.title)).not.toContain('10년 단위 큰 흐름');
      for (const s of plan.sections) expect(usable.some((cl) => cl.tags.some((t) => s.focusTags.includes(t))), `${y}-${m}-${d} ${s.title}`).toBe(true);
      for (const s of plan.sections) expect(s.title + s.purpose, s.title).not.toMatch(JARGON);
    }
  });
});

describe('궁합 카드', () => {
  it('실제 두 원국: 바탕 기운 관계·짝·채움·각자의 가까운 관계 자리 명제가 만들어진다', () => {
    const A = chartOf(1995, 5, 17, 14); // 일간 무토, 일지 申
    const B = chartOf(1993, 3, 9, 14);
    const c = buildCompatCards(A.rules, B.rules, { a: A.facts.fiveElements, b: B.facts.fiveElements });
    const ids = c.claims.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['C-card-compat-core', 'C-card-compat-day', 'C-card-compat-month', 'C-card-compat-complement', 'C-card-compat-a-love', 'C-card-compat-b-love']));
    expect(c.claims.find((x) => x.id === 'C-card-compat-a-love')!.thesis.startsWith('나는 ')).toBe(true);
    expect(c.claims.find((x) => x.id === 'C-card-compat-b-love')!.thesis.startsWith('상대는 ')).toBe(true);
  });
  it('무작위 200쌍: 한자·전문용어 없음, 점수 없음, 모든 섹션에 쓸 명제가 있고 섹션 지시문도 쉬운 말', () => {
    const r = rng(23);
    const pick = () => chartOf(1900 + Math.floor(r() * 151), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28), r() < 0.15 ? null : Math.floor(r() * 24));
    for (let i = 0; i < 200; i++) {
      const A = pick(), B = pick();
      const f = buildCompatInterpretation(A.facts, B.facts, { rules: { a: A.rules, b: B.rules } });
      const text = [...f.claims.flatMap((c) => [c.thesis, c.condition, c.limitation]), ...f.lines.map((l) => l.text)].join('\n');
      expect(text).not.toMatch(/\p{Script=Han}/u);
      expect(text.match(JARGON)?.[0] ?? null).toBeNull();
      expect(text).not.toMatch(/\d+\s*(%|점)/);
      const usable = usableClaims(f.claims, true);
      const plan = buildPlan('compatibility', f);
      for (const s of plan.sections) {
        expect(usable.some((cl) => cl.tags.some((t) => s.focusTags.includes(t))), s.title).toBe(true);
        expect(s.title + s.purpose).not.toMatch(JARGON);
      }
    }
  });
});
