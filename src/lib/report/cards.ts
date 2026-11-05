/**
 * 판단 카드: R-002~R-005 결정론 엔진(engine/saju-rules)의 결과를 AI 가 읽는 "사실 줄 + 해석 명제"로 바꾼다.
 * - 사실 줄(FactLine): 계산된 사실만. 해석 없음.
 * - 해석 명제(Claim): 사실이 일상에서 어떻게 드러나는지 쉬운 말로 쓴 **초안 문장**(전문가 승인 전 DRAFT).
 * - 후보(candidate)·잠정(provisional) 결과는 "~로 볼 여지가 있어요" 처럼 조건부로만 쓰고, 한계를 함께 붙인다.
 * - 신강신약·격국·용신은 만들지 않는다(R-006 이후 미구현).
 */
import type { Element } from '../saju/types';
import { BRANCHES, GROUP_OF, relationOf, STATIC_HIDDEN, STEMS, type Branch, type GodGroup, type Grade, type Position, type R002to005, type StructureKind } from '../../../engine/saju-rules/src';
import type { Claim, EvidenceItem, FactLine } from './types';

export const CARDS_VERSION = 'cards-0.3.0-draft';

const EL: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const SEASON: Record<string, string> = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const POS: Record<Position, string> = { year: '태어난 해', month: '태어난 달', day: '태어난 날', hour: '태어난 시' };
const STEM_EL: Record<string, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
const GRADE_KO: Record<string, string> = { 旺: '같은 기운(계절과 내가 같음)', 相: '계절이 나를 길러 줌', 休: '내가 계절 쪽으로 힘을 내보냄', 囚: '내가 계절의 기운을 다뤄야 함', 死: '계절이 나를 누름' };

const draft = (c: Omit<Claim, 'status'>): Claim => ({ status: 'DRAFT', ...c });

/**
 * 카드 문장 원본(검토표의 단일 출처). 사람이 고칠 곳은 여기뿐이다.
 * - {나의기운}·{계절기운} 은 코드가 나무·불·흙·쇠·물 중 하나로 채운다.
 * - 모든 문장은 DRAFT(전문가 승인 전). 검토표: docs/saju-engine/CARD_TEXT_REVIEW.md (scripts/dump-card-catalog.ts 로 생성)
 */
