import { hasHanja, toHangul } from './hangul';
import { usableClaims } from './claims';
import type { Element } from '../saju/types';
import type { InterpretationFacts, QaIssue, ReportPlan, SectionPlan } from './types';

/**
 * 자동 품질 검수 (PRD 6.1-4): 코드로 확정할 수 있는 항목만 검사한다.
 * ⚠️ 문장의 "좋음"(자연스러움·공감)은 코드로 판정하지 않는다 → 사람의 5축 검수(사실 정합성·근거·차별성·읽기 편함·적용 가능성)가 따로 필요.
 */
export const QA_VERSION = 'qa-2.0';

export const countChars = (s: string) => s.replace(/\s/g, '').length;
const GANJI = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g;
const sentences = (s: string) => s.split(/(?<=[.!?。])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 0);
const norm = (s: string) => s.replace(/[\s.,!?'"“”‘’()·\-]/g, '');

const PROPHECY = [
  /반드시/, /무조건/, /100\s*%/, /틀림없이/, /확실(히|하게)\s*(결혼|재회|이별|합격|성공|돈)/, /운명(이|은)\s*(이미\s*)?정해/,
  /(결혼|이별|재회|이혼|사망|사고|파산|합격)[을를이가]?\s*(하게\s*(될|됩니다|돼요)|할\s*것(입니다|이에요|이다)|할\s*거(예요|야))/,
];
const MEDICAL = /우울증|조울|불안\s*장애|공황|ADHD|자폐|치매|암\b|질병|정신과|진단|처방|치료/;
/** 일반인이 모르는 사주 전문용어(제품 규칙: 쓰지 않는다). 본문·제목에서 발견되면 반려한다. */
export const JARGON = /일간|일지|월지|연지|시지|천간|지지|원국|일주|월주|연주|시주|십성|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|비겁|식상|재성|관성|인성|지장간|신살|용신|희신|기신|격국|대운|세운|간지|합충|신강|신약|득령|통근|투출|사령|월령|합화|육합|삼합|방합|천간합|합과 충|합·충|충과|충이|충을|충은|충이 있/;
const SCORE = /\d+\s*(%|퍼센트|점\b)|\d+\s*\/\s*100|점수/;
const HOUR_NEG = /모르|없|미상|제외|반영하지|알 수 없|계산하지|해석하지|생략/;

const EL_WORDS: Record<string, Element> = { 나무: 'wood', 목: 'wood', 불: 'fire', 화: 'fire', 흙: 'earth', 토: 'earth', 쇠: 'metal', 금: 'metal', 물: 'water', 수: 'water' };
const EL_NAME: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const EL_LIST = '(?:나무|불|흙|쇠|물)(?:\\([목화토금수]\\))?';
const NONE_RE = new RegExp(`((?:${EL_LIST}[·,\\s및와과]*)+)\\s*기운(?:이|은|도|만)?\\s*(?:전혀\\s*)?(?:없|드러나지 않|비어)`, 'g');
const MOST_RE = new RegExp(`(${EL_LIST})\\s*기운(?:이|은)?\\s*(?:전체에서\\s*|원국에서\\s*)?가장\\s*(?:많|두드러|강)`, 'g');
const elementsIn = (t: string) => [...t.matchAll(/나무|불|흙|쇠|물/g)].map((m) => EL_WORDS[m[0]]!);
/** "X 기운이 없다/가장 많다" 같은 문장이 계산된 오행 분포와 어긋나는지 검사한다(어긋난 문장 설명을 돌려준다). */
export function elementMismatches(body: string, dominant: Element[], missing: Element[]): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(NONE_RE)) for (const e of elementsIn(m[1]!)) if (!missing.includes(e)) out.push(`"${EL_NAME[e]} 기운이 없다"고 썼지만 실제로는 있어요. 없는 기운은 ${missing.map((x) => EL_NAME[x]).join('·') || '없음'} 뿐이에요.`);
  for (const m of body.matchAll(MOST_RE)) for (const e of elementsIn(m[1]!)) if (!dominant.includes(e)) out.push(`"${EL_NAME[e]} 기운이 가장 많다"고 썼지만 가장 많은 기운은 ${dominant.map((x) => EL_NAME[x]).join('·')} 이에요.`);
  return [...new Set(out)];
}

export interface QaContext { facts: InterpretationFacts; plan: ReportPlan; /** 샌드박스·검수 화면에서만 true: 승인 전(DRAFT) 명제도 허용 */ allowDraft?: boolean }

