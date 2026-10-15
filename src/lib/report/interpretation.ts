import { BRANCH_MAIN_STEM, STEM_ELEMENT, branchGod, branchRelation, elementRelation, tenGod } from '../saju/rules';
import { Branch, BRANCH_KO, BRANCHES, Element, ELEMENT_KO, SajuFacts, Stem, STEM_KO, STEMS, TenGod } from '../saju/types';
import type { EvidenceItem, FactLine, InterpretationFacts, ProductKey, Subject } from './types';

/**
 * 해석 규칙 엔진 (사주 계산 사실 → "근거가 붙은 사실 줄").
 * LLM 은 여기서 만든 줄만 쉬운 말로 풀어 쓴다. 규칙이 바뀌면 INTERPRETATION_VERSION 을 올린다.
 * ⚠️ 신강/신약 등은 학파별 차이가 큰 단순 근사이며 전문가 검수 전 상태다.
 */
export const INTERPRETATION_VERSION = 'interp-2.0';

type Group = '비겁' | '식상' | '재성' | '관성' | '인성';
const GROUP: Record<TenGod, Group> = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
const GROUP_MEANING: Record<Group, string> = {
  비겁: '나와 같은 편·자존감·경쟁심', 식상: '표현력·재능·아이디어를 내보내는 힘', 재성: '현실 감각·재물·결과를 다루는 힘', 관성: '규칙·책임·사회적 인정과 압박', 인성: '배움·보호·정서적 지지',
};
const GOD_TRAIT: Record<TenGod, string> = {
  비견: '자립심과 동료 의식', 겁재: '승부욕과 추진력', 식신: '표현력과 여유', 상관: '재치와 창의성', 편재: '활동성과 기회 포착력',
  정재: '성실함과 현실 감각', 편관: '도전 정신과 책임감', 정관: '신뢰감과 단정함', 편인: '직관과 독창성', 정인: '배려와 학습 의욕',
};
const GOD_LOVE: Record<TenGod, string> = {
  비견: '친구처럼 대등한 관계를 편하게 느껴요', 겁재: '관계에서 주도권·경쟁 이슈가 생기기 쉬워요', 식신: '편안하게 챙기고 챙김받는 관계를 선호해요',
  상관: '솔직한 표현이 강하고 틀에 갇히는 걸 싫어해요', 편재: '활동적이고 자유로운 관계를 선호해요', 정재: '안정적이고 현실적인 관계를 선호해요',
  편관: '긴장감과 책임이 따르는 관계에 끌려요', 정관: '예의와 약속을 중시하는 관계를 선호해요', 편인: '정서적 거리와 혼자만의 시간이 필요해요', 정인: '이해받고 돌봄받는 관계를 선호해요',
};
const STEM_COMBINE: [Stem, Stem][] = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
const SEASON: Record<Branch, { name: string; element: Element | 'earth' }> = {
  寅: { name: '초봄', element: 'wood' }, 卯: { name: '한봄', element: 'wood' }, 辰: { name: '늦봄(토 기운이 센 달)', element: 'earth' },
  巳: { name: '초여름', element: 'fire' }, 午: { name: '한여름', element: 'fire' }, 未: { name: '늦여름(토 기운이 센 달)', element: 'earth' },
  申: { name: '초가을', element: 'metal' }, 酉: { name: '한가을', element: 'metal' }, 戌: { name: '늦가을(토 기운이 센 달)', element: 'earth' },
  亥: { name: '초겨울', element: 'water' }, 子: { name: '한겨울', element: 'water' }, 丑: { name: '늦겨울(토 기운이 센 달)', element: 'earth' },
};
const PRODUCES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

const POS_STEM = { year: '연간', month: '월간', day: '일간', hour: '시간' } as const;
const POS_BRANCH = { year: '연지', month: '월지', day: '일지', hour: '시지' } as const;
type Pos = keyof typeof POS_STEM;

/** 주제 조사: 나→나는, 상대→상대는 */
const topic = (who: string) => `${who}는`;
const ko = (s: Stem) => STEM_KO[STEMS.indexOf(s)];
const bko = (b: Branch) => BRANCH_KO[BRANCHES.indexOf(b)];
const pillarsOf = (f: SajuFacts) => (Object.entries(f.pillars) as [Pos, string | null][]).filter(([, p]) => p) as [Pos, string][];