export const CARD_TEXT = {
  season: {
    thesis: {
      旺: '태어난 계절의 기운이 나의 {나의기운} 기운과 같아, 계절의 도움을 직접 받는 편이에요',
      相: '태어난 계절의 {계절기운} 기운이 나의 {나의기운} 기운을 길러 주는 쪽이에요',
      休: '나의 {나의기운} 기운이 태어난 계절의 {계절기운} 기운 쪽으로 흘러 나가는 관계라, 계절의 도움보다는 내 힘을 밖으로 쓰는 쪽이에요',
      囚: '나의 {나의기운} 기운이 태어난 계절의 {계절기운} 기운을 다뤄야 하는 관계라, 계절을 상대하느라 힘을 쓰는 쪽이에요',
      死: '태어난 계절의 {계절기운} 기운이 나의 {나의기운} 기운을 누르는 관계라, 계절의 도움은 받기 어려운 쪽이에요',
    } as Record<Grade, string>,
    provisionalSuffix: '. 다만 환절기라 이 판단은 잠정이에요',
    condition: '새 환경에 들어가거나 생활 리듬을 정할 때',
    limitation: '계절의 도움은 여러 근거 중 하나일 뿐이며, 강하다·약하다는 뜻이 아니에요',
  },
  root: {
    present: '나와 같은 기운이 땅 쪽에도 자리 잡고 있어, 타고난 바탕이 받쳐 주는 편이에요',
    dayBranchSuffix: '. 특히 나 자신을 뜻하는 자리에도 있어요',
    absent: '나와 같은 기운이 땅 쪽에는 보이지 않아, 내 힘의 바탕은 계절이나 곁에 드러난 기운 쪽에서 찾게 돼요',
    condition: '혼자 버텨야 하거나 기댈 곳이 필요할 때',
    limitation: '뿌리가 있고 없음이나 그 개수만으로 힘의 세기를 정하지 않아요',
  },
  role: {
    비겁: { key: 'peer', fact: '나와 같은 기운이', text: '곁에 나와 같은 기운이 있어, 함께하는 사람과 힘을 나누기도 하고 견주기도 하는 편이에요', condition: '함께 일하거나 경쟁이 있는 자리에서', tags: ['personality', 'relationship', 'strength'], anchors: ['같은 기운'] },
    인성: { key: 'resource', fact: '나를 길러 주는 기운이', text: '나를 길러 주는 기운이 곁에 있어, 배우고 도움을 받아들이며 힘을 얻는 편이에요', condition: '새로운 것을 익히거나 지칠 때', tags: ['strength', 'advice', 'personality'], anchors: ['길러', '배우'] },
    식상: { key: 'output', fact: '내가 길러 내는 기운이', text: '내가 길러 내는 기운이 곁에 있어, 생각과 재능을 밖으로 꺼내는 쪽에 힘을 쓰는 편이에요', condition: '말·글·결과물로 보여 줄 기회가 있을 때', tags: ['personality', 'strength', 'career'], anchors: ['표현', '꺼내'] },
    재성: { key: 'wealth', fact: '내가 다루는 기운이', text: '내가 다루는 기운이 곁에 있어, 현실적인 일과 자원(시간·돈)을 관리하는 데 힘을 쓰는 편이에요', condition: '일정·돈·결과를 챙겨야 할 때', tags: ['career', 'money'], anchors: ['관리', '현실'] },
    관살: { key: 'officer', fact: '나를 다스리는 기운이', text: '나를 다스리는 기운이 곁에 있어, 규칙·책임·주변의 기대를 의식하는 편이에요', condition: '역할과 기준이 분명한 자리에서', tags: ['career', 'relationship'], anchors: ['책임', '규칙'] },
  } as Record<GodGroup, { key: string; fact: string; text: string; condition: string; tags: string[]; anchors: string[] }>,
  roleLimitation: '드러난 글자를 기준으로 한 것이며, 실제 힘의 크기는 판단하지 않았어요',
  workAbsent: {
    text: '곁에 드러난 기운이 나와 같은 기운이나 나를 길러 주는 기운 쪽이라, 일과 돈도 함께하는 사람이나 배운 것을 바탕으로 풀어 가는 쪽으로 볼 여지가 있어요',
    condition: '일하는 방식을 스스로 정해야 할 때',
    limitation: '드러난 글자만 본 것이며 땅 속 글자까지 보면 달라질 수 있어요',
  },
  struct: {
    wealth_controls_resource: { text: '현실적인 일을 챙기다 보면 배우거나 쉬는 시간이 뒤로 밀릴 여지가 있어요', tags: ['career', 'advice'] },
    officer_generates_resource: { text: '맡은 책임이 배움과 성장으로 이어지는 흐름으로 볼 여지가 있어요', tags: ['career', 'strength'] },
    output_controls_officer: { text: '표현하고 싶은 마음이 규칙·책임과 부딪히기도 하고, 반대로 규칙을 더 낫게 다듬는 힘이 될 여지도 있어요', tags: ['personality', 'career', 'relationship'] },
    output_generates_wealth: { text: '재능과 표현이 현실적인 결과물로 이어지는 흐름으로 볼 여지가 있어요', tags: ['strength', 'career', 'money'] },
    peer_controls_wealth: { text: '내 방식이 강하게 나올 때 돈·시간 관리와 부딪힐 여지가 있어요', tags: ['money', 'advice'] },
  } as Record<StructureKind, { text: string; tags: string[] }>,
  structCondition: '두 가지 일이 동시에 몰릴 때',
  structLimitation: '배치가 있다는 뜻일 뿐, 실제로 그렇게 작용하는지는 아직 판단하지 않았어요',
  combine: {
    text: '서로 끌리는 짝을 이루는 기운이 보여, 어떤 일이나 관계에 한번 마음을 주면 오래 붙드는 장면이 생길 여지가 있어요',
    condition: '가까운 관계나 오래 붙드는 일이 있을 때',
    limitation: '짝이 있다는 사실일 뿐, 실제로 작용하는지는 판단하지 않았어요',
  },
  /** 지지 충·육합(기존 명제를 쉬운 말로 바꿔 씀, interpretation.ts 에서 사용) */
  branchPairs: {
    /** 부딪히는 짝만 */
    clash: '땅 쪽 자리끼리 서로 부딪히는 짝이 있어, 해당 자리와 관련된 일이나 관계에서 변화나 엇갈림이 생길 여지가 있어요',
    /** 묶이는 짝만 */
    bind: '땅 쪽 자리끼리 서로 묶이는 짝이 있어, 해당 자리와 관련된 일이나 관계가 서로 붙들고 이어지는 장면이 생길 여지가 있어요',
    /** 둘 다 */
    present: '땅 쪽 자리끼리 부딪히는 짝과 묶이는 짝이 함께 있어, 해당 자리와 관련된 일이나 관계에서 밀고 당기는 장면이 생길 여지가 있어요',
    absent: '땅 쪽 자리끼리 부딪히거나 묶이는 짝이 뚜렷하지 않아, 이 부분에서 따로 짚을 흐름은 적은 편이에요',
    presentCondition: '관련된 자리의 주제가 이슈가 될 때',
    absentCondition: '변화가 적은 안정적인 시기에',
    limitation: '짝이 있다는 사실일 뿐, 실제로 작용하는지와 그 세기는 판단하지 않았어요',
    absentLimitation: '눈에 띄는 짝이 없다는 뜻일 뿐, 삶에 변화가 적다는 뜻은 아니에요',
  },
  /** 연애운 전용(태어난 날의 땅 쪽 글자 = 가까운 관계의 자리로 보는 전통 방식) */
  love: {
    palace: {
      비겁: '가까운 관계를 뜻하는 자리에 나와 같은 기운이 있어, 관계에서도 대등함과 내 방식을 중요하게 여기는 편이에요',
      인성: '가까운 관계를 뜻하는 자리에 나를 길러 주는 기운이 있어, 관계에서 돌봄과 안정감을 주고받는 것을 중요하게 여기는 편이에요',
      식상: '가까운 관계를 뜻하는 자리에 내가 길러 내는 기운이 있어, 관계에서 마음을 표현하고 함께 즐기는 것을 중요하게 여기는 편이에요',
      재성: '가까운 관계를 뜻하는 자리에 내가 다루는 기운이 있어, 관계에서도 현실적인 계획과 생활을 함께 챙기는 편이에요',
      관살: '가까운 관계를 뜻하는 자리에 나를 다스리는 기운이 있어, 관계에서 약속과 책임을 중요하게 여기는 편이에요',
    } as Record<GodGroup, string>,
    palaceCondition: '가까운 관계에서 편안함을 느끼는 조건을 볼 때',
    palaceLimitation: '한 자리만 본 것이며, 상대의 모습이나 연애·결혼 여부를 정하지 않아요',
    star: {
      present: '인연을 볼 때 전통적으로 살피는 기운이 겉으로 드러나 있어, 관계라는 주제가 삶에서 자주 떠오르는 편으로 볼 여지가 있어요',
      absent: '인연을 볼 때 전통적으로 살피는 기운이 겉으로는 드러나 있지 않아, 인연이 스스로 만드는 환경과 선택에 따라 달라지는 편으로 볼 여지가 있어요',
    },
    starCondition: '관계가 시작되는 환경을 볼 때',
    starLimitation: '성별에 따라 살피는 기운을 나누는 전통 방식일 뿐, 연애 상대의 성별이나 인연의 많고 적음, 결혼 여부를 정하지 않아요',
    pairs: {
      clash: '가까운 관계를 뜻하는 자리가 다른 자리와 부딪히는 짝을 이루어, 관계에서 생활 변화나 엇갈림을 조율할 일이 생길 여지가 있어요',
      bind: '가까운 관계를 뜻하는 자리가 다른 자리와 묶이는 짝을 이루어, 관계가 가족·일 같은 다른 생활 영역과 엮여 움직일 여지가 있어요',
      both: '가까운 관계를 뜻하는 자리에 부딪히는 짝과 묶이는 짝이 함께 있어, 관계에서 당기고 밀리는 흐름이 함께 나타날 여지가 있어요',
      none: '가까운 관계를 뜻하는 자리와 부딪히거나 묶이는 짝이 뚜렷하지 않아, 이 부분에서 따로 짚을 흐름은 적은 편이에요',
    },
    pairsCondition: '관계와 다른 생활 영역이 함께 바쁠 때',
    pairsLimitation: '짝이 있다는 사실일 뿐, 실제로 작용하는지와 그 세기는 판단하지 않았어요',
    pairsNoneLimitation: '눈에 띄는 짝이 없다는 뜻일 뿐, 관계가 순탄하다는 뜻은 아니에요',
    year: {
      비겁: '{해}년은 나와 같은 기운이 들어오는 해라, 내 방식과 주변 사람과의 관계가 함께 눈에 띄기 쉬운 해로 볼 여지가 있어요',
      인성: '{해}년은 나를 길러 주는 기운이 들어오는 해라, 배움과 돌봄, 마음을 추스르는 일이 눈에 띄기 쉬운 해로 볼 여지가 있어요',
      식상: '{해}년은 내가 길러 내는 기운이 들어오는 해라, 마음을 표현하고 새로 시도하는 일이 눈에 띄기 쉬운 해로 볼 여지가 있어요',
      재성: '{해}년은 내가 다루는 기운이 들어오는 해라, 현실적인 계획과 생활을 챙기는 일이 눈에 띄기 쉬운 해로 볼 여지가 있어요',
      관살: '{해}년은 나를 다스리는 기운이 들어오는 해라, 약속과 책임, 관계의 기준이 눈에 띄기 쉬운 해로 볼 여지가 있어요',
    } as Record<GodGroup, string>,
    yearClash: '. 그해의 땅 쪽 글자가 가까운 관계를 뜻하는 자리와 부딪히는 짝이라, 관계에서 변화나 조율이 필요한 일이 생길 여지도 있어요',
    yearBind: '. 그해의 땅 쪽 글자가 가까운 관계를 뜻하는 자리와 묶이는 짝이라, 관계가 가까워지거나 엮이는 일이 생길 여지도 있어요',
    yearCondition: '그해 입춘(양력 2월 4일 무렵)부터 다음 해 입춘 전까지',
    yearLimitation: '한 해의 흐름을 보는 참고일 뿐, 만남·결혼·이별 같은 일을 예언하지 않아요',
    luck: {
      text: '10년 단위의 큰 흐름은 해석 기준이 아직 검증되지 않아 이번 풀이에서는 다루지 않고, 한 해씩의 흐름으로 봐요',
      condition: '긴 흐름이 궁금할 때',
      limitation: '검증이 끝나면 따로 안내해요',
    },
  },
};
const ROLE_CARD = CARD_TEXT.role;
const STRUCT_CARD = CARD_TEXT.struct;
/** {나의기운}·{계절기운}·{해} 자리표시를 채운다 */
export const fillCard = (t: string, v: Record<string, string>) => t.replace(/\{([^}]+)\}/g, (m, k: string) => v[k] ?? m);