/** 한 섹션만 검사 (재시도 판단용) */
export function checkSection(body: string, claimIds: string[], section: SectionPlan, ctx: QaContext, headline?: string, factIds: string[] = []): QaIssue[] {
  const { facts, plan } = ctx;
  const out: QaIssue[] = [];
  const add = (code: string, message: string, severity: QaIssue['severity'] = 'fail') => out.push({ code, message, severity, sectionId: section.id });
  const n = countChars(body);

  if (!body.trim()) { add('EMPTY', '본문이 비어 있어요.'); return out; }
  // 사주 전문용어 금지(제품 규칙): 일반인이 읽고 이해할 수 있어야 한다
  const jg = body.match(JARGON) ?? (headline ? headline.match(JARGON) : null);
  if (jg) add('JARGON', `사주 전문용어가 있어요(${jg[0]}). 일반인이 아는 쉬운 말로 풀어 써요.`);
  // 한자 금지(제품 규칙): 간지·오행 한자는 한글로 바꾸고 그 밖의 한자가 남으면 반려
  if (hasHanja(toHangul(body))) add('HANJA', `한자가 있어요(${(toHangul(body).match(/\p{Script=Han}+/u) ?? [''])[0]}). 한글로만 써요.`);
  if (headline !== undefined) {
    const h = headline.trim();
    if (h.length < 8 || h.length > 50) add('HEADLINE', `제목(headline)은 12~32자 안팎으로 써요(지금 ${h.length}자).`);
    else if (hasHanja(toHangul(h)) || SCORE.test(h) || /[\p{Extended_Pictographic}]/u.test(h)) add('HEADLINE', '제목에는 한자·이모지·점수를 쓰지 않아요.');
  }
  // 사실 정합: 오행 분포를 본문이 잘못 말하면 반려(계산값을 바꾸지 못한다)
  const subj = facts.subjects.length === 1 ? facts.subjects[0] : undefined;
  if (subj) {
    for (const m of elementMismatches(body, subj.dominant, subj.missing)) add('FACT_MISMATCH', m);
  }
  // 사실 줄 ID: 제공되지 않은 사실을 근거로 댔으면 반려
  if (factIds.length) {
    const known = new Set(facts.lines.map((l) => l.id));
    const unknownFacts = factIds.filter((id) => !known.has(id));
    if (unknownFacts.length) add('FACT_UNKNOWN', `제공되지 않은 사실 ID를 썼어요: ${unknownFacts.join(', ')}. 제공된 facts 의 id 만 써요.`);
  }
  // 분량: 섹션 단위
  if (n < section.minChars) add('LENGTH_SHORT', `분량이 부족해요(${n}자). 목표 ${section.targetChars}자, 최소 ${section.minChars}자를 채워요. 지금 글에 약 ${Math.max(1, section.targetChars - n)}자(문단 1~2개)를 더 풀어 써요.`);
  if (n > section.maxChars) add('LENGTH_LONG', `분량이 너무 길어요(${n}자). 최대 ${section.maxChars}자 안으로 줄여요.`);

  // 숫자/간지 불일치: 제공되지 않은 간지 검출
  const allowed = new Set(facts.allowedGanji);
  const bad = [...new Set(body.match(GANJI) ?? [])].filter((g) => !allowed.has(g));
  if (bad.length) add('GANJI_MISMATCH', `제공되지 않은 간지를 언급했어요: ${bad.join(', ')}. 제공된 원국·세운 간지만 써요.`);

  // 지원하지 않는 시주 언급
  if (!plan.hourKnown) {
    const hit = sentences(body).find((s) => /시주|시간\s*기둥/.test(s) && !HOUR_NEG.test(s));
    if (hit) add('HOUR_PILLAR', `출생 시간을 모르는데 시주를 언급했어요: "${hit.slice(0, 40)}…". 시주 해석을 빼요.`);
  }

  // 단정적 미래 예언
  const prophecy = PROPHECY.find((re) => re.test(body));
  if (prophecy) add('PROPHECY', `단정적인 예언 표현이 있어요(${body.match(prophecy)?.[0]}). 경향으로 바꿔 써요.`);
  // 의학·심리 진단
  const med = body.match(MEDICAL);
  if (med) add('MEDICAL', `의학·심리 진단성 표현이 있어요(${med[0]}). 빼거나 일상적인 표현으로 바꿔요.`);
  // 점수·확률
  const sc = body.match(SCORE);
  if (sc) add('SCORE', `점수·확률 표현이 있어요(${sc[0]}). 말로 된 경향으로 바꿔요.`);

  // 연도: 허용된 연도만
  if (plan.years) {
    const mentioned = [...body.matchAll(/(20\d{2})\s*년/g)].map((m) => Number(m[1]));
    const stray = [...new Set(mentioned.filter((y) => !plan.years!.includes(y)))];
    if (stray.length) add('YEAR_OUT_OF_RANGE', `다루지 않는 연도를 언급했어요: ${stray.join(', ')}년.`);
    if (section.focusTags.includes('yearly')) {
      const missing = plan.years.filter((y) => !body.includes(`${y}년`));
      if (missing.length) add('YEAR_MISSING', `다음 연도를 빠뜨렸어요: ${missing.join(', ')}년. 5개 연도를 모두 다뤄요.`);
    }
  }

  // 명제 참조 검증: 제공(승인)된 명제만, 실제로 사용
  const usable = usableClaims(facts.claims, ctx.allowDraft ?? false);
  const usableIds = new Set(usable.map((c) => c.id));
  const primary = usable.filter((c) => c.tags.some((t) => section.focusTags.includes(t)));
  const unknown = claimIds.filter((id) => !usableIds.has(id));
  if (unknown.length) add('CLAIM_UNKNOWN', `제공되지 않았거나 승인되지 않은 명제 ID를 썼어요: ${unknown.join(', ')}. 제공된 approvedClaims 의 id 만 써요.`);
  if (!claimIds.length && primary.length) add('CLAIM_EMPTY', 'claim_ids 가 비어 있어요. 실제로 사용한 명제 ID를 적어요.');
  else if (claimIds.length < Math.min(2, primary.length)) add('CLAIM_FEW', `사용한 명제가 ${claimIds.length}개예요. 가능하면 2개 이상을 종합해요.`, 'warn');

  // 일반론: 사용한(또는 우선) 명제의 고유 표지 2개 이상
  const anchors = new Set<string>();
  (claimIds.length ? usable.filter((c) => claimIds.includes(c.id)).concat(primary) : primary).forEach((c) => c.anchors.forEach((a) => anchors.add(a)));
  const nbody = toHangul(body);
  const hits = [...anchors].filter((a) => a && (body.includes(a) || nbody.includes(toHangul(a))));
  const need = section.focusTags.includes('limits') ? 1 : 2;
  if (anchors.size && hits.length < need) add('TOO_GENERIC', `명제의 고유한 표지(예: ${[...anchors].slice(0, 5).join(', ')})를 ${need}개 이상 직접 언급해야 해요. 지금은 ${hits.length}개예요.`, 'warn');

  // 말투 (경고): 선택한 문체와 맞는지
  const ss = sentences(body);
  if (ss.length >= 3) {
    const ok = plan.tone === 'hamnida' ? ss.filter((x) => /(니다|니까|습니다|세요|다)[.!?]?$/.test(x)).length : ss.filter((x) => /요[.!?]?$/.test(x)).length;
    if (ok / ss.length < 0.6) add('TONE', `${plan.tone === 'hamnida' ? '합니다체' : '해요체'} 문장이 적어요(${Math.round((ok / ss.length) * 100)}%). 문체를 통일해요.`, 'warn');
  }
  return out;
}

