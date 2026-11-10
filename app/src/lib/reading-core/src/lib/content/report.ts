// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import { CATALOG, ProductId } from '../catalog';
import { CHARACTERS } from './characters';
import { branchRelation, elementRelation, STEM_ELEMENT, tenGod } from '../saju/rules';
import { calculator } from '../saju/calculator';
import { DATE_STYLE, basicDrafts, loveDrafts } from './reading';
import { STEM_IMAGE } from './readingBank';
import { STEM_LIFE, STEM_LOVE } from './readingBank2';
import { ELEMENT_MANY, GOD_DEEP } from './readingBank';
import { CHECK_QUESTIONS, FIGHT_SCRIPT, LOVE_MOMENT } from './readingBank3';
import { CATEGORIES, CRISIS_LINES, Category, Line, buildReading, classifyConcern, isCrisis } from './concern';
import { Branch, BRANCH_KO, BRANCHES, Element, ELEMENT_KO, SajuFacts, Stem, STEM_KO, STEMS } from '../saju/types';

export const REPORT_PROMPT_VERSION = 'mock-template-1.0';
export const REPORT_RULES_VERSION = 'interp-rules-0.1';

export interface Evidence { id: string; label: string; detail: string; ruleId: string }
export interface ReportSection { id: string; title: string; body: string; evidenceIds: string[]; /** 카테고리 라벨과 한 줄 제목(화면용) */ tag?: string; headline?: string }
export interface ConcernReading { text: string; category?: Category; label?: string; crisis?: boolean; lines: Line[] }
export interface MetricLabel { label: string; level: '잘 맞아요' | '무난해요' | '조율이 필요해요'; note: string }
export interface QaCheck { id: string; label: string; status: 'pass' | 'fail' | 'warn'; detail: string }
export interface Report {
  productId: ProductId;
  mode: 'MOCK_SANDBOX' | 'LLM';
  sections: ReportSection[];
  evidence: Evidence[];
  metrics?: MetricLabel[];
  concern?: ConcernReading;
  baseYear?: number;
  years?: number[];
  warnings: string[];
  versions: { rules: string; prompt: string; model: string; engine: string };
  chars: number;
  qa: QaCheck[];
}

const pillarKo = (p: string) => STEM_KO[STEMS.indexOf(p[0] as Stem)] + BRANCH_KO[BRANCHES.indexOf(p[1] as Branch)];
const entries = (f: SajuFacts) => Object.entries(f.fiveElements) as [Element, number][];
const dominant = (f: SajuFacts): Element => entries(f).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
const weakest = (f: SajuFacts): Element => entries(f).reduce((a, b) => (b[1] < a[1] ? b : a))[0];

const GOD_TRAIT: Record<string, string> = {
  비견: '자립심과 동료 의식', 겁재: '승부욕과 추진력', 식신: '표현력과 여유', 상관: '재치와 창의성',
  편재: '활동성과 기회 포착력', 정재: '성실함과 현실 감각', 편관: '도전 정신과 책임감', 정관: '신뢰감과 단정함',
  편인: '직관과 독창성', 정인: '배려와 학습 의욕',
};

const ev = (id: string, label: string, detail: string, ruleId: string): Evidence => ({ id, label, detail, ruleId });

function baseEvidence(f: SajuFacts): Evidence[] {
  const list: Evidence[] = [
    ev('pillars', '사주 원국', `연주 ${f.pillars.year}, 월주 ${f.pillars.month}, 일주 ${f.pillars.day}, 시주 ${f.pillars.hour ?? '없음(시간 미상)'}`, 'R-PILLARS'),
    ev('day_master', '일간', `${f.dayMaster} · ${ELEMENT_KO[STEM_ELEMENT[f.dayMaster]]}`, 'R-DAYMASTER'),
    ev('elements', '오행 분포', entries(f).map(([e, n]) => `${ELEMENT_KO[e]} ${n}`).join(' · ') + ' (천간·지지 기준, 지장간 제외)', 'R-ELEMENTS'),
  ];
  const posKo = { year: '연', month: '월', hour: '시' } as const;
  f.tenGods.forEach((t) => list.push(ev(`god_${t.position}`, `${posKo[t.position]}간 십성`, `${t.stem} → 일간 ${f.dayMaster} 기준 ${t.god}`, 'R-TENGOD')));
  return list;
}