export interface CardSet { lines: FactLine[]; claims: Claim[]; evidence: EvidenceItem[] }

/** R-002~R-005 결과 → 사실 줄·해석 명제. 일간의 오행 이름은 쉬운 말(나무·불·흙·쇠·물)로만 쓴다. */
export function buildRuleCards(r: R002to005): CardSet {
  const lines: FactLine[] = [];
  const claims: Claim[] = [];
  const evidence: EvidenceItem[] = [];
  const ev = (id: string, label: string, detail: string, ruleId: string) => { evidence.push({ id, label, detail, ruleId }); return id; };
  const blocked = [r.r002, r.r004, r.r005].some((x) => x.status === 'blocked');
  if (blocked || !r.r005.dayStem) return { lines, claims, evidence };
  const me = EL[STEM_EL[r.r005.dayStem]!];

  // ── R-002 계절 ──
  const g = r.r002;
  if (g.seasonal_grade && g.monthElement && g.season) {
    const seasonName = g.season === 'transition' ? `환절기(${g.transition_trait ?? '계절이 바뀌는 때'})` : SEASON[g.season]!;
    const provisional = g.grade_status === 'provisional';
    const e = ev('card_season', '태어난 계절', `${seasonName}, 계절 기운 ${EL[g.monthElement]}, 내 기운 ${me}, 관계: ${GRADE_KO[g.seasonal_grade]}${provisional ? ' (잠정)' : ''}`, 'SJ-R002');
    lines.push({ id: 'card_season', text: `태어난 달의 계절은 ${seasonName}이고 그 계절의 기운은 ${EL[g.monthElement]}, 나의 기운은 ${me}이에요. 둘의 관계는 "${GRADE_KO[g.seasonal_grade]}"이고, 넓은 의미의 계절 도움은 ${g.deukryeong_broad ? '있어요' : '없어요'}.${provisional ? ' 환절기라 이 판단은 잠정이에요.' : ''}`, evidenceIds: [e], tags: ['core', 'balance', 'personality'], anchors: [seasonName.slice(0, 2), '계절'] });
    const T = CARD_TEXT.season;
    const base = fillCard(T.thesis[g.seasonal_grade], { 나의기운: me, 계절기운: EL[g.monthElement] });
    claims.push(draft({
      id: 'C-card-season', domain: 'balance', semanticKey: 'season_relation',
      stance: provisional ? 'CONTEXTUAL' : g.seasonal_grade === '旺' || g.seasonal_grade === '相' ? 'HIGH' : g.seasonal_grade === '休' ? 'CONTEXTUAL' : 'LOW',
      thesis: provisional ? base + T.provisionalSuffix : base,
      factIds: ['card_season'], counterFactIds: [], ruleId: 'SJ-R002-SEASON',
      condition: T.condition, limitation: T.limitation,
      salience: 4, tags: ['core', 'balance', 'personality', 'advice'], anchors: ['계절'],
    }));
  }

  // ── R-004 뿌리(일간) ──
  const day = r.r004.stems.find((s) => s.position === 'day');
  if (day) {
    const places = [...new Set(day.roots.map((x) => POS[x.branchPosition]))];
    const e = ev('card_root', '나와 같은 기운의 뿌리', day.hasStructuralRoot ? `${places.join('·')} 자리의 땅(지지) 속에 나와 같은 기운이 있음` : '네 자리의 땅(지지) 속에 나와 같은 기운이 없음', 'SJ-R004');
    lines.push({ id: 'card_root', text: day.hasStructuralRoot ? `나와 같은 ${me} 기운이 ${places.join('·')} 자리의 땅 속에도 있어요(${day.roots.length}군데, 같은 자리의 중복은 하나로 봄).${day.day_branch_rooted ? ' 나 자신을 뜻하는 태어난 날 자리에도 있어요.' : ''}` : `나와 같은 ${me} 기운이 네 자리의 땅 속에는 보이지 않아요.`, evidenceIds: [e], tags: ['core', 'personality', 'strength'], anchors: ['바탕', '뿌리'] });
    claims.push(draft({
      id: 'C-card-root', domain: 'personality', semanticKey: 'own_root', stance: day.hasStructuralRoot ? 'HIGH' : 'LOW',
      thesis: day.hasStructuralRoot ? CARD_TEXT.root.present + (day.day_branch_rooted ? CARD_TEXT.root.dayBranchSuffix : '') : CARD_TEXT.root.absent,
      factIds: ['card_root'], counterFactIds: [], ruleId: 'SJ-R004-ROOT',
      condition: CARD_TEXT.root.condition, limitation: CARD_TEXT.root.limitation,
      salience: 4, tags: ['core', 'personality', 'strength'], anchors: ['바탕', '뿌리'],
    }));
  }

  // ── R-005 곁에 드러난 기운(천간) ──
  const groups = [...new Set(r.r005.relations.map((x) => x.group))];
  for (const grp of groups) {
    const card = ROLE_CARD[grp];
    const at = r.r005.relations.filter((x) => x.group === grp).map((x) => POS[x.position]);
    const id = `card_role_${card.key}`;
    const e = ev(id, `곁의 기운: ${card.key}`, `${at.join('·')} 자리`, 'SJ-R005');
    lines.push({ id, text: `${at.join('·')} 자리에 ${card.fact} 있어요(드러난 글자 기준).`, evidenceIds: [e], tags: card.tags, anchors: card.anchors });
    claims.push(draft({
      id: `C-card-role-${card.key}`, domain: card.tags[0]!, semanticKey: `role_${card.key}`, stance: at.length >= 2 ? 'HIGH' : 'CONTEXTUAL',
      thesis: card.text, factIds: [id], counterFactIds: [], ruleId: `SJ-R005-ROLE-${card.key.toUpperCase()}`,
      condition: card.condition, limitation: CARD_TEXT.roleLimitation,
      salience: 3, tags: card.tags, anchors: card.anchors,
    }));
  }
  const workGroups: GodGroup[] = ['식상', '재성', '관살'];
  if (!groups.some((x) => workGroups.includes(x))) {
    const e = ev('card_work_absent', '일·돈과 연결되는 기운', '드러난 글자에 표현·관리·책임 쪽 기운이 없음', 'SJ-R005');
    lines.push({ id: 'card_work_absent', text: '드러난 글자 중에는 표현·현실 관리·책임과 연결되는 기운이 보이지 않아요(땅 속 글자는 보지 않았어요).', evidenceIds: [e], tags: ['career', 'money'], anchors: ['드러난'] });
    claims.push(draft({
      id: 'C-card-work-absent', domain: 'career', semanticKey: 'work_roles_absent', stance: 'LOW',
      thesis: CARD_TEXT.workAbsent.text,
      factIds: ['card_work_absent'], counterFactIds: [], ruleId: 'SJ-R005-WORK-ABSENT',
      condition: CARD_TEXT.workAbsent.condition, limitation: CARD_TEXT.workAbsent.limitation,
      salience: 2, tags: ['career', 'money'], anchors: ['상황'],
    }));
  }

  // ── R-005 구조 후보(성립 미판단) ──
  r.r005.structures.forEach((s, i) => {
    const card = STRUCT_CARD[s.kind];
    const id = `card_struct_${i}`;
    const e = ev(id, '구조 후보', `${POS[s.from]} 자리 → ${POS[s.to]} 자리 (${s.kind}, 성립 미판단)`, 'SJ-R005');
    lines.push({ id, text: `${POS[s.from]} 자리의 기운이 ${POS[s.to]} 자리의 기운에 작용할 수 있는 배치가 있어요. 실제로 작용하는지는 판단하지 않았어요(후보).`, evidenceIds: [e], tags: card.tags, anchors: ['여지'] });
    claims.push(draft({
      id: `C-card-struct-${i}`, domain: card.tags[0]!, semanticKey: `struct_${s.kind}`, stance: 'CONTEXTUAL', thesis: card.text,
      factIds: [id], counterFactIds: [], ruleId: `SJ-R005-STRUCT-${s.kind.toUpperCase()}`,
      condition: CARD_TEXT.structCondition, limitation: CARD_TEXT.structLimitation,
      salience: 2, tags: card.tags, anchors: ['여지'],
    }));
  });

  // ── R-005 서로 끌리는 짝(간합 후보) ──
  r.r005.combinations.forEach((c, i) => {
    const id = `card_combine_${i}`;
    const e = ev(id, '서로 끌리는 짝', `${POS[c.pair[0]]}·${POS[c.pair[1]]} 자리${c.adjacent ? '(붙어 있음)' : ''}${c.competing.length ? ', 다투는 글자 있음' : ''}, 작용 미판단`, 'SJ-R005');
    lines.push({ id, text: `${POS[c.pair[0]]} 자리와 ${POS[c.pair[1]]} 자리에 서로 끌리는 짝이 있어요${c.adjacent ? '(바로 붙어 있음)' : ''}. 실제 작용과 기운이 바뀌는지는 판단하지 않았어요.`, evidenceIds: [e], tags: ['relationship', 'relations'], anchors: ['끌리'] });
    claims.push(draft({
      id: `C-card-combine-${i}`, domain: 'relationship', semanticKey: `combine_${i}`, stance: 'CONTEXTUAL',
      thesis: CARD_TEXT.combine.text,
      factIds: [id], counterFactIds: [], ruleId: 'SJ-R005-COMBINE',
      condition: CARD_TEXT.combine.condition, limitation: CARD_TEXT.combine.limitation,
      salience: 2, tags: ['relationship', 'relations'], anchors: ['끌리'],
    }));
  });

  return { lines, claims, evidence };
}