export function subjectOf(f: SajuFacts, key: Subject['key']): Subject {
  return { key, dayMaster: f.dayMaster, dayMasterKo: ko(f.dayMaster), element: STEM_ELEMENT[f.dayMaster], pillars: f.pillars, hourKnown: f.pillars.hour !== null };
}

class Builder {
  lines: FactLine[] = [];
  evidence: EvidenceItem[] = [];
  line(id: string, text: string, evidenceIds: string[], tags: string[], anchors: string[]) { this.lines.push({ id, text, evidenceIds, tags, anchors }); }
  ev(id: string, label: string, detail: string, ruleId: string) { if (!this.evidence.some((e) => e.id === id)) this.evidence.push({ id, label, detail, ruleId }); }
}

/** 한 사람의 사주 사실 줄 (기본사주·연애운 공통). prefix 는 궁합에서 A/B 를 구분하는 용도. */
function personLines(b: Builder, f: SajuFacts, p: string, who: string) {
  const dm = f.dayMaster;
  const dmEl = STEM_ELEMENT[dm];
  const pillars = pillarsOf(f);
  b.ev(`${p}pillars`, `${who} 사주 원국`, `연주 ${f.pillars.year}, 월주 ${f.pillars.month}, 일주 ${f.pillars.day}, 시주 ${f.pillars.hour ?? '없음(시간 미상)'}`, 'R-PILLARS');
  b.ev(`${p}day_master`, `${who} 일간`, `${dm}(${ko(dm)}) · ${ELEMENT_KO[dmEl]}`, 'R-DAYMASTER');
  b.line(`${p}core`, `${who}의 일간은 ${dm}(읽는 법: ${ko(dm)})이고 ${ELEMENT_KO[dmEl]} 기운이에요. 사주 원국(네 기둥): ${pillars.map(([k, v]) => `${POS_STEM[k].slice(0, 1)}주 ${v}`).join(', ')}.${f.pillars.hour ? '' : ' 출생 시간을 몰라 시주는 없어요.'}`, [`${p}pillars`, `${p}day_master`], ['core', 'personality'], [dm, ko(dm) + ' 일간', f.pillars.day]);

  // 오행 균형
  const counts = f.fiveElements;
  const max = Math.max(...ELEMENTS.map((e) => counts[e])), min = Math.min(...ELEMENTS.map((e) => counts[e]));
  const dominant = ELEMENTS.filter((e) => counts[e] === max);
  const weak = ELEMENTS.filter((e) => counts[e] === min);
  const missing = ELEMENTS.filter((e) => counts[e] === 0);
  b.ev(`${p}elements`, `${who} 오행 분포`, ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${counts[e]}`).join(' · ') + ' (천간·지지 겉글자 기준, 지장간 제외)', 'R-ELEMENTS');
  b.line(`${p}balance`, `${who}의 오행 분포는 ${ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${counts[e]}`).join(', ')}예요. 가장 많은 기운은 ${dominant.map((e) => ELEMENT_KO[e]).join('·')}, 가장 적은 기운은 ${weak.map((e) => ELEMENT_KO[e]).join('·')}${missing.length ? ` (${missing.map((e) => ELEMENT_KO[e]).join('·')}은 없어요)` : ''}예요.`, [`${p}elements`], ['balance', 'personality', 'strength', 'advice'], [...dominant.map((e) => ELEMENT_KO[e].slice(0, 1)), ...weak.map((e) => ELEMENT_KO[e].slice(0, 1))]);

  // 십성 분포 (월지 가중 2배)
  const gods: { pos: Pos; kind: '천간' | '지지'; stem: Stem; god: TenGod; w: number }[] = [];
  for (const [pos, pil] of pillars) {
    if (pos !== 'day') gods.push({ pos, kind: '천간', stem: pil[0] as Stem, god: tenGod(dm, pil[0] as Stem), w: 1 });
    gods.push({ pos, kind: '지지', stem: BRANCH_MAIN_STEM[pil[1] as Branch], god: branchGod(dm, pil[1] as Branch), w: pos === 'month' ? 2 : 1 });
  }
  const groupScore: Record<Group, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  gods.forEach((g) => (groupScore[GROUP[g.god]] += g.w));
  b.ev(`${p}gods`, `${who} 십성 배치`, gods.map((g) => `${POS_STEM[g.pos].slice(0, 1)}${g.kind === '천간' ? '간' : '지'} ${g.stem}=${g.god}`).join(', ') + ' (지지는 본기 천간 기준, 월지 가중 2배)', 'R-TENGOD');
  const ranked = (Object.entries(groupScore) as [Group, number][]).sort((a, c) => c[1] - a[1]);
  const top = ranked.filter(([, v]) => v === ranked[0][1] && v > 0).map(([g]) => g);
  const absent = ranked.filter(([, v]) => v === 0).map(([g]) => g);
  b.line(`${p}gods`, `${who}의 십성 배치: ${gods.map((g) => `${POS_STEM[g.pos].slice(0, 1)}${g.kind === '천간' ? '간' : '지'} ${g.god}`).join(', ')}. 비중이 가장 큰 영역은 ${top.map((g) => `${g}(${GROUP_MEANING[g]})`).join(', ')}${absent.length ? `, 드러나지 않는 영역은 ${absent.join('·')}` : ''}이에요.`, [`${p}gods`], ['personality', 'strength', 'career', 'money', 'relationship'], [...new Set(gods.map((g) => g.god))]);

  // 월간 십성 → 사회적 모습
  const monthGod = tenGod(dm, f.pillars.month[0] as Stem);
  b.line(`${p}month_stem`, `${who}의 월간은 일간 기준 ${monthGod}으로, 사회적인 모습에서 ${GOD_TRAIT[monthGod]}이 자주 드러나는 편이에요.`, [`${p}gods`], ['personality', 'career', 'strength'], [monthGod, '월간']);

  // 자기 힘 vs 바깥 힘 (신강/신약 근사)
  const self = groupScore.비겁 + groupScore.인성, other = groupScore.식상 + groupScore.재성 + groupScore.관성;
  const label = self >= other * 1.3 ? '자기 힘(나를 지키는 기운)이 센 편' : other >= self * 1.3 ? '바깥 힘(표현·재물·책임)이 센 편' : '자기 힘과 바깥 힘이 비교적 균형';
  b.ev(`${p}power`, `${who} 자기 힘 vs 바깥 힘`, `비겁+인성 ${self} / 식상+재성+관성 ${other} (월지 2배 가중 · 신강/신약의 단순 근사)`, 'R-POWER');
  b.line(`${p}power`, `${topic(who)} ${label}이에요. (비겁+인성 ${self} 대 식상+재성+관성 ${other}. 전통 신강·신약의 단순 근사이므로 단정 표현은 피해요.)`, [`${p}power`], ['personality', 'strength', 'career', 'money', 'advice'], [self >= other * 1.3 ? '자기 힘' : other >= self * 1.3 ? '바깥 힘' : '균형']);

  // 계절(월령)
  const mb = f.pillars.month[1] as Branch;
  const se = SEASON[mb];
  const supported = se.element === dmEl || (se.element !== 'earth' && PRODUCES[se.element] === dmEl) || (se.element === 'earth' && (dmEl === 'earth' || PRODUCES.earth === dmEl));
  b.ev(`${p}season`, `${who} 태어난 계절`, `월지 ${mb}(${bko(mb)}) → ${se.name}`, 'R-SEASON');
  b.line(`${p}season`, `${topic(who)} ${se.name}(월지 ${mb})에 태어났고, 이 계절의 기운은 일간의 ${ELEMENT_KO[dmEl]} 기운을 ${supported ? '도와주는 편' : '도와주지 않는 편'}이에요.`, [`${p}season`], ['personality', 'balance', 'advice'], [se.name.slice(0, 2), mb]);

  // 원국 안의 합충
  const rel: string[] = [];
  const keys = pillars.map(([k]) => k);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = pillars[i], c = pillars[j];
    if (STEM_COMBINE.some(([x, y]) => (x === a[1][0] && y === c[1][0]) || (y === a[1][0] && x === c[1][0]))) rel.push(`${POS_STEM[a[0]]}(${a[1][0]})과 ${POS_STEM[c[0]]}(${c[1][0]})은 천간합`);
    const br = branchRelation(a[1][1] as Branch, c[1][1] as Branch);
    if (br !== '없음') rel.push(`${POS_BRANCH[a[0]]}(${a[1][1]})와 ${POS_BRANCH[c[0]]}(${c[1][1]})는 ${br}`);
  }
  b.ev(`${p}relations`, `${who} 원국 안의 합충`, rel.length ? rel.join(', ') : '뚜렷한 합·충 없음', 'R-RELATIONS');
  b.line(`${p}relations`, rel.length ? `${who}의 원국에서 보이는 합·충: ${rel.join('; ')}.` : `${who}의 원국에는 천간합·육합·충이 뚜렷하게 보이지 않아요.`, [`${p}relations`], ['relations', 'personality', 'relationship', 'love'], rel.length ? ['합', '충'].filter((w) => rel.join().includes(w)) : ['합충 없음']);

  return { dmEl, monthGod };
}