function basic(f: SajuFacts, baseYear: number) {
  const sections: ReportSection[] = basicDrafts(f, { baseYear }).map((d) => ({ id: d.id, title: d.title, body: d.paras.join('\n'), evidenceIds: d.evidenceIds }));
  return { sections, evidence: baseEvidence(f) };
}

function love(f: SajuFacts, baseYear: number) {
  const years = [0, 1, 2, 3, 4].map((i) => baseYear + i);
  const evidence = baseEvidence(f);
  years.forEach((y) => {
    const yp = calculator.yearPillar(y);
    const g = tenGod(f.dayMaster, yp[0] as Stem);
    evidence.push(ev(`year_${y}`, `${y}년 세운`, `${yp}(${pillarKo(yp)}) → 일간 ${f.dayMaster} 기준 ${g}. 연도 경계는 입춘 기준(샘플 엔진은 매년 2월 4일로 근사).`, 'R-YEARLY'));
  });
  const sections: ReportSection[] = loveDrafts(f, years, { baseYear }).map((d) => ({ id: d.id, title: d.title, body: d.paras.join('\n'), evidenceIds: d.evidenceIds }));
  return { sections, evidence, years };
}

const _b = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const wa = (w: string) => w + (_b(w) ? '과' : '와');
const ro = (w: string) => w + ((_b(w) && !/[ㄹ]/.test('') && (w.charCodeAt(w.length - 1) - 0xac00) % 28 !== 8) ? '으로' : '로');
export function compatibilityParts(a: SajuFacts, b: SajuFacts) {
  const da = a.dayMaster, db = b.dayMaster;
  const ea = STEM_ELEMENT[da], eb = STEM_ELEMENT[db];
  const rel = elementRelation(ea, eb);
  const br = branchRelation(a.pillars.day[1] as Branch, b.pillars.day[1] as Branch);
  const god = tenGod(da, db);
  const lv = (c: 'good' | 'mid' | 'bad'): MetricLabel['level'] => (c === 'good' ? '잘 맞아요' : c === 'mid' ? '무난해요' : '조율이 필요해요');
  const domRel = elementRelation(dominant(a), dominant(b));
  const metrics: MetricLabel[] = [
    { label: '소통', level: lv(rel === '도움 받음' || rel === '내가 도움' ? 'good' : rel === '같은 기운' ? 'mid' : 'bad'), note: `일간 오행 관계: ${rel}` },
    { label: '갈등 관리', level: lv(br === '충' ? 'bad' : br === '육합' ? 'good' : 'mid'), note: `일지 관계: ${br}` },
    { label: '애정표현', level: lv(br === '육합' ? 'good' : ['정재', '정관', '정인', '식신'].includes(god) ? 'mid' : 'bad'), note: `상대 일간 십성: ${god}` },
    { label: '생활방식', level: lv(dominant(a) === dominant(b) ? 'mid' : domRel === '조절 받음' || domRel === '내가 조절' ? 'bad' : 'good'), note: `주요 오행: ${ELEMENT_KO[dominant(a)]} / ${ELEMENT_KO[dominant(b)]}` },
  ];
  const evidence: Evidence[] = [
    ev('a_pillars', '나의 원국', `${a.pillars.year} ${a.pillars.month} ${a.pillars.day} ${a.pillars.hour ?? '(시주 없음)'}`, 'R-PILLARS'),
    ev('b_pillars', '상대 원국', `${b.pillars.year} ${b.pillars.month} ${b.pillars.day} ${b.pillars.hour ?? '(시주 없음)'}`, 'R-PILLARS'),
    ev('dm_rel', '일간 오행 관계', `${da}(${ELEMENT_KO[ea]}) ↔ ${db}(${ELEMENT_KO[eb]}): ${rel}`, 'R-COMPAT-DM'),
    ev('branch_rel', '일지 관계', `${a.pillars.day[1]} ↔ ${b.pillars.day[1]}: ${br}`, 'R-COMPAT-BRANCH'),
  ];
  const relType = rel === '같은 기운' ? '거울처럼 닮은 사이' : rel === '내가 도움' ? '내가 기운을 북돋아 주는 사이' : rel === '도움 받음' ? '서로 기대어 힘을 얻는 사이' : '서로 다른 결이 긴장과 자극을 주는 사이';
  const sections: ReportSection[] = [
    { id: 's1', title: '관계 유형', evidenceIds: ['dm_rel'], body: `두 사람은 ${relType}로 볼 수 있어요. ${wa(CHARACTERS[da].name)} ${CHARACTERS[db].name}의 조합이에요.` },
    { id: 's2', title: '소통', evidenceIds: ['dm_rel'], body: `소통 지표는 '${metrics[0].level}'이에요. 한쪽이 설명하는 방식과 다른 쪽이 받아들이는 방식이 다를 수 있으니 결론 전에 요약해서 확인해 보세요.` },
    { id: 's3', title: '갈등·차이', evidenceIds: ['branch_rel'], body: `일지 관계는 ${br === '없음' ? '특별한 합충이 없고' : br + '이고'} 갈등 지표는 '${metrics[1].level}'이에요. 차이는 틀림이 아니라 속도의 문제일 때가 많아요.` },
    { id: 's4', title: '애정표현', evidenceIds: ['branch_rel'], body: `애정표현 지표는 '${metrics[2].level}'이에요. 상대가 편한 표현 방식(말, 행동, 시간)을 물어보는 것부터 시작해 보세요.` },
    { id: 's5', title: '생활방식', evidenceIds: ['a_pillars', 'b_pillars'], body: `생활방식 지표는 '${metrics[3].level}'이에요. 주요 오행이 ${ELEMENT_KO[dominant(a)]}과 ${ELEMENT_KO[dominant(b)]}${dominant(a) === dominant(b) ? '으로 같아 생활 리듬은 비슷하지만 같은 부분에서 함께 지치기 쉬우니' : '으로 달라'}, 휴식·소비·정리 습관은 미리 합의해 두면 좋아요.` },
    { id: 's6', title: '소통 조언', evidenceIds: ['dm_rel'], body: '점수나 확률로 관계를 판단하지 않아요. 이 결과는 대화를 시작하는 참고 자료로만 활용해 주세요.' },
  ];
  const ca = CHARACTERS[da], cb = CHARACTERS[db];
  const add = (id: string, text: string) => { const sec = sections.find((x) => x.id === id); if (sec) sec.body += '\n' + text; };
  add('s1', `${ca.name}는 ${STEM_IMAGE[da].img}, ${cb.name}는 ${ro(STEM_IMAGE[db].img)} 그려 볼 수 있어요. ${rel === '같은 기운' ? '비슷한 결이라 서로의 마음을 쉽게 이해하지만, 같은 약점도 닮아 있어 함께 지치기 쉬워요.' : rel === '내가 도움' ? '내가 상대에게 힘을 보태는 방향의 관계예요. 베푸는 만큼 나도 채워질 수 있도록 받는 연습이 필요해요.' : rel === '도움 받음' ? '상대에게서 힘과 배움을 얻는 방향의 관계예요. 받은 만큼 고마움을 표현하면 관계가 더 단단해져요.' : rel === '내가 조절' ? '내가 상황을 정리하고 이끄는 방향의 관계예요. 상대의 속도를 존중하면 주도권이 부담이 아니라 신뢰가 돼요.' : '상대가 나를 자극하고 긴장시키는 방향의 관계예요. 부딪히는 만큼 서로를 성장시키니, 말투만 부드럽게 다듬어 보세요.'}`);
  add('s1', `두 사람의 케미를 한 줄로 쓰면 "${ca.name}${ca.name.endsWith('이') ? '' : ''}와 ${cb.name}, ${rel === '같은 기운' ? '닮은 결로 서로를 비추는 사이' : rel === '내가 도움' ? '한쪽이 먼저 손을 내미는 사이' : rel === '도움 받음' ? '서로에게 기대어 힘을 얻는 사이' : rel === '내가 조절' ? '이끄는 쪽과 따르는 쪽이 번갈아 바뀌는 사이' : '다름이 자극이 되는 사이'}"예요.`);
  add('s2', `${ca.name}는 ${STEM_LIFE[da].comfort} 마음이 편하고, ${STEM_LIFE[da].drain} 지쳐요. ${cb.name}는 ${STEM_LIFE[db].comfort} 마음이 편하고, ${STEM_LIFE[db].drain} 지쳐요. 대화할 때 서로의 편한 순간과 지치는 순간을 떠올리면 말이 훨씬 부드러워져요.`);
  add('s2', `${ca.name}에게 힘이 되는 말은 ${STEM_LIFE[da].words}이고, ${cb.name}에게 힘이 되는 말은 ${STEM_LIFE[db].words}예요. 서로가 듣고 싶은 말을 한 번씩 건네 보세요. 일상 대화가 훨씬 따뜻해져요.`);
  add('s3', `갈등이 생길 때 그대로 써도 좋은 말이에요.\n${FIGHT_SCRIPT.map((x) => `• ${x}`).join('\n')}`);
  add('s4', `${ca.name}: ${STEM_LOVE[da]}\n${cb.name}: ${STEM_LOVE[db]}\n설레는 순간은 ${ca.name}가 ${LOVE_MOMENT[da].spark}, ${cb.name}는 ${LOVE_MOMENT[db].spark}예요. 서로의 설렘 포인트를 알고 챙겨 주세요.`);
  add('s3', `${ca.name} 입장에서 ${cb.name}는 ${god}의 결이라 ${GOD_DEEP[god].love}. 반대로 ${cb.name} 입장에서 ${ca.name}는 ${tenGod(db, da)}의 결이라 ${GOD_DEEP[tenGod(db, da)].love}.`);
  add('s5', `${ELEMENT_MANY[dominant(a)]} ${dominant(a) === dominant(b) ? '두 사람 모두 이 성향이 강하니 같은 지점에서 함께 지치지 않도록 쉬는 시간을 나눠 정하세요.' : ELEMENT_MANY[dominant(b)]}`);
  add('s5', `마음이 식는 순간도 서로 달라요. ${ca.name}는 ${LOVE_MOMENT[da].cool}, ${cb.name}는 ${LOVE_MOMENT[db].cool} 마음이 식기 쉬워요. 이 순간을 피해 가는 것만으로도 갈등이 크게 줄어요.`);
  add('s4', `둘에게 잘 맞는 데이트는 ${DATE_STYLE[god]}예요. 한 번씩 서로가 고르는 방식으로 번갈아 해 보면 서로의 취향이 선명해져요.`);
  add('s6', `관계에서 가장 중요한 건 점수가 아니라 서로의 속도를 확인하는 습관이에요. 이 풀이에서 "맞아" 싶은 한 가지를 골라 이번 주에 상대와 이야기해 보세요. 같은 문장을 함께 읽는 것만으로도 대화가 시작돼요.`);
  add('s6', `한 달 실험 세 가지예요.\n• 하루에 한 번 고마운 점 한 문장 나누기\n• 서운한 일은 그날 안에 "나는 ~해서 서운했어"로 말하기\n• 일주일에 한 번, 서로가 고른 방식으로 시간 보내기`);
  add('s6', `둘이 함께 해 볼 점검 질문이에요.\n${CHECK_QUESTIONS.slice(0, 3).map((x, k) => `${k + 1}. ${x}`).join('\n')}`);
  const warnings = [...new Set([...a.warnings, ...b.warnings])].filter((w) => w === 'hour_pillar_unavailable' || w === 'engine_unverified');
  return { sections, evidence, metrics, warnings };
}