// ───── 연애운 카드 ─────
const BIDX = (b: Branch) => BRANCHES.indexOf(b);
/** 지지 충(정반대 자리) */
export const branchClash = (a: Branch, b: Branch) => Math.abs(BIDX(a) - BIDX(b)) === 6;
/** 지지 육합(子丑·寅亥·卯戌·辰酉·巳申·午未: 순번 합이 12로 나눠 1) */
export const branchBind = (a: Branch, b: Branch) => a !== b && (BIDX(a) + BIDX(b)) % 12 === 1;
/** 양력 연도의 세운 간지(그해 입춘 이후). 60갑자 순환: 서기 4년 = 갑자 */
export const yearPillarOf = (y: number) => ({ stem: STEMS[(((y - 4) % 10) + 10) % 10]!, branch: BRANCHES[(((y - 4) % 12) + 12) % 12]! });

export interface LoveCardOptions { gender?: 'F' | 'M' | 'X'; years: number[] }

/** 연애운 판단 카드: 가까운 관계의 자리(일지 본기), 인연을 살피는 기운, 그 자리의 짝, 연도별 흐름, 10년 흐름 보류 안내 */
export function buildLoveCards(r: R002to005, o: LoveCardOptions): CardSet & { yearPillars: Record<number, string> } {
  const lines: FactLine[] = [];
  const claims: Claim[] = [];
  const evidence: EvidenceItem[] = [];
  const yearPillars: Record<number, string> = {};
  const ev = (id: string, label: string, detail: string, ruleId: string) => { evidence.push({ id, label, detail, ruleId }); return id; };
  const dayStem = r.r005.dayStem;
  if (!dayStem || r.r005.status === 'blocked') return { lines, claims, evidence, yearPillars };
  const L = CARD_TEXT.love;
  const P = r.chart.pillars;
  const db = P.day.branch;

  // 가까운 관계의 자리: 태어난 날 땅 쪽 글자의 본기(R-003 정적표) → 일간 기준 관계(R-005)
  const main = STATIC_HIDDEN[db].main;
  const pg = GROUP_OF[relationOf(dayStem, main)];
  const e1 = ev('card_love_palace', '가까운 관계의 자리', `태어난 날 땅 쪽 글자의 대표 기운 → ${ROLE_CARD[pg].key}`, 'SJ-LOVE');
  lines.push({ id: 'card_love_palace', text: `가까운 관계를 뜻하는 자리(태어난 날의 땅 쪽 글자)의 대표 기운은 ${ROLE_CARD[pg].fact.replace(/이$/, '')}이에요.`, evidenceIds: [e1], tags: ['love', 'relationship'], anchors: ['가까운 관계'] });
  claims.push(draft({ id: 'C-card-love-palace', domain: 'love', semanticKey: 'love_palace', stance: 'CONTEXTUAL', thesis: L.palace[pg], factIds: ['card_love_palace'], counterFactIds: [], ruleId: `SJ-LOVE-PALACE-${ROLE_CARD[pg].key.toUpperCase()}`, condition: L.palaceCondition, limitation: L.palaceLimitation, salience: 5, tags: ['love', 'relationship'], anchors: ['가까운 관계'] }));

  // 인연을 살피는 기운: 여성은 나를 다스리는 기운, 남성은 내가 다루는 기운(전통), 그 밖은 둘 다
  const starGroups: GodGroup[] = o.gender === 'F' ? ['관살'] : o.gender === 'M' ? ['재성'] : ['관살', '재성'];
  const shown = r.r005.relations.filter((x) => starGroups.includes(x.group)).length;
  const e2 = ev('card_love_star', '인연을 살피는 기운', `드러난 글자 중 ${starGroups.map((g) => ROLE_CARD[g].key).join('/')} ${shown}곳`, 'SJ-LOVE');
  lines.push({ id: 'card_love_star', text: `인연을 볼 때 전통적으로 살피는 기운이 드러난 글자에 ${shown ? `${shown}곳 있어요` : '없어요'}(땅 속 글자는 보지 않았어요).`, evidenceIds: [e2], tags: ['love', 'relationship'], anchors: ['인연'] });
  claims.push(draft({ id: 'C-card-love-star', domain: 'love', semanticKey: 'relationship_star', stance: shown ? 'CONTEXTUAL' : 'LOW', thesis: shown ? L.star.present : L.star.absent, factIds: ['card_love_star'], counterFactIds: [], ruleId: shown ? 'SJ-LOVE-STAR-PRESENT' : 'SJ-LOVE-STAR-ABSENT', condition: L.starCondition, limitation: L.starLimitation, salience: 3, tags: ['love', 'relationship'], anchors: ['인연'] }));

  // 가까운 관계의 자리와 다른 자리의 짝(충·육합 존재만)
  const others: Position[] = (['year', 'month', 'hour'] as Position[]).filter((p) => P[p]);
  const clash = others.filter((p) => branchClash(db, P[p]!.branch));
  const bind = others.filter((p) => branchBind(db, P[p]!.branch));
  const kind = clash.length && bind.length ? 'both' : clash.length ? 'clash' : bind.length ? 'bind' : 'none';
  const e3 = ev('card_love_pairs', '가까운 관계의 자리와 짝', `부딪히는 짝: ${clash.map((p) => POS[p]).join('·') || '없음'}, 묶이는 짝: ${bind.map((p) => POS[p]).join('·') || '없음'}, 작용 미판단`, 'SJ-LOVE');
  lines.push({ id: 'card_love_pairs', text: kind === 'none' ? '가까운 관계를 뜻하는 자리와 부딪히거나 묶이는 짝은 뚜렷하지 않아요.' : `가까운 관계를 뜻하는 자리는 ${[...clash.map((p) => `${POS[p]} 자리와 부딪히는 짝`), ...bind.map((p) => `${POS[p]} 자리와 묶이는 짝`)].join(', ')}을 이뤄요. 실제 작용은 판단하지 않았어요.`, evidenceIds: [e3], tags: ['relations', 'relationship', 'love'], anchors: ['짝'] });
  claims.push(draft({ id: 'C-card-love-pairs', domain: 'love', semanticKey: 'palace_relations', stance: kind === 'none' ? 'NONE' : 'CONTEXTUAL', thesis: L.pairs[kind], factIds: ['card_love_pairs'], counterFactIds: [], ruleId: `SJ-LOVE-PAIRS-${kind.toUpperCase()}`, condition: L.pairsCondition, limitation: kind === 'none' ? L.pairsNoneLimitation : L.pairsLimitation, salience: kind === 'none' ? 2 : 4, tags: ['relations', 'relationship', 'love'], anchors: ['짝'] }));

  // 연도별 흐름(세운): 그해 천간의 일간 기준 관계 + 그해 지지와 가까운 관계 자리의 짝
  for (const y of o.years) {
    const yp = yearPillarOf(y);
    yearPillars[y] = `${yp.stem}${yp.branch}`;
    const g = GROUP_OF[relationOf(dayStem, yp.stem)];
    const yc = branchClash(db, yp.branch), yb = branchBind(db, yp.branch);
    const id = `card_year_${y}`;
    const e = ev(id, `${y}년 흐름`, `그해 하늘 글자 → ${ROLE_CARD[g].key}${yc ? ', 가까운 관계 자리와 부딪히는 짝' : yb ? ', 가까운 관계 자리와 묶이는 짝' : ''}`, 'SJ-LOVE-YEAR');
    lines.push({ id, text: `${y}년에는 ${ROLE_CARD[g].fact.replace(/이$/, '')}이 들어와요.${yc ? ' 그해의 땅 쪽 글자는 가까운 관계를 뜻하는 자리와 부딪히는 짝이에요.' : yb ? ' 그해의 땅 쪽 글자는 가까운 관계를 뜻하는 자리와 묶이는 짝이에요.' : ''}`, evidenceIds: [e], tags: ['yearly', 'love', `year:${y}`], anchors: [`${y}년`] });
    claims.push(draft({ id: `C-card-year-${y}`, domain: 'yearly', semanticKey: `year_${y}`, stance: 'CONTEXTUAL', thesis: fillCard(L.year[g], { 해: String(y) }) + (yc ? L.yearClash : yb ? L.yearBind : ''), factIds: [id], counterFactIds: [], ruleId: `SJ-LOVE-YEAR-${ROLE_CARD[g].key.toUpperCase()}${yc ? '-CLASH' : yb ? '-BIND' : ''}`, condition: L.yearCondition, limitation: L.yearLimitation, salience: 4, tags: ['yearly', 'love', `year:${y}`], anchors: [`${y}년`] }));
  }

  // 10년 흐름: 해석 기준 미검증 → 다루지 않는다고만 안내
  lines.push({ id: 'card_luck_held', text: '10년 단위의 큰 흐름은 해석 기준이 검증되지 않아 이번 풀이에서 다루지 않아요. 그 흐름을 지어내지 않아요.', evidenceIds: [], tags: ['yearly', 'limits'], anchors: ['10년'] });
  claims.push(draft({ id: 'C-card-luck-held', domain: 'luck', semanticKey: 'luck_cycle', stance: 'NONE', thesis: L.luck.text, factIds: ['card_luck_held'], counterFactIds: [], ruleId: 'SJ-LOVE-LUCK-HELD', condition: L.luck.condition, limitation: L.luck.limitation, salience: 1, tags: ['yearly', 'limits'], anchors: ['10년'] }));
  return { lines, claims, evidence, yearPillars };
}