/** 연애 관련: 일지(배우자궁), 이성 인연 별 */
function loveLines(b: Builder, f: SajuFacts, gender?: 'F' | 'M' | 'X') {
  const dm = f.dayMaster;
  const db = f.pillars.day[1] as Branch;
  const palaceGod = branchGod(dm, db);
  b.ev('love_palace', '일지(배우자궁)', `일지 ${db}(${bko(db)}) 본기 ${BRANCH_MAIN_STEM[db]} → 일간 ${dm} 기준 ${palaceGod}`, 'R-LOVE-PALACE');
  b.line('love_palace', `일지(배우자궁) ${db}의 본기는 일간 기준 ${palaceGod}이에요. 그래서 관계에서 ${GOD_LOVE[palaceGod]}.`, ['love_palace'], ['love', 'relationship'], [palaceGod, '일지']);

  const all: TenGod[] = [];
  for (const [pos, pil] of pillarsOf(f)) { if (pos !== 'day') all.push(tenGod(dm, pil[0] as Stem)); all.push(branchGod(dm, pil[1] as Branch)); }
  const cnt = (g: Group) => all.filter((x) => GROUP[x] === g).length;
  const jae = cnt('재성'), gwan = cnt('관성'), sik = cnt('식상'), inn = cnt('인성');
  const star = gender === 'F' ? `관성 ${gwan}개(전통적으로 여성의 이성·결혼 인연을 보는 별)` : gender === 'M' ? `재성 ${jae}개(전통적으로 남성의 이성·결혼 인연을 보는 별)` : `재성 ${jae}개와 관성 ${gwan}개(성별 미입력이라 두 별을 함께 봐요)`;
  b.ev('love_stars', '이성 인연 별', `재성 ${jae}, 관성 ${gwan}, 식상 ${sik}, 인성 ${inn} (원국 겉글자·지지 본기 기준)`, 'R-LOVE-STARS');
  b.line('love_stars', `원국에서 ${star}가 보이고, 표현을 담당하는 식상은 ${sik}개, 정서적 지지를 뜻하는 인성은 ${inn}개예요.`, ['love_stars'], ['love', 'relationship', 'strength'], ['재성', '관성', '식상']);
  const dayRel = pillarsOf(f).filter(([k]) => k !== 'day').map(([k, v]) => [k, branchRelation(db, v[1] as Branch)] as const).filter(([, r]) => r !== '없음');
  b.line('love_relations', dayRel.length ? `일지 ${db}는 ${dayRel.map(([k, r]) => `${POS_BRANCH[k]}와 ${r}`).join(', ')} 관계예요. 배우자궁이 다른 자리와 부딪히거나 묶이는 구조라 관계에서 그 영향이 드러나기 쉬워요.` : `일지 ${db}는 원국의 다른 지지와 합·충이 없어 배우자궁이 비교적 조용한 편이에요.`, ['love_palace'], ['love', 'relationship'], dayRel.length ? ['일지', ...dayRel.map(([, r]) => r)] : ['일지']);
}

