import { STEM_ELEMENT, elementRelation, tenGod, branchGod, branchRelation, BRANCH_MAIN_STEM } from '../saju/rules';
import { Branch, ELEMENT_KO, SajuFacts, Stem } from '../saju/types';
import { analyzeChart, analyzeLove, analyzeYear, bko, ELEMENTS, GOD_LOVE, GOD_TRAIT, GROUP_MEANING, ko, pillarsOf, POS_BRANCH, POS_STEM, STEM_COMBINE, type ChartAnalysis } from './analysis';
import { applyApprovals, buildCompatClaims, buildLoveClaims, buildPersonClaims, buildYearClaims, detectConflicts, luckMissingClaim } from './claims';
import type { EvidenceItem, FactLine, InterpretationFacts, ProductKey, Subject } from './types';
import type { R002to005 } from '../../../engine/saju-rules/src';
import { buildRuleCards } from './cards';

/** 판단 카드가 대신하는 옛 명제 규칙·사실 줄 */
const REPLACED_RULES = new Set(['R-CLM-AUTONOMY', 'R-CLM-EXPRESSION', 'R-CLM-PRACTICALITY', 'R-CLM-STRUCTURE', 'R-CLM-SUPPORT', 'R-CLM-POWER', 'R-CLM-SEASON']);
const REPLACED_LINES = new Set(['gods', 'month_stem', 'power', 'season']);

/**
 * 해석 규칙 엔진 (사주 계산 사실 → "사실 줄" + "해석 명제(Claim)").
 * - 사실 줄(facts): 계산된 값을 있는 그대로 문장으로 옮긴 것. 근거 ID 포함.
 * - 해석 명제(claims): 사실 줄을 근거로 한 해석 한 줄. 근거/반대근거/조건/한계/규칙 ID/승인 상태를 가진다.
 * LLM 은 승인된 명제만 쉬운 말로 풀어 쓴다. 규칙이 바뀌면 INTERPRETATION_VERSION 을 올린다.
 * ⚠️ 신강/신약 등은 학파별 차이가 큰 단순 근사이며 전문가 검수 전 상태다.
 */
export const INTERPRETATION_VERSION = 'interp-3.0';

const topic = (who: string) => `${who}는`;

export function subjectOf(f: SajuFacts, key: Subject['key']): Subject {
  const a = analyzeChart(f);
  return { key, dominant: a.dominant, missing: a.missing, dayMaster: f.dayMaster, dayMasterKo: ko(f.dayMaster), element: STEM_ELEMENT[f.dayMaster], pillars: f.pillars, hourKnown: f.pillars.hour !== null };
}

class Builder {
  lines: FactLine[] = [];
  evidence: EvidenceItem[] = [];
  line(id: string, text: string, evidenceIds: string[], tags: string[], anchors: string[]) { this.lines.push({ id, text, evidenceIds, tags, anchors }); }
  ev(id: string, label: string, detail: string, ruleId: string) { if (!this.evidence.some((e) => e.id === id)) this.evidence.push({ id, label, detail, ruleId }); }
}