export function runQa(productId: ProductId, r: Pick<Report, 'sections' | 'chars' | 'years' | 'baseYear' | 'mode'>, hourMissing: boolean): QaCheck[] {
  const p = CATALOG[productId];
  const checks: QaCheck[] = [];
  checks.push({ id: 'toc', label: '필수 목차', status: r.sections.length === p.toc.length ? 'pass' : 'fail', detail: `${r.sections.length}/${p.toc.length}` });
  const range = r.mode === 'MOCK_SANDBOX' ? (p.sandboxLength ?? p.length) : p.length;
  if (range) {
    const [lo, hi] = range;
    checks.push({
      id: 'length',
      label: `분량 ${lo.toLocaleString()}~${hi.toLocaleString()}자`,
      status: r.chars >= lo && r.chars <= hi ? 'pass' : 'fail',
      detail: `${r.chars.toLocaleString()}자${r.mode === 'MOCK_SANDBOX' ? ' · 샘플 본문이라 목표 분량 미달 (정식 분량은 LLM 연동 후 검증)' : ''}`,
    });
  }
  if (productId === 'love_deep' && r.years && r.baseYear) {
    const ok = r.years.length === 5 && r.years.every((y, i) => y === r.baseYear! + i);
    checks.push({ id: 'years', label: '연속 5개 연도', status: ok ? 'pass' : 'fail', detail: r.years.join(', ') });
  }
  const text = r.sections.map((s) => s.body).join('\n');
  const hourMention = /시주 [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/.test(text);
  checks.push({ id: 'hour', label: '시주 임의 생성 금지', status: hourMissing && hourMention ? 'fail' : 'pass', detail: hourMissing ? '시간 미상: 시주 미표시' : '해당 없음' });
  checks.push({ id: 'absolutes', label: '단정적 예언 표현', status: /반드시 결혼|무조건 재회|100%/.test(text) ? 'fail' : 'pass', detail: '금지 표현 검사' });
  checks.push({ id: 'evidence', label: '근거 연결', status: r.sections.every((s) => s.evidenceIds.length > 0) ? 'pass' : 'fail', detail: '모든 문단에 근거 ID' });
  return checks;
}

export interface GenerateArgs { productId: ProductId; facts: SajuFacts; factsB?: SajuFacts; baseYear: number; concern?: string }

/** 모의 생성기. 실제 LLM 호출은 서버(Edge Function)에서만 하며 브라우저에는 API 키를 두지 않는다. */

/** 화면용 카테고리 라벨·한 줄 제목. 모두 계산된 사실(일간 캐릭터·십성·오행)에서 규칙으로 만든다. */
function decorate(productId: ProductId, sections: ReportSection[], f: SajuFacts): ReportSection[] {
  const c = CHARACTERS[f.dayMaster];
  const dom = dominant(f), weak = weakest(f), main = f.tenGods[1]?.god ?? '비견';
  const BASIC: Record<string, [string, string]> = {
    s1: ['한마디로', `${c.name}, ${c.summary}`],
    s2: ['나라는 사람', `${GOD_TRAIT[main]}이 드러나는 ${ELEMENT_KO[dom]} 기운의 사람`],
    s3: ['나만의 매력', `${c.strengths[0]}에서 힘이 나는 사람`],
    s4: ['일과 돈', `${GOD_TRAIT[main]}을 살리는 나만의 방식`],
    s5: ['관계와 연애', `알아 두면 편해지는 관계 습관 하나`],
    s6: ['오늘부터 해볼 것', `${ELEMENT_KO[weak]} 기운을 채우는 작은 습관`],
  };
  const LOVE: Record<string, [string, string]> = {
    s1: ['나의 연애 스타일', `${c.name}의 결을 가진 사랑 방식`], s2: ['끌리는 관계', '편안함의 기준을 알아보기'], s3: ['쓴소리 좀 할게', '반복되기 쉬운 관계 패턴'],
    s4: ['강점과 어려움', '사랑에서 나를 돕는 힘과 걸림돌'], s5: ['큰 흐름', '대운으로 보는 긴 호흡'], s6: ['앞으로 5년', '연도별 관계 분위기'], s7: ['마무리 조언', '점검 질문으로 쓰는 풀이'],
  };
  const map = productId === 'basic' ? BASIC : productId === 'love_deep' ? LOVE : {};
  return sections.map((x) => ({ ...x, tag: map[x.id]?.[0] ?? '관계 해설', headline: map[x.id]?.[1] ?? x.title }));
}

/** 적어 준 고민 → 범주 분류 → 사주 근거 풀이. 위기 표현이면 풀이 대신 도움 안내만 한다. */
export function buildConcern(text: string | undefined, f: SajuFacts): ConcernReading | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  if (isCrisis(t)) return { text: '', crisis: true, lines: CRISIS_LINES.map((x) => ({ who: 'earth' as const, text: x })) };
  const cat = classifyConcern(t);
  if (!cat) return { text: t, lines: [{ who: 'earth', text: '적어 준 고민을 한 가지 주제로 나누기는 어려웠어요. 그래서 사주 전체의 결을 바탕으로, 어떤 고민에도 도움이 되는 방향을 아래 해설에 담았어요.' }, { who: 'mine', text: '더 구체적인 상황(누가, 언제, 무엇이 걱정인지)을 적어 주면 다음에는 그 부분에 맞춰 볼 수 있어요.' }] };
  const c = CATEGORIES.find((x) => x.id === cat)!;
  return { text: t, category: cat, label: `${c.emoji} ${c.label}`, lines: buildReading(cat, undefined, f) };
}