/** 리포트 전체: 분량 합계, 섹션 간 중복, 필수 목차 */
export function checkReport(sections: { id: string; title: string; body: string }[], plan: ReportPlan): QaIssue[] {
  const out: QaIssue[] = [];
  const total = sections.reduce((n, s) => n + countChars(s.body), 0);
  if (sections.length !== plan.sections.length || plan.sections.some((p, i) => sections[i]?.id !== p.id)) out.push({ code: 'TOC', severity: 'fail', message: '필수 목차가 맞지 않아요.' });
  if (total < plan.totalRange[0]) out.push({ code: 'TOTAL_SHORT', severity: 'fail', message: `전체 분량이 부족해요(${total}자, 최소 ${plan.totalRange[0]}자).` });
  if (total > plan.totalRange[1]) out.push({ code: 'TOTAL_LONG', severity: 'fail', message: `전체 분량이 너무 길어요(${total}자, 최대 ${plan.totalRange[1]}자).` });

  // 같은 문장 반복
  const seen = new Map<string, string>();
  for (const s of sections) for (const sen of sentences(s.body)) {
    const k = norm(sen); if (k.length < 12) continue;
    const prev = seen.get(k);
    if (prev && prev !== s.id) out.push({ code: 'DUP_SENTENCE', severity: 'fail', sectionId: s.id, message: `"${sen.slice(0, 30)}…" 문장이 ${prev} 섹션과 똑같아요. 다른 표현·관점으로 써요.` });
    else if (prev === s.id) out.push({ code: 'DUP_SENTENCE', severity: 'fail', sectionId: s.id, message: `같은 섹션 안에서 문장이 반복돼요: "${sen.slice(0, 30)}…".` });
    seen.set(k, s.id);
  }
  // 섹션 간 문자 3-gram 유사도
  const grams = (t: string) => { const x = norm(t); const g = new Set<string>(); for (let i = 0; i + 3 <= x.length; i++) g.add(x.slice(i, i + 3)); return g; };
  const gs = sections.map((s) => grams(s.body));
  for (let i = 0; i < sections.length; i++) for (let j = i + 1; j < sections.length; j++) {
    const inter = [...gs[i]].filter((x) => gs[j].has(x)).length;
    const uni = gs[i].size + gs[j].size - inter;
    const jac = uni ? inter / uni : 0;
    if (jac > 0.4) out.push({ code: 'DUP_SECTION', severity: 'fail', sectionId: sections[j].id, message: `"${sections[j].title}"이(가) "${sections[i].title}"과 너무 비슷해요(유사도 ${Math.round(jac * 100)}%). 겹치는 설명을 빼고 새 관점을 써요.` });
  }
  return out;
}

export const summarize = (issues: QaIssue[]) => ({
  failed: issues.filter((i) => i.severity === 'fail').length,
  warned: issues.filter((i) => i.severity === 'warn').length,
  codes: [...new Set(issues.map((i) => i.code))],
});