/** 검토표 한 줄: 카드 하나의 문장 변형 하나 */
export interface CardCatalogEntry {
  /** 검토용 고유 키(문장 위치) */
  key: string;
  ruleId: string;
  /** 어떤 사주일 때 이 문장이 쓰이나(쉬운 말) */
  when: string;
  thesis: string;
  condition: string;
  limitation: string;
  status: 'DRAFT';
}

const GRADE_WHEN: Record<Grade, string> = {
  旺: '태어난 계절의 기운과 나의 기운이 같을 때',
  相: '태어난 계절의 기운이 나의 기운을 길러 줄 때',
  休: '나의 기운이 태어난 계절의 기운을 길러 줄 때',
  囚: '나의 기운이 태어난 계절의 기운을 누를 때',
  死: '태어난 계절의 기운이 나의 기운을 누를 때',
};
/** 검토표 키에는 한자를 쓰지 않는다 */
const GRADE_KEY: Record<Grade, string> = { 旺: 'same', 相: 'fed', 休: 'giving', 囚: 'handling', 死: 'pressed' };
const STRUCT_WHEN: Record<StructureKind, string> = {
  wealth_controls_resource: '내가 다루는 기운이 나를 길러 주는 기운을 누르는 배치가 있을 때(후보)',
  officer_generates_resource: '나를 다스리는 기운이 나를 길러 주는 기운을 길러 주는 배치가 있을 때(후보)',
  output_controls_officer: '내가 길러 내는 기운이 나를 다스리는 기운을 누르는 배치가 있을 때(후보)',
  output_generates_wealth: '내가 길러 내는 기운이 내가 다루는 기운을 길러 주는 배치가 있을 때(후보)',
  peer_controls_wealth: '나와 같은 기운이 내가 다루는 기운을 누르는 배치가 있을 때(후보)',
};

