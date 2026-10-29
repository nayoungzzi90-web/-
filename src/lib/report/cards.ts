/**
 * 판단 카드: R-002~R-005 결정론 엔진(engine/saju-rules)의 결과를 AI 가 읽는 "사실 줄 + 해석 명제"로 바꾼다.
 * - 사실 줄(FactLine): 계산된 사실만. 해석 없음.
 * - 해석 명제(Claim): 사실이 일상에서 어떻게 드러나는지 쉬운 말로 쓴 **초안 문장**(전문가 승인 전 DRAFT).
 * - 후보(candidate)·잠정(provisional) 결과는 "~로 볼 여지가 있어요" 처럼 조건부로만 쓰고, 한계를 함께 붙인다.
 * - 신강신약·격국·용신은 만들지 않는다(R-006 이후 미구현).
 */
import type { Element } from '../saju/types';
import type { GodGroup, Position, R002to005, StructureKind } from '../../../engine/saju-rules/src';
import type { Claim, EvidenceItem, FactLine } from './types';

export const CARDS_VERSION = 'cards-0.1.0-draft';

const EL: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const SEASON: Record<string, string> = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const POS: Record<Position, string> = { year: '태어난 해', month: '태어난 달', day: '태어난 날', hour: '태어난 시' };
const STEM_EL: Record<string, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
const GRADE_KO: Record<string, string> = { 旺: '같은 기운(계절과 내가 같음)', 相: '계절이 나를 길러 줌', 休: '내가 계절 쪽으로 힘을 내보냄', 囚: '내가 계절의 기운을 다뤄야 함', 死: '계절이 나를 누름' };

const draft = (c: Omit<Claim, 'status'>): Claim => ({ status: 'DRAFT', ...c });

const ROLE_CARD: Record<GodGroup, { key: string; fact: string; text: string; condition: string; tags: string[]; anchors: string[] }> = {
  비겁: { key: 'peer', fact: '나와 같은 기운이', text: '곁에 나와 같은 기운이 있어, 내 방식과 함께하는 사람들을 같이 챙기는 편이에요', condition: '함께 일하거나 경쟁이 있는 자리에서', tags: ['personality', 'relationship', 'strength'], anchors: ['같은 기운'] },
  인성: { key: 'resource', fact: '나를 길러 주는 기운이', text: '나를 길러 주는 기운이 곁에 있어, 배우고 도움을 받아들이며 힘을 얻는 편이에요', condition: '새로운 것을 익히거나 지칠 때', tags: ['strength', 'advice', 'personality'], anchors: ['길러', '배우'] },
  식상: { key: 'output', fact: '내가 길러 내는 기운이', text: '내가 길러 내는 기운이 곁에 있어, 생각과 재능을 밖으로 꺼내는 쪽에 힘을 쓰는 편이에요', condition: '말·글·결과물로 보여 줄 기회가 있을 때', tags: ['personality', 'strength', 'career'], anchors: ['표현', '꺼내'] },
  재성: { key: 'wealth', fact: '내가 다루는 기운이', text: '내가 다루는 기운이 곁에 있어, 현실적인 일과 자원(시간·돈)을 관리하는 데 힘을 쓰는 편이에요', condition: '일정·돈·결과를 챙겨야 할 때', tags: ['career', 'money'], anchors: ['관리', '현실'] },
  관살: { key: 'officer', fact: '나를 다스리는 기운이', text: '나를 다스리는 기운이 곁에 있어, 규칙·책임·기대에 맞추는 장면이 자주 생기는 편이에요', condition: '역할과 기준이 분명한 자리에서', tags: ['career', 'relationship'], anchors: ['책임', '규칙'] },
};