export function generateReport({ productId, facts, factsB, baseYear, concern: concern_ }: GenerateArgs): Report {
  let sections: ReportSection[];
  let evidence: Evidence[];
  let metrics: MetricLabel[] | undefined;
  let years: number[] | undefined;
  let extraWarn: string[] = [];
  if (productId === 'basic') ({ sections, evidence } = basic(facts, baseYear));
  else if (productId === 'love_deep') ({ sections, evidence, years } = love(facts, baseYear));
  else if (productId === 'compatibility' && factsB) {
    const r = compatibilityParts(facts, factsB);
    ({ sections, evidence, metrics } = r);
    extraWarn = r.warnings;
  } else throw new Error('지원하지 않는 상품이에요.');
  sections = decorate(productId, sections, facts);
  const concern = productId === 'compatibility' ? undefined : buildConcern(concern_, facts);
  const chars = sections.reduce((n, s) => n + s.body.replace(/\s/g, '').length, 0);
  const part = {
    productId,
    mode: 'MOCK_SANDBOX' as const,
    sections, evidence, metrics, years, concern,
    baseYear: productId === 'love_deep' ? baseYear : undefined,
    warnings: [...new Set([...facts.warnings, ...extraWarn])],
    versions: { rules: REPORT_RULES_VERSION, prompt: REPORT_PROMPT_VERSION, model: 'none(template)', engine: `${facts.computation.engine_name}@${facts.computation.engine_version}` },
    chars,
  };
  return { ...part, qa: runQa(productId, part, facts.pillars.hour === null || factsB?.pillars.hour === null) };
}
