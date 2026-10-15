import { CATALOG, ProductId } from '../catalog';
import { CHARACTERS } from './characters';
import { branchRelation, elementRelation, STEM_ELEMENT, tenGod } from '../saju/rules';
import { calculator } from '../saju/calculator';
import { Branch, BRANCH_KO, BRANCHES, Element, ELEMENT_KO, SajuFacts, Stem, STEM_KO, STEMS } from '../saju/types';

export const REPORT_PROMPT_VERSION = 'mock-template-1.0';
export const REPORT_RULES_VERSION = 'interp-rules-0.1';

export interface Evidence { id: string; label: string; detail: string; ruleId: string }
export interface ReportSection { id: string; title: string; body: string; evidenceIds: string[] }
export interface MetricLabel { label: string; level: '잘 맞아요' | '무난해요' | '조율이 필요해요'; note: string }
export interface QaCheck { id: string; label: string; status: 'pass' | 'fail' | 'warn'; detail: string }
export interface Report {
  productId: ProductId;
  mode: 'MOCK_SANDBOX' | 'LLM';
  sections: ReportSection[];
  evidence: Evidence[];
  metrics?: MetricLabel[];
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

const timeNote = (f: SajuFacts) => (f.pillars.hour === null ? ' (출생 시간을 몰라 시주는 반영하지 않았어요.)' : '');

function basic(f: SajuFacts) {
  const c = CHARACTERS[f.dayMaster];
  const dom = dominant(f), weak = weakest(f);
  const main = f.tenGods[1].god;
  const hourTxt = f.pillars.hour ? `${f.pillars.hour}(${pillarKo(f.pillars.hour)})` : '없음';
  const sections: ReportSection[] = [
    { id: 's1', title: '원국 핵심', evidenceIds: ['pillars', 'day_master', 'elements'], body: `사주 원국은 연주 ${f.pillars.year}(${pillarKo(f.pillars.year)}), 월주 ${f.pillars.month}(${pillarKo(f.pillars.month)}), 일주 ${f.pillars.day}(${pillarKo(f.pillars.day)}), 시주 ${hourTxt}이에요.${timeNote(f)} 나를 대표하는 일간은 ${f.dayMaster}으로 ${ELEMENT_KO[STEM_ELEMENT[f.dayMaster]]}의 기운이에요. 전체 오행에서는 ${ELEMENT_KO[dom]}이(가) 가장 두드러지고 ${ELEMENT_KO[weak]}이(가) 상대적으로 적게 보여요.` },
    { id: 's2', title: '타고난 성격·기질', evidenceIds: ['day_master', 'god_month'], body: `${c.temperament} 월간에는 일간 기준 ${main}이(가) 놓여 ${GOD_TRAIT[main]}이(가) 사회적인 모습에서 자주 드러나요.` },
    { id: 's3', title: '강점·재능', evidenceIds: ['day_master', 'elements'], body: `${c.strengths.join(', ')}이(가) 대표적인 강점이에요. 특히 ${ELEMENT_KO[dom]}의 기운이 많아 이 방향의 활동에서 힘을 얻기 쉬워요.` },
    { id: 's4', title: '직업·재물 경향', evidenceIds: ['god_month', 'god_year'], body: `${GOD_TRAIT[main]}을(를) 살릴 수 있는 환경에서 만족도가 높아요. 재물은 한 번에 크게 얻기보다 자기 방식으로 꾸준히 쌓을 때 안정적일 가능성이 커요.` },
    { id: 's5', title: '관계·연애 경향', evidenceIds: ['day_master', 'god_year'], body: `관계에서는 "${c.weaknesses[0]}"는 점을 기억해 두면 좋아요. 마음을 표현하는 작은 습관이 관계를 훨씬 편하게 만들어 줘요.` },
    { id: 's6', title: '실천 조언', evidenceIds: ['elements'], body: `${ELEMENT_KO[weak]}의 기운을 보완하는 활동(색, 장소, 루틴)을 일상에 한 가지만 더해 보세요. 사주는 정해진 결론이 아니라 나를 이해하는 참고 지도예요.` },
  ];
  return { sections, evidence: baseEvidence(f) };
}

function love(f: SajuFacts, baseYear: number) {
  const c = CHARACTERS[f.dayMaster];
  const years = [0, 1, 2, 3, 4].map((i) => baseYear + i);
  const evidence = baseEvidence(f);
  const yearRows = years.map((y) => {
    const yp = calculator.yearPillar(y);
    const g = tenGod(f.dayMaster, yp[0] as Stem);
    evidence.push(ev(`year_${y}`, `${y}년 세운`, `${yp}(${pillarKo(yp)}) → 일간 ${f.dayMaster} 기준 ${g}. 연도 경계는 입춘 기준(샘플 엔진은 매년 2월 4일로 근사).`, 'R-YEARLY'));
    return { y, yp, g };
  });
  const sections: ReportSection[] = [
    { id: 's1', title: '연애 기질', evidenceIds: ['day_master'], body: `${c.name}의 결을 가진 당신은 ${c.temperament}` },
    { id: 's2', title: '원하는 관계·상대', evidenceIds: ['elements', 'god_month'], body: `편안함을 주는 상대를 선호할 가능성이 있어요. ${ELEMENT_KO[weakest(f)]}의 기운을 보완해 주는 사람에게 끌릴 수 있지만, 이는 경향일 뿐 사람마다 달라요.` },
    { id: 's3', title: '반복될 수 있는 관계 패턴', evidenceIds: ['day_master'], body: `${c.weaknesses.join(' / ')} — 이런 습관이 관계에서 비슷한 장면을 만들 수 있어요. 패턴을 알아차리는 것만으로도 선택이 달라져요.` },
    { id: 's4', title: '강점·어려움', evidenceIds: ['day_master'], body: `강점: ${c.strengths.join(', ')}. 어려움은 솔직한 감정 표현을 미루는 순간에 생기기 쉬워요.` },
    { id: 's5', title: '현재 대운', evidenceIds: ['pillars'], body: f.luckCycles.length ? `대운은 ${f.luckCycles.slice(0, 4).map((c) => `${c.startAge}세 ${c.pillar}`).join(' → ')} 순으로 이어져요. 시작 나이는 절입 시각을 기준으로 환산한 값이라 공식 절입 자료 확인 전에는 참고용이에요.` : '성별이나 출생 시간이 없어 대운은 계산하지 않았어요.' },
    { id: 's6', title: `${years[0]}~${years[4]}년 세운`, evidenceIds: years.map((y) => `year_${y}`), body: yearRows.map(({ y, yp, g }) => `${y}년(${yp}): 일간 기준 ${g}의 해로, ${GOD_TRAIT[g]}이(가) 관계 속에서 부각돼요.`).join('\n') },
    { id: 's7', title: '조언', evidenceIds: ['elements'], body: '결과를 단정적인 예언으로 받아들이기보다, 관계에서 내가 편안한 방식을 점검하는 질문지로 활용해 보세요.' },
  ];
  return { sections, evidence, years };
}

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
    { id: 's1', title: '관계 유형', evidenceIds: ['dm_rel'], body: `두 사람은 ${relType}로 볼 수 있어요. ${CHARACTERS[da].name}와(과) ${CHARACTERS[db].name}의 조합이에요.` },
    { id: 's2', title: '소통', evidenceIds: ['dm_rel'], body: `소통 지표는 '${metrics[0].level}'이에요. 한쪽이 설명하는 방식과 다른 쪽이 받아들이는 방식이 다를 수 있으니 결론 전에 요약해서 확인해 보세요.` },
    { id: 's3', title: '갈등·차이', evidenceIds: ['branch_rel'], body: `일지 관계는 ${br === '없음' ? '특별한 합충이 없고' : br + '이고'} 갈등 지표는 '${metrics[1].level}'이에요. 차이는 틀림이 아니라 속도의 문제일 때가 많아요.` },
    { id: 's4', title: '애정표현', evidenceIds: ['branch_rel'], body: `애정표현 지표는 '${metrics[2].level}'이에요. 상대가 편한 표현 방식(말, 행동, 시간)을 물어보는 것부터 시작해 보세요.` },
    { id: 's5', title: '생활방식', evidenceIds: ['a_pillars', 'b_pillars'], body: `생활방식 지표는 '${metrics[3].level}'이에요. 주요 오행이 ${ELEMENT_KO[dominant(a)]}과(와) ${ELEMENT_KO[dominant(b)]}으로 달라, 휴식·소비·정리 습관은 미리 합의해 두면 좋아요.` },
    { id: 's6', title: '소통 조언', evidenceIds: ['dm_rel'], body: '점수나 확률로 관계를 판단하지 않아요. 이 결과는 대화를 시작하는 참고 자료로만 활용해 주세요.' },
  ];
  const warnings = [...new Set([...a.warnings, ...b.warnings])].filter((w) => w === 'hour_pillar_unavailable' || w === 'engine_unverified');
  return { sections, evidence, metrics, warnings };
}