export interface BuildOptions { gender?: 'F' | 'M' | 'X'; years?: number[]; yearPillar?: (year: number) => string }

export function buildInterpretation(product: 'basic' | 'love_deep', f: SajuFacts, opts: BuildOptions = {}): InterpretationFacts {
  const b = new Builder();
  personLines(b, f, '', '나');
  if (product === 'love_deep') loveLines(b, f, opts.gender);
  const limits = f.warnings.filter((w) => ['hour_pillar_unavailable', 'luck_cycles_unavailable', 'term_boundary_unverified', 'engine_unverified'].includes(w));
  const allowed = new Set<string>(pillarsOf(f).map(([, v]) => v));

  if (product === 'love_deep') {
    const years = opts.years ?? [];
    const yp = opts.yearPillar;
    if (!yp) throw new Error('yearPillar 함수가 필요해요');
    const db = f.pillars.day[1] as Branch, mb = f.pillars.month[1] as Branch;
    for (const y of years) {
      const p = yp(y); allowed.add(p);
      const sg = tenGod(f.dayMaster, p[0] as Stem), bg = branchGod(f.dayMaster, p[1] as Branch);
      const toDay = branchRelation(p[1] as Branch, db), toMonth = branchRelation(p[1] as Branch, mb);
      b.ev(`year_${y}`, `${y}년 세운`, `${p}(${ko(p[0] as Stem)}${bko(p[1] as Branch)}) → 천간 ${sg}, 지지 ${bg}, 일지와 ${toDay}, 월지와 ${toMonth}. 연도 경계는 입춘 기준(샘플 엔진은 근사).`, 'R-YEARLY');
      const hint = [toDay !== '없음' ? `일지(배우자궁)와 ${toDay}이라 관계 영역이 움직이기 쉬워요` : '일지와는 합·충이 없어 비교적 잔잔해요', toMonth !== '없음' ? `월지와도 ${toMonth}이라 사회적인 환경 변화가 함께 와요` : ''].filter(Boolean).join('. ');
      b.line(`year_${y}`, `${y}년은 ${p}해예요. 천간은 일간 기준 ${sg}(${GOD_TRAIT[sg]}), 지지는 ${bg}이에요. ${hint}.`, [`year_${y}`], ['yearly', 'love', `year:${y}`], [`${y}년`, p, sg]);
    }
    if (!f.luckCycles.length) b.line('luck_missing', '대운(10년 단위 큰 흐름)은 아직 검증된 계산이 없어요. 대운의 간지·시작 나이를 지어내지 말고, 계산 전이라는 점과 세운 중심으로 읽는다는 점만 솔직하게 안내하세요.', [], ['luck', 'limits'], ['대운']);
  }
  return {
    version: INTERPRETATION_VERSION, product, subjects: [subjectOf(f, 'ME')], lines: b.lines, evidence: b.evidence,
    allowedGanji: [...allowed], years: opts.years, limits,
  };
}