/** 카드가 낼 수 있는 모든 문장 변형(자리표시 그대로). 검토표 생성과 시험에 쓴다. */
export function cardTextCatalog(): CardCatalogEntry[] {
  const out: CardCatalogEntry[] = [];
  const add = (e: Omit<CardCatalogEntry, 'status'>) => out.push({ ...e, status: 'DRAFT' });
  const S = CARD_TEXT.season;
  for (const g of Object.keys(S.thesis) as Grade[]) {
    add({ key: `season.${GRADE_KEY[g]}`, ruleId: 'SJ-R002-SEASON', when: GRADE_WHEN[g], thesis: S.thesis[g], condition: S.condition, limitation: S.limitation });
    add({ key: `season.${GRADE_KEY[g]}.transition`, ruleId: 'SJ-R002-SEASON', when: `${GRADE_WHEN[g]}, 그리고 계절이 바뀌는 달(양력으로 대략 4·7·10·1월 초부터 한 달)에 태어났을 때`, thesis: S.thesis[g] + S.provisionalSuffix, condition: S.condition, limitation: S.limitation });
  }
  const R = CARD_TEXT.root;
  add({ key: 'root.present', ruleId: 'SJ-R004-ROOT', when: '나와 같은 기운이 땅 쪽 글자 속에 있지만, 태어난 날 자리의 땅 쪽 글자에는 없을 때', thesis: R.present, condition: R.condition, limitation: R.limitation });
  add({ key: 'root.present.day', ruleId: 'SJ-R004-ROOT', when: '나와 같은 기운이 태어난 날 자리의 땅 쪽 글자에 있을 때(다른 자리에도 있을 수 있음)', thesis: R.present + R.dayBranchSuffix, condition: R.condition, limitation: R.limitation });
  add({ key: 'root.absent', ruleId: 'SJ-R004-ROOT', when: '나와 같은 기운이 땅 쪽 글자 속에 없을 때', thesis: R.absent, condition: R.condition, limitation: R.limitation });
  for (const c of Object.values(CARD_TEXT.role)) {
    add({ key: `role.${c.key}`, ruleId: `SJ-R005-ROLE-${c.key.toUpperCase()}`, when: `태어난 해·달·시 자리의 드러난 글자에 ${c.fact} 있을 때`, thesis: c.text, condition: c.condition, limitation: CARD_TEXT.roleLimitation });
  }
  const W = CARD_TEXT.workAbsent;
  add({ key: 'work_absent', ruleId: 'SJ-R005-WORK-ABSENT', when: '드러난 글자에 내가 길러 내는·다루는·나를 다스리는 기운이 하나도 없을 때', thesis: W.text, condition: W.condition, limitation: W.limitation });
  for (const k of Object.keys(CARD_TEXT.struct) as StructureKind[]) {
    add({ key: `struct.${k}`, ruleId: `SJ-R005-STRUCT-${k.toUpperCase()}`, when: STRUCT_WHEN[k], thesis: CARD_TEXT.struct[k].text, condition: CARD_TEXT.structCondition, limitation: CARD_TEXT.structLimitation });
  }
  const C = CARD_TEXT.combine;
  add({ key: 'combine', ruleId: 'SJ-R005-COMBINE', when: '드러난 글자끼리 서로 끌리는 짝(다섯 쌍 중 하나)이 있을 때', thesis: C.text, condition: C.condition, limitation: C.limitation });
  const B = CARD_TEXT.branchPairs;
  add({ key: 'branch_pairs.clash', ruleId: 'SJ-BRANCH-PAIRS-DRAFT', when: '땅 쪽 글자끼리 부딪히는 짝만 있을 때', thesis: B.clash, condition: B.presentCondition, limitation: B.limitation });
  add({ key: 'branch_pairs.bind', ruleId: 'SJ-BRANCH-PAIRS-DRAFT', when: '땅 쪽 글자끼리 묶이는 짝만 있을 때', thesis: B.bind, condition: B.presentCondition, limitation: B.limitation });
  add({ key: 'branch_pairs.present', ruleId: 'SJ-BRANCH-PAIRS-DRAFT', when: '땅 쪽 글자끼리 부딪히는 짝과 묶이는 짝이 함께 있을 때', thesis: B.present, condition: B.presentCondition, limitation: B.limitation });
  add({ key: 'branch_pairs.absent', ruleId: 'SJ-BRANCH-PAIRS-DRAFT', when: '땅 쪽 글자끼리 그런 짝이 없을 때', thesis: B.absent, condition: B.absentCondition, limitation: B.absentLimitation });
  const LV = CARD_TEXT.love;
  for (const [g, t] of Object.entries(LV.palace) as Array<[GodGroup, string]>) add({ key: `love.palace.${ROLE_CARD[g].key}`, ruleId: `SJ-LOVE-PALACE-${ROLE_CARD[g].key.toUpperCase()}`, when: `태어난 날 땅 쪽 글자의 대표 기운이 ${ROLE_CARD[g].fact.replace(/이$/, '')}일 때`, thesis: t, condition: LV.palaceCondition, limitation: LV.palaceLimitation });
  add({ key: 'love.star.present', ruleId: 'SJ-LOVE-STAR-PRESENT', when: '여성은 나를 다스리는 기운, 남성은 내가 다루는 기운(그 밖은 둘 다)이 드러난 글자에 있을 때', thesis: LV.star.present, condition: LV.starCondition, limitation: LV.starLimitation });
  add({ key: 'love.star.absent', ruleId: 'SJ-LOVE-STAR-ABSENT', when: '위 기운이 드러난 글자에 없을 때', thesis: LV.star.absent, condition: LV.starCondition, limitation: LV.starLimitation });
  for (const k of ['clash', 'bind', 'both', 'none'] as const) add({ key: `love.pairs.${k}`, ruleId: `SJ-LOVE-PAIRS-${k.toUpperCase()}`, when: { clash: '태어난 날 땅 쪽 글자가 다른 자리와 부딪히는 짝만 이룰 때', bind: '태어난 날 땅 쪽 글자가 다른 자리와 묶이는 짝만 이룰 때', both: '두 가지 짝이 함께 있을 때', none: '그런 짝이 없을 때' }[k], thesis: LV.pairs[k], condition: LV.pairsCondition, limitation: k === 'none' ? LV.pairsNoneLimitation : LV.pairsLimitation });
  for (const [g, t] of Object.entries(LV.year) as Array<[GodGroup, string]>) {
    const kk = ROLE_CARD[g].key;
    add({ key: `love.year.${kk}`, ruleId: `SJ-LOVE-YEAR-${kk.toUpperCase()}`, when: `그해 하늘 글자가 ${ROLE_CARD[g].fact.replace(/이$/, '')}일 때`, thesis: t, condition: LV.yearCondition, limitation: LV.yearLimitation });
    add({ key: `love.year.${kk}.clash`, ruleId: `SJ-LOVE-YEAR-${kk.toUpperCase()}-CLASH`, when: '위와 같고, 그해 땅 쪽 글자가 가까운 관계 자리와 부딪히는 짝일 때', thesis: t + LV.yearClash, condition: LV.yearCondition, limitation: LV.yearLimitation });
    add({ key: `love.year.${kk}.bind`, ruleId: `SJ-LOVE-YEAR-${kk.toUpperCase()}-BIND`, when: '위와 같고, 그해 땅 쪽 글자가 가까운 관계 자리와 묶이는 짝일 때', thesis: t + LV.yearBind, condition: LV.yearCondition, limitation: LV.yearLimitation });
  }
  add({ key: 'love.luck_held', ruleId: 'SJ-LOVE-LUCK-HELD', when: '연애운 풀이에서 항상(10년 흐름 해석 기준 미검증)', thesis: LV.luck.text, condition: LV.luck.condition, limitation: LV.luck.limitation });
  return out;
}