export function runQa(productId: ProductId, r: Pick<Report, 'sections' | 'chars' | 'years' | 'baseYear' | 'mode'>, hourMissing: boolean): QaCheck[] {
  const p = CATALOG[productId];
  const checks: QaCheck[] = [];
  checks.push({ id: 'toc', label: '필수 목차', status: r.sections.length === p.toc.length ? 'pass' : 'fail', detail: `${r.sections.length}/${p.toc.length}` });
  if (p.length) {
    const [lo, hi] = p.length;
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

export interface GenerateArgs { productId: ProductId; facts: SajuFacts; factsB?: SajuFacts; baseYear: number }

/** 모의 생성기. 실제 LLM 호출은 서버(Edge Function)에서만 하며 브라우저에는 API 키를 두지 않는다. */
export function generateReport({ productId, facts, factsB, baseYear }: GenerateArgs): Report {
  let sections: ReportSection[];
  let evidence: Evidence[];
  let metrics: MetricLabel[] | undefined;
  let years: number[] | undefined;
  let extraWarn: string[] = [];
  if (productId === 'basic') ({ sections, evidence } = basic(facts));
  else if (productId === 'love_deep') ({ sections, evidence, years } = love(facts, baseYear));
  else if (productId === 'compatibility' && factsB) {
    const r = compatibilityParts(facts, factsB);
    ({ sections, evidence, metrics } = r);
    extraWarn = r.warnings;
  } else throw new Error('지원하지 않는 상품이에요.');
  const chars = sections.reduce((n, s) => n + s.body.replace(/\s/g, '').length, 0);
  const part = {
    productId,
    mode: 'MOCK_SANDBOX' as const,
    sections, evidence, metrics, years,
    baseYear: productId === 'love_deep' ? baseYear : undefined,
    warnings: [...new Set([...facts.warnings, ...extraWarn])],
    versions: { rules: REPORT_RULES_VERSION, prompt: REPORT_PROMPT_VERSION, model: 'none(template)', engine: `${facts.computation.engine_name}@${facts.computation.engine_version}` },
    chars,
  };
  return { ...part, qa: runQa(productId, part, facts.pillars.hour === null || factsB?.pillars.hour === null) };
}