/** 궁합: 두 사람 사실 + 관계 사실. 상대 실명·생년월일은 전달하지 않고 원국 간지만 쓴다. */
export function buildCompatInterpretation(a: SajuFacts, bFacts: SajuFacts): InterpretationFacts {
  const b = new Builder();
  personLines(b, a, 'a_', '나');
  personLines(b, bFacts, 'b_', '상대');
  const da = a.dayMaster, db = bFacts.dayMaster;
  const ea = STEM_ELEMENT[da], eb = STEM_ELEMENT[db];
  const rel = elementRelation(ea, eb);
  b.ev('dm_rel', '일간 오행 관계', `${da}(${ELEMENT_KO[ea]}) → ${db}(${ELEMENT_KO[eb]}): ${rel}`, 'R-COMPAT-DM');
  b.line('dm_rel', `나의 일간 ${da}(${ELEMENT_KO[ea]})와 상대의 일간 ${db}(${ELEMENT_KO[eb]})의 오행 관계는 "${rel}"이에요. 나 기준 상대는 ${tenGod(da, db)}, 상대 기준 나는 ${tenGod(db, da)}이에요.`, ['dm_rel'], ['compat_core', 'communication', 'love'], [rel, tenGod(da, db), tenGod(db, da)]);
  if (STEM_COMBINE.some(([x, y]) => (x === da && y === db) || (y === da && x === db))) b.line('dm_combine', `두 사람의 일간 ${da}와 ${db}는 천간합(서로 끌어당겨 하나로 묶이는 관계)이에요.`, ['dm_rel'], ['compat_core', 'love'], ['천간합']);
  const bd = a.pillars.day[1] as Branch, bb = bFacts.pillars.day[1] as Branch;
  const br = branchRelation(bd, bb);
  b.ev('branch_rel', '일지 관계', `${bd} ↔ ${bb}: ${br}`, 'R-COMPAT-BRANCH');
  b.line('branch_rel', `두 사람의 일지(배우자궁)는 ${bd}와 ${bb}로 "${br === '없음' ? '합도 충도 없는 관계' : br}"예요.${br === '충' ? ' 부딪히는 구조라 속도·방식 차이를 조율하는 게 중요해요.' : br === '육합' ? ' 서로 묶이는 구조라 정서적으로 가까워지기 쉬워요.' : ''}`, ['branch_rel'], ['compat_core', 'conflict', 'affection'], [br === '없음' ? '합도 충도' : br, bd, bb]);
  const mA = a.pillars.month[1] as Branch, mB = bFacts.pillars.month[1] as Branch;
  const mr = branchRelation(mA, mB);
  b.ev('month_rel', '월지 관계', `${mA} ↔ ${mB}: ${mr}`, 'R-COMPAT-MONTH');
  b.line('month_rel', `두 사람의 월지는 ${mA}와 ${mB}로 "${mr === '없음' ? '합도 충도 없는 관계' : mr}"이에요. 생활 환경과 사회적 리듬이 ${mr === '충' ? '엇갈리기 쉬워요' : mr === '육합' ? '잘 맞물리기 쉬워요' : '크게 부딪히거나 묶이지 않아요'}.`, ['month_rel'], ['lifestyle', 'conflict'], ['월지', mA, mB]);
  const cnt = (f: SajuFacts) => f.fiveElements;
  const need = (x: SajuFacts, y: SajuFacts) => ELEMENTS.filter((e) => cnt(x)[e] <= 1 && cnt(y)[e] >= 2);
  const aGets = need(a, bFacts), bGets = need(bFacts, a);
  b.ev('complement', '오행 보완', `나에게 부족한 기운을 상대가 채움: ${aGets.map((e) => ELEMENT_KO[e]).join('·') || '없음'} / 상대에게 부족한 기운을 내가 채움: ${bGets.map((e) => ELEMENT_KO[e]).join('·') || '없음'}`, 'R-COMPAT-COMPLEMENT');
  b.line('complement', `오행 보완을 보면, 상대는 나에게 ${aGets.map((e) => ELEMENT_KO[e]).join('·') || '뚜렷하게 채워 주는 기운이 없고'}${aGets.length ? ' 기운을 채워 주고' : ''}, 나는 상대에게 ${bGets.map((e) => ELEMENT_KO[e]).join('·') || '뚜렷하게 채워 주는 기운이 없어요'}${bGets.length ? ' 기운을 채워 줘요' : ''}.`, ['complement'], ['lifestyle', 'communication', 'affection'], [...aGets, ...bGets].map((e) => ELEMENT_KO[e].slice(0, 1)).concat(['오행 보완']));
  b.line('a_love', `나의 일지 십성은 ${branchGod(da, bd)}으로, 관계에서 ${GOD_LOVE[branchGod(da, bd)]}.`, ['a_day_master'], ['affection', 'love'], [branchGod(da, bd)]);
  b.line('b_love', `상대의 일지 십성은 ${branchGod(db, bb)}으로, 관계에서 ${GOD_LOVE[branchGod(db, bb)]}.`, ['b_day_master'], ['affection', 'love'], [branchGod(db, bb)]);
  const allowed = new Set([...pillarsOf(a).map(([, v]) => v), ...pillarsOf(bFacts).map(([, v]) => v)]);
  const limits = [...new Set([...a.warnings, ...bFacts.warnings])].filter((w) => ['hour_pillar_unavailable', 'term_boundary_unverified', 'engine_unverified'].includes(w));
  return { version: INTERPRETATION_VERSION, product: 'compatibility', subjects: [subjectOf(a, 'A'), subjectOf(bFacts, 'B')], lines: b.lines, evidence: b.evidence, allowedGanji: [...allowed], limits };
}

export const productKey = (p: string): p is ProductKey => p === 'basic' || p === 'love_deep' || p === 'compatibility';