/** 한 사람의 사주 사실 줄 (기본사주·연애운 공통). prefix 는 궁합에서 A/B 를 구분하는 용도. */
function personLines(b: Builder, f: SajuFacts, p: string, who: string): ChartAnalysis {
  const A = analyzeChart(f);
  const { dm, dmEl, pillars, counts, dominant, weak, missing, gods, top, absent, monthGod, self, other, season, seasonSupported, monthBranch: mb, relations } = A;
  b.ev(`${p}pillars`, `${who} 사주 원국`, `연주 ${f.pillars.year}, 월주 ${f.pillars.month}, 일주 ${f.pillars.day}, 시주 ${f.pillars.hour ?? '없음(시간 미상)'}`, 'R-PILLARS');
  b.ev(`${p}day_master`, `${who} 일간`, `${dm}(${ko(dm)}) · ${ELEMENT_KO[dmEl]}`, 'R-DAYMASTER');
  b.line(`${p}core`, `${who}의 일간은 ${dm}(읽는 법: ${ko(dm)})이고 ${ELEMENT_KO[dmEl]} 기운이에요. 사주 원국(네 기둥): ${pillars.map(([k, v]) => `${POS_STEM[k].slice(0, 1)}주 ${v}`).join(', ')}.${A.hourKnown ? '' : ' 출생 시간을 몰라 시주는 없어요.'}`, [`${p}pillars`, `${p}day_master`], ['core', 'personality'], [dm, ko(dm) + ' 일간', f.pillars.day]);

  b.ev(`${p}elements`, `${who} 오행 분포`, ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${counts[e]}`).join(' · ') + ' (천간·지지 겉글자 기준, 지장간 제외)', 'R-ELEMENTS');
  b.line(`${p}balance`, `${who}의 오행 분포는 ${ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${counts[e]}`).join(', ')}예요. 가장 많은 기운은 ${dominant.map((e) => ELEMENT_KO[e]).join('·')}, 가장 적은 기운은 ${weak.map((e) => ELEMENT_KO[e]).join('·')}${missing.length ? ` (${missing.map((e) => ELEMENT_KO[e]).join('·')}은 없어요)` : ''}예요.`, [`${p}elements`], ['balance', 'personality', 'strength', 'advice'], [...dominant.map((e) => ELEMENT_KO[e].slice(0, 1)), ...weak.map((e) => ELEMENT_KO[e].slice(0, 1))]);

  b.ev(`${p}gods`, `${who} 십성 배치`, gods.map((g) => `${POS_STEM[g.pos].slice(0, 1)}${g.kind === '천간' ? '간' : '지'} ${g.stem}=${g.god}`).join(', ') + ' (지지는 본기 천간 기준, 월지 가중 2배)', 'R-TENGOD');
  b.line(`${p}gods`, `${who}의 십성 배치: ${gods.map((g) => `${POS_STEM[g.pos].slice(0, 1)}${g.kind === '천간' ? '간' : '지'} ${g.god}`).join(', ')}. 비중이 가장 큰 영역은 ${top.map((g) => `${g}(${GROUP_MEANING[g]})`).join(', ')}${absent.length ? `, 드러나지 않는 영역은 ${absent.join('·')}` : ''}이에요.`, [`${p}gods`], ['personality', 'strength', 'career', 'money', 'relationship'], [...new Set(gods.map((g) => g.god))]);
  b.line(`${p}month_stem`, `${who}의 월간은 일간 기준 ${monthGod}으로, 사회적인 모습에서 ${GOD_TRAIT[monthGod]}이 자주 드러나는 편이에요.`, [`${p}gods`], ['personality', 'career', 'strength'], [monthGod, '월간']);

  const label = A.power === 'SELF' ? '자기 힘(나를 지키는 기운)이 센 편' : A.power === 'OTHER' ? '바깥 힘(표현·재물·책임)이 센 편' : '자기 힘과 바깥 힘이 비교적 균형';
  b.ev(`${p}power`, `${who} 자기 힘 vs 바깥 힘`, `비겁+인성 ${self} / 식상+재성+관성 ${other} (월지 2배 가중 · 신강/신약의 단순 근사)`, 'R-POWER');
  b.line(`${p}power`, `${topic(who)} ${label}이에요. (비겁+인성 ${self} 대 식상+재성+관성 ${other}. 전통 신강·신약의 단순 근사이므로 단정 표현은 피해요.)`, [`${p}power`], ['personality', 'strength', 'career', 'money', 'advice'], [A.power === 'SELF' ? '자기 힘' : A.power === 'OTHER' ? '바깥 힘' : '균형']);

  b.ev(`${p}season`, `${who} 태어난 계절`, `월지 ${mb}(${bko(mb)}) → ${season.name}`, 'R-SEASON');
  b.line(`${p}season`, `${topic(who)} ${season.name}(월지 ${mb})에 태어났고, 이 계절의 기운은 일간의 ${ELEMENT_KO[dmEl]} 기운을 ${seasonSupported ? '도와주는 편' : '도와주지 않는 편'}이에요.`, [`${p}season`], ['personality', 'balance', 'advice'], [season.name.slice(0, 2), mb]);

  b.ev(`${p}relations`, `${who} 원국 안의 합충`, relations.length ? relations.join(', ') : '뚜렷한 합·충 없음', 'R-RELATIONS');
  b.line(`${p}relations`, relations.length ? `${who}의 원국에서 보이는 합·충: ${relations.join('; ')}.` : `${who}의 원국에는 천간합·육합·충이 뚜렷하게 보이지 않아요.`, [`${p}relations`], ['relations', 'personality', 'relationship', 'love'], relations.length ? ['합', '충'].filter((w) => relations.join().includes(w)) : ['합충 없음']);
  return A;
}

/** 연애 관련: 일지(배우자궁), 이성 인연 별 */
function loveLines(b: Builder, f: SajuFacts, gender?: 'F' | 'M' | 'X') {
  const L = analyzeLove(f, gender);
  const dm = f.dayMaster, db = L.palaceBranch;
  b.ev('love_palace', '일지(배우자궁)', `일지 ${db}(${bko(db)}) 본기 ${BRANCH_MAIN_STEM[db]} → 일간 ${dm} 기준 ${L.palaceGod}`, 'R-LOVE-PALACE');
  b.line('love_palace', `일지(배우자궁) ${db}의 본기는 일간 기준 ${L.palaceGod}이에요. 그래서 관계에서 ${GOD_LOVE[L.palaceGod]}.`, ['love_palace'], ['love', 'relationship'], [L.palaceGod, '일지']);
  const star = gender === 'F' ? `관성 ${L.gwan}개(전통적으로 여성의 이성·결혼 인연을 보는 별)` : gender === 'M' ? `재성 ${L.jae}개(전통적으로 남성의 이성·결혼 인연을 보는 별)` : `재성 ${L.jae}개와 관성 ${L.gwan}개(성별 미입력이라 두 별을 함께 봐요)`;
  b.ev('love_stars', '이성 인연 별', `재성 ${L.jae}, 관성 ${L.gwan}, 식상 ${L.sik}, 인성 ${L.inn} (원국 겉글자·지지 본기 기준)`, 'R-LOVE-STARS');
  b.line('love_stars', `원국에서 ${star}가 보이고, 표현을 담당하는 식상은 ${L.sik}개, 정서적 지지를 뜻하는 인성은 ${L.inn}개예요.`, ['love_stars'], ['love', 'relationship', 'strength'], ['재성', '관성', '식상']);
  b.line('love_relations', L.palaceRelations.length ? `일지 ${db}는 ${L.palaceRelations.map(([k, r]) => `${POS_BRANCH[k]}와 ${r}`).join(', ')} 관계예요. 배우자궁이 다른 자리와 부딪히거나 묶이는 구조라 관계에서 그 영향이 드러나기 쉬워요.` : `일지 ${db}는 원국의 다른 지지와 합·충이 없어 배우자궁이 비교적 조용한 편이에요.`, ['love_palace'], ['love', 'relationship'], L.palaceRelations.length ? ['일지', ...L.palaceRelations.map(([, r]) => r)] : ['일지']);
  return L;
}

export interface BuildOptions {
  gender?: 'F' | 'M' | 'X'; years?: number[]; yearPillar?: (year: number) => string;
  /** R-002~R-005 결정론 엔진 결과. 주면 십성 비중 근사 명제 대신 판단 카드(cards.ts)를 쓴다. */
  rules?: R002to005;
  /** 상담사가 승인한 규칙 ID. 기본값은 비어 있어 모든 명제가 DRAFT(검수 전)다. */
  approvedRuleIds?: ReadonlySet<string>;
}

const calcOf = (f: SajuFacts) => ({ engine: `${f.computation.engine_name}@${f.computation.engine_version}`, rules: f.computation.rules_version, timezonePolicy: f.computation.timezone_policy, verified: f.computation.verified });

export function buildInterpretation(product: 'basic' | 'love_deep', f: SajuFacts, opts: BuildOptions = {}): InterpretationFacts {
  const b = new Builder();
  const A = personLines(b, f, '', '나');
  let claims = buildPersonClaims(A, '', '나');
  if (opts.rules) {
    // 판단 카드로 교체: 십성 개수 기반 근사(R-CLM-AUTONOMY 등)와 그 사실 줄을 빼고, 기준서 규칙 결과를 넣는다
    const cards = buildRuleCards(opts.rules);
    if (cards.claims.length) {
      b.lines = b.lines.filter((l) => !REPLACED_LINES.has(l.id)).concat(cards.lines);
      b.evidence = b.evidence.concat(cards.evidence);
      claims = claims.filter((c) => !REPLACED_RULES.has(c.ruleId) && !c.ruleId.startsWith('R-CLM-TENSION')).concat(cards.claims);
      // 지지 합충: 천간합은 카드가 다루므로 빼고, 지지끼리의 짝만 쉬운 말로 다시 쓴다(존재만, 작용은 미판단)
      const POSK: Record<string, string> = { 연지: '태어난 해', 월지: '태어난 달', 일지: '태어난 날', 시지: '태어난 시' };
      const br = A.relations.map((x) => x.match(/^(연지|월지|일지|시지)\(.\)와 (연지|월지|일지|시지)\(.\)는 (충|육합)$/)).filter((m): m is RegExpMatchArray => !!m)
        .map((m) => `${POSK[m[1]!]}·${POSK[m[2]!]} 자리의 ${m[3] === '충' ? '서로 부딪히는 짝' : '서로 묶이는 짝'}`);
      const text = br.length ? `땅 쪽 자리끼리 ${br.join(', ')}이 있어요. 실제로 어떻게 작용하는지는 판단하지 않았어요.` : '땅 쪽 자리끼리 서로 부딪히거나 묶이는 짝은 뚜렷하지 않아요.';
      b.lines = b.lines.map((l) => (l.id === 'relations' ? { ...l, text, anchors: ['짝'] } : l));
      claims = claims.map((c) => (c.ruleId === 'R-CLM-RELATIONS' ? {
        ...c, ruleId: 'SJ-BRANCH-PAIRS-DRAFT', stance: br.length ? 'CONTEXTUAL' : 'NONE', anchors: ['짝'],
        thesis: br.length ? '땅 쪽 자리끼리 부딪히거나 묶이는 짝이 있어, 해당 자리와 관련된 일이나 관계에서 밀고 당기는 장면이 생길 여지가 있어요' : '땅 쪽 자리끼리 부딪히거나 묶이는 짝이 뚜렷하지 않아, 관계의 큰 출렁임은 적은 편으로 볼 수 있어요',
        limitation: '짝이 있다는 사실일 뿐, 실제로 작용하는지와 그 세기는 판단하지 않았어요',
      } : c));
    }
  }
  const limits = f.warnings.filter((w) => ['hour_pillar_unavailable', 'luck_cycles_unavailable', 'term_boundary_unverified', 'engine_unverified'].includes(w));
  const allowed = new Set<string>(pillarsOf(f).map(([, v]) => v));

  if (product === 'love_deep') {
    const L = loveLines(b, f, opts.gender);
    claims = claims.concat(buildLoveClaims(L));
    const years = opts.years ?? [];
    const yp = opts.yearPillar;
    if (!yp) throw new Error('yearPillar 함수가 필요해요');
    for (const y of years) {
      const p = yp(y); allowed.add(p);
      const Y = analyzeYear(f, y, p);
      b.ev(`year_${y}`, `${y}년 세운`, `${p}(${ko(p[0] as Stem)}${bko(p[1] as Branch)}) → 천간 ${Y.stemGod}, 지지 ${Y.branchGod}, 일지와 ${Y.toDay}, 월지와 ${Y.toMonth}. 연도 경계는 입춘 기준(샘플 엔진은 근사).`, 'R-YEARLY');
      const hint = [Y.toDay !== '없음' ? `일지(배우자궁)와 ${Y.toDay}이라 관계 영역이 움직이기 쉬워요` : '일지와는 합·충이 없어 비교적 잔잔해요', Y.toMonth !== '없음' ? `월지와도 ${Y.toMonth}이라 사회적인 환경 변화가 함께 와요` : ''].filter(Boolean).join('. ');
      b.line(`year_${y}`, `${y}년은 ${p}해예요. 천간은 일간 기준 ${Y.stemGod}(${GOD_TRAIT[Y.stemGod]}), 지지는 ${Y.branchGod}이에요. ${hint}.`, [`year_${y}`], ['yearly', 'love', `year:${y}`], [`${y}년`, p, Y.stemGod]);
      claims.push(buildYearClaims(Y));
    }
    if (!f.luckCycles.length) { b.line('luck_missing', '대운(10년 단위 큰 흐름)은 아직 검증된 계산이 없어요. 대운의 간지·시작 나이를 지어내지 말고, 계산 전이라는 점과 세운 중심으로 읽는다는 점만 솔직하게 안내하세요.', [], ['luck', 'limits'], ['대운']); claims.push(luckMissingClaim()); }
  }
  claims = applyApprovals(claims, opts.approvedRuleIds);
  return {
    version: INTERPRETATION_VERSION, product, subjects: [subjectOf(f, 'ME')], lines: b.lines, claims, conflicts: detectConflicts(claims), evidence: b.evidence,
    calculation: calcOf(f), allowedGanji: [...allowed], years: opts.years, limits,
  };
}

/** 궁합: 두 사람 사실 + 관계 사실. 상대 실명·생년월일은 전달하지 않고 원국 간지만 쓴다. */
export function buildCompatInterpretation(a: SajuFacts, bFacts: SajuFacts, opts: { approvedRuleIds?: ReadonlySet<string> } = {}): InterpretationFacts {
  const b = new Builder();
  const AA = personLines(b, a, 'a_', '나');
  const BB = personLines(b, bFacts, 'b_', '상대');
  const da = a.dayMaster, db = bFacts.dayMaster;
  const ea = STEM_ELEMENT[da], eb = STEM_ELEMENT[db];
  const rel = elementRelation(ea, eb);
  b.ev('dm_rel', '일간 오행 관계', `${da}(${ELEMENT_KO[ea]}) → ${db}(${ELEMENT_KO[eb]}): ${rel}`, 'R-COMPAT-DM');
  const combine = STEM_COMBINE.some(([x, y]) => (x === da && y === db) || (y === da && x === db));
  b.line('dm_rel', `나의 일간 ${da}(${ELEMENT_KO[ea]})와 상대의 일간 ${db}(${ELEMENT_KO[eb]})의 오행 관계는 "${rel}"이에요. 나 기준 상대는 ${tenGod(da, db)}, 상대 기준 나는 ${tenGod(db, da)}이에요.${combine ? ' 두 일간은 천간합(서로 끌어당겨 하나로 묶이는 관계)이에요.' : ''}`, ['dm_rel'], ['compat_core', 'communication', 'love'], [rel, tenGod(da, db), tenGod(db, da)]);
  const bd = a.pillars.day[1] as Branch, bb = bFacts.pillars.day[1] as Branch;
  const br = branchRelation(bd, bb);
  b.ev('branch_rel', '일지 관계', `${bd} ↔ ${bb}: ${br}`, 'R-COMPAT-BRANCH');
  b.line('branch_rel', `두 사람의 일지(배우자궁)는 ${bd}와 ${bb}로 "${br === '없음' ? '합도 충도 없는 관계' : br}"예요.${br === '충' ? ' 부딪히는 구조라 속도·방식 차이를 조율하는 게 중요해요.' : br === '육합' ? ' 서로 묶이는 구조라 정서적으로 가까워지기 쉬워요.' : ''}`, ['branch_rel'], ['compat_core', 'conflict', 'affection'], [br === '없음' ? '합도 충도' : br, bd, bb]);
  const mA = a.pillars.month[1] as Branch, mB = bFacts.pillars.month[1] as Branch;
  const mr = branchRelation(mA, mB);
  b.ev('month_rel', '월지 관계', `${mA} ↔ ${mB}: ${mr}`, 'R-COMPAT-MONTH');
  b.line('month_rel', `두 사람의 월지는 ${mA}와 ${mB}로 "${mr === '없음' ? '합도 충도 없는 관계' : mr}"이에요. 생활 환경과 사회적 리듬이 ${mr === '충' ? '엇갈리기 쉬워요' : mr === '육합' ? '잘 맞물리기 쉬워요' : '크게 부딪히거나 묶이지 않아요'}.`, ['month_rel'], ['lifestyle', 'conflict'], ['월지', mA, mB]);
  const need = (x: SajuFacts, y: SajuFacts) => ELEMENTS.filter((e) => x.fiveElements[e] <= 1 && y.fiveElements[e] >= 2);
  const aGets = need(a, bFacts), bGets = need(bFacts, a);
  b.ev('complement', '오행 보완', `나에게 부족한 기운을 상대가 채움: ${aGets.map((e) => ELEMENT_KO[e]).join('·') || '없음'} / 상대에게 부족한 기운을 내가 채움: ${bGets.map((e) => ELEMENT_KO[e]).join('·') || '없음'}`, 'R-COMPAT-COMPLEMENT');
  b.line('complement', `오행 보완을 보면, 상대는 나에게 ${aGets.map((e) => ELEMENT_KO[e]).join('·') || '뚜렷하게 채워 주는 기운이 없고'}${aGets.length ? ' 기운을 채워 주고' : ''}, 나는 상대에게 ${bGets.map((e) => ELEMENT_KO[e]).join('·') || '뚜렷하게 채워 주는 기운이 없어요'}${bGets.length ? ' 기운을 채워 줘요' : ''}.`, ['complement'], ['lifestyle', 'communication', 'affection'], [...aGets, ...bGets].map((e) => ELEMENT_KO[e].slice(0, 1)).concat(['오행 보완']));
  const aGod = branchGod(da, bd), bGod = branchGod(db, bb);
  b.line('a_love', `나의 일지 십성은 ${aGod}으로, 관계에서 ${GOD_LOVE[aGod]}.`, ['a_day_master'], ['affection', 'love'], [aGod]);
  b.line('b_love', `상대의 일지 십성은 ${bGod}으로, 관계에서 ${GOD_LOVE[bGod]}.`, ['b_day_master'], ['affection', 'love'], [bGod]);

  const claims = applyApprovals([
    ...buildPersonClaims(AA, 'a_', '나'), ...buildPersonClaims(BB, 'b_', '상대'),
    ...buildCompatClaims({ rel, tgAB: tenGod(da, db), tgBA: tenGod(db, da), combine, branchRel: br, bd, bb, monthRel: mr, mA, mB, aGets: aGets.map((e) => ELEMENT_KO[e]), bGets: bGets.map((e) => ELEMENT_KO[e]), aLoveGod: aGod, bLoveGod: bGod, aLoveKey: 'a', bLoveKey: 'b', aLoveText: GOD_LOVE[aGod], bLoveText: GOD_LOVE[bGod] }),
  ], opts.approvedRuleIds);
  const allowed = new Set([...pillarsOf(a).map(([, v]) => v), ...pillarsOf(bFacts).map(([, v]) => v)]);
  const limits = [...new Set([...a.warnings, ...bFacts.warnings])].filter((w) => ['hour_pillar_unavailable', 'term_boundary_unverified', 'engine_unverified'].includes(w));
  return { version: INTERPRETATION_VERSION, product: 'compatibility', subjects: [subjectOf(a, 'A'), subjectOf(bFacts, 'B')], lines: b.lines, claims, conflicts: detectConflicts(claims), evidence: b.evidence, calculation: { ...calcOf(a), verified: a.computation.verified && bFacts.computation.verified }, allowedGanji: [...allowed], limits };
}

export const productKey = (p: string): p is ProductKey => p === 'basic' || p === 'love_deep' || p === 'compatibility';