const STRUCT_CARD: Record<StructureKind, { text: string; tags: string[] }> = {
  wealth_controls_resource: { text: '현실적인 일을 챙기는 힘이 배움·쉼의 시간을 줄이는 쪽으로 작용할 여지가 있어요', tags: ['career', 'advice'] },
  officer_generates_resource: { text: '맡은 책임이 배움과 성장으로 이어지는 흐름으로 볼 여지가 있어요', tags: ['career', 'strength'] },
  output_controls_officer: { text: '표현하고 싶은 마음과 규칙·책임이 서로 부딪히는 장면이 생길 여지가 있어요', tags: ['personality', 'career', 'relationship'] },
  output_generates_wealth: { text: '재능과 표현이 현실적인 결과물로 이어지는 흐름으로 볼 여지가 있어요', tags: ['strength', 'career', 'money'] },
  peer_controls_wealth: { text: '내 방식이 강하게 나올 때 돈·시간 관리와 부딪힐 여지가 있어요', tags: ['money', 'advice'] },
};

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
    const thesis: Record<string, string> = {
      旺: `태어난 계절의 기운이 나의 ${me} 기운과 같아, 계절의 도움을 직접 받는 편이에요`,
      相: `태어난 계절의 ${EL[g.monthElement]} 기운이 나의 ${me} 기운을 길러 주는 쪽이에요`,
      休: `나의 ${me} 기운이 태어난 계절의 ${EL[g.monthElement]} 기운 쪽으로 흘러 나가는 관계라, 힘을 밖으로 쓰는 일이 많은 편이에요`,
      囚: `나의 ${me} 기운이 태어난 계절의 ${EL[g.monthElement]} 기운을 다뤄야 하는 관계라, 환경에 맞추는 데 손이 가는 편이에요`,
      死: `태어난 계절의 ${EL[g.monthElement]} 기운이 나의 ${me} 기운을 누르는 관계라, 환경에 익숙해지는 시간이 필요한 편이에요`,
    };
    claims.push(draft({
      id: 'C-card-season', domain: 'balance', semanticKey: 'season_relation',
      stance: provisional ? 'CONTEXTUAL' : g.seasonal_grade === '旺' || g.seasonal_grade === '相' ? 'HIGH' : g.seasonal_grade === '休' ? 'CONTEXTUAL' : 'LOW',
      thesis: provisional ? `${thesis[g.seasonal_grade]}. 다만 환절기라 이 판단은 잠정이에요` : thesis[g.seasonal_grade]!,
      factIds: ['card_season'], counterFactIds: [], ruleId: 'SJ-R002-SEASON',
      condition: '새 환경에 들어가거나 생활 리듬을 정할 때', limitation: '계절의 도움은 여러 근거 중 하나일 뿐이며, 강하다·약하다는 뜻이 아니에요',
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
      thesis: day.hasStructuralRoot ? `나와 같은 기운이 땅 쪽에도 자리 잡고 있어, 타고난 바탕이 받쳐 주는 편이에요${day.day_branch_rooted ? '. 특히 나 자신을 뜻하는 자리에도 있어요' : ''}` : '나와 같은 기운이 땅 쪽에는 보이지 않아, 주변의 도움과 환경을 활용해 힘을 쓰는 편이에요',
      factIds: ['card_root'], counterFactIds: [], ruleId: 'SJ-R004-ROOT',
      condition: '혼자 버텨야 하거나 기댈 곳이 필요할 때', limitation: '뿌리가 있고 없음이나 그 개수만으로 힘의 세기를 정하지 않아요',
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
      condition: card.condition, limitation: '드러난 글자를 기준으로 한 것이며, 실제 힘의 크기는 판단하지 않았어요',
      salience: 3, tags: card.tags, anchors: card.anchors,
    }));
  }
  const workGroups: GodGroup[] = ['식상', '재성', '관살'];
  if (!groups.some((x) => workGroups.includes(x))) {
    const e = ev('card_work_absent', '일·돈과 연결되는 기운', '드러난 글자에 표현·관리·책임 쪽 기운이 없음', 'SJ-R005');
    lines.push({ id: 'card_work_absent', text: '드러난 글자 중에는 표현·현실 관리·책임과 연결되는 기운이 보이지 않아요(땅 속 글자는 보지 않았어요).', evidenceIds: [e], tags: ['career', 'money'], anchors: ['드러난'] });
    claims.push(draft({
      id: 'C-card-work-absent', domain: 'career', semanticKey: 'work_roles_absent', stance: 'LOW',
      thesis: '겉으로 드러난 기운만 보면 일과 돈을 다루는 방식은 정해진 틀보다 상황과 사람에 따라 달라지기 쉬워요',
      factIds: ['card_work_absent'], counterFactIds: [], ruleId: 'SJ-R005-WORK-ABSENT',
      condition: '일하는 방식을 스스로 정해야 할 때', limitation: '드러난 글자만 본 것이며 땅 속 글자까지 보면 달라질 수 있어요',
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
      condition: '두 가지 일이 동시에 몰릴 때', limitation: '배치가 있다는 뜻일 뿐, 실제로 그렇게 작용하는지는 아직 판단하지 않았어요',
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
      thesis: '서로 끌리는 짝을 이루는 기운이 보여, 어떤 일이나 사람에게 마음이 묶이는 장면이 생길 여지가 있어요',
      factIds: [id], counterFactIds: [], ruleId: 'SJ-R005-COMBINE',
      condition: '가까운 관계나 오래 붙드는 일이 있을 때', limitation: '짝이 있다는 사실일 뿐, 실제로 작용하는지는 판단하지 않았어요',
      salience: 2, tags: ['relationship', 'relations'], anchors: ['끌리'],
    }));
  });

  return { lines, claims, evidence };
}
