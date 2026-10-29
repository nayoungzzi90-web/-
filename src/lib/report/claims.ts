import { ELEMENT_KO } from '../saju/types';
import { ChartAnalysis, GOD_LOVE, GOD_TRAIT, Group, GROUP, GROUPS, LoveAnalysis, POS_BRANCH, YearAnalysis } from './analysis';
import type { Claim, ClaimConflict, ClaimStance } from './types';

/**
 * 해석 명제 생성기 + 규칙 카탈로그.
 * ⚠️ 여기의 모든 명제는 "규칙 엔진이 제안한 초안(DRAFT)"이다. 상담사가 규칙 ID 단위로 승인(APPROVED)하기 전에는
 *    서비스 결과(READY)로 쓰지 않는다. 임계값(≥3 등)과 문구는 전문가가 조정할 대상이다. → docs/CLAIM_RULES.md
 */
/** 명제 문장은 쉬운 말만(한자 없이): 나무·불·흙·쇠·물 */
const PLAIN_EL: Record<string, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
export const CLAIM_RULES_VERSION = 'claim-rules-1.0';

export interface RuleDef { id: string; title: string; domain: string; logic: string }
export const RULES: RuleDef[] = [];
const rule = (id: string, title: string, domain: string, logic: string) => { RULES.push({ id, title, domain, logic }); return id; };

type S3 = 'HIGH' | 'CONTEXTUAL' | 'LOW';
interface GroupSpec { key: string; tags: string[]; rule: string; text: Record<S3, string>; condition: Record<S3, string>; limitation: string }
const GROUP_SPEC: Record<Group, GroupSpec> = {
  비겁: { key: 'autonomy', tags: ['personality', 'strength', 'relationship'], rule: rule('R-CLM-AUTONOMY', '비겁 비중 → 자기 기준(자율성)', 'personality', '십성 가중 합계(월지 2배) 비겁 ≥3 이면 HIGH, 1~2 이면 CONTEXTUAL, 0 이면 LOW'),
    text: { HIGH: '자기 기준과 주관이 뚜렷하고, 비교·경쟁 상황에서 자존심이 올라오기 쉬운 편이에요', CONTEXTUAL: '필요할 때는 자기 기준을 세우지만, 늘 앞서려 하기보다 상황을 보며 조절하는 편이에요', LOW: '내 편을 앞세우기보다 환경과 사람에 맞춰 움직이는 데 익숙한 편이에요' },
    condition: { HIGH: '내 방식이 존중받지 못한다고 느낄 때', CONTEXTUAL: '중요한 선택이나 경쟁이 걸린 때', LOW: '낯선 집단이나 새 환경에서' },
    limitation: '자기 기준이 강하다는 뜻이지 협조를 못 한다는 뜻은 아니에요. 비겁만으로 성격을 단정하지 않아요.' },
  식상: { key: 'expression', tags: ['personality', 'strength', 'career'], rule: rule('R-CLM-EXPRESSION', '식상 비중 → 표현·재능', 'personality', '식상 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW'),
    text: { HIGH: '생각과 재능을 밖으로 드러내고 싶은 욕구가 크고, 말·글·창작으로 풀어낼 때 편안한 편이에요', CONTEXTUAL: '표현하고 싶은 마음은 있지만 상황과 상대를 살펴 골라서 드러내는 편이에요', LOW: '겉으로 드러내기보다 속으로 정리하고 필요할 때 꺼내는 편이에요' },
    condition: { HIGH: '자유롭게 아이디어를 낼 수 있는 환경에서', CONTEXTUAL: '신뢰가 쌓인 관계나 자리에서', LOW: '평가받는 자리나 즉흥적으로 말해야 할 때' },
    limitation: '표현이 적다고 감정이 없다는 뜻은 아니에요. 식상 하나로 직업을 정하지 않아요.' },
  재성: { key: 'practicality', tags: ['career', 'money', 'strength'], rule: rule('R-CLM-PRACTICALITY', '재성 비중 → 현실 감각·자원 관리', 'career', '재성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW'),
    text: { HIGH: '현실적인 결과와 자원 관리에 민감하고, 일을 눈에 보이는 성과로 연결하려는 편이에요', CONTEXTUAL: '필요한 때에는 현실을 따져 움직이지만, 늘 결과만 쫓지는 않는 편이에요', LOW: '결과나 돈 계산보다 의미·관계·과정에 마음이 먼저 가는 편이에요' },
    condition: { HIGH: '성과 기준이 분명한 일을 맡았을 때', CONTEXTUAL: '큰 지출이나 계약처럼 현실 판단이 필요할 때', LOW: '수치와 기록으로 관리해야 하는 일이 몰릴 때' },
    limitation: '재성이 많다고 부자가 된다는 뜻이 아니에요. 재물 규모를 예언하지 않아요.' },
  관성: { key: 'structure', tags: ['career', 'relationship', 'personality'], rule: rule('R-CLM-STRUCTURE', '관성 비중 → 규칙·책임 감각', 'career', '관성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW'),
    text: { HIGH: '규칙·책임·기대에 민감하고, 맡은 역할을 제대로 해내야 한다는 압박을 느끼기 쉬운 편이에요', CONTEXTUAL: '필요한 때에는 규칙과 책임을 잘 지키지만, 늘 틀에 맞추려 하지는 않는 편이에요', LOW: '정해진 틀이나 위계보다 자기 방식과 자유로운 흐름을 편하게 느끼는 편이에요' },
    condition: { HIGH: '역할 기대가 많거나 평가가 따르는 환경에서', CONTEXTUAL: '공식적인 약속이나 마감이 걸린 때', LOW: '규칙이 빡빡하고 위계가 뚜렷한 조직에서' },
    limitation: '책임감이 강하다는 뜻이지 권위에 순응한다는 뜻은 아니에요. 관성만으로 직급·직업을 단정하지 않아요.' },
  인성: { key: 'support', tags: ['personality', 'strength', 'advice'], rule: rule('R-CLM-SUPPORT', '인성 비중 → 배움·정서적 지지', 'personality', '인성 ≥3 HIGH, 1~2 CONTEXTUAL, 0 LOW'),
    text: { HIGH: '배우고 이해한 뒤에 움직이고, 정서적 안정과 지지를 중요하게 여기는 편이에요', CONTEXTUAL: '필요한 때에는 배우고 도움을 구하지만, 스스로 부딪혀 보며 익히기도 하는 편이에요', LOW: '배움이나 보호에 기대기보다 직접 겪으면서 길을 찾는 편이에요' },
    condition: { HIGH: '불확실한 일을 시작하기 전', CONTEXTUAL: '새로운 분야를 익힐 때', LOW: '조언자 없이 혼자 판단해야 할 때' },
    limitation: '의존적이라는 뜻이 아니에요. 인성만으로 학업·성향을 단정하지 않아요.' },
};
const TENSIONS: { a: Group; b: Group; key: string; text: string; rule: string }[] = [
  { a: '비겁', b: '관성', key: 'autonomy_vs_structure', text: '내 방식을 지키고 싶은 마음과 규칙·책임을 지켜야 한다는 압박이 함께 있어요. 환경에 따라 한쪽이 앞서는 모습이 나타날 수 있어요', rule: rule('R-CLM-TENSION-1', '비겁·관성 모두 높음 → 자율성 대 책임 긴장', 'personality', '비겁 ≥3 이고 관성 ≥3') },
  { a: '식상', b: '인성', key: 'expression_vs_caution', text: '드러내고 싶은 마음과 충분히 배우고 확인한 뒤 움직이려는 신중함이 공존해요. 편한 사람 앞에서는 표현이, 낯선 자리에서는 신중함이 앞서기 쉬워요', rule: rule('R-CLM-TENSION-2', '식상·인성 모두 높음 → 표현 대 신중 긴장', 'personality', '식상 ≥3 이고 인성 ≥3') },
  { a: '재성', b: '인성', key: 'practical_vs_ideal', text: '현실적인 결과를 챙기려는 마음과 의미·배움·정서적 만족을 지키려는 마음이 함께 있어요. 선택의 순간에 두 기준이 부딪힐 수 있어요', rule: rule('R-CLM-TENSION-3', '재성·인성 모두 높음 → 현실 대 의미 긴장', 'personality', '재성 ≥3 이고 인성 ≥3') },
];
const R_POWER = rule('R-CLM-POWER', '자기 힘 vs 바깥 힘 → 에너지 방향(신강/신약 단순 근사)', 'personality', '비겁+인성 ≥ (식상+재성+관성)×1.3 이면 SELF, 반대면 OTHER, 아니면 BALANCED');
const R_SEASON = rule('R-CLM-SEASON', '월령(계절)이 일간 오행을 돕는가', 'balance', '월지 계절 오행이 일간 오행과 같거나 일간 오행을 생(生)하면 도움');
const R_REL = rule('R-CLM-RELATIONS', '원국 안의 천간합·육합·충', 'relationship', '네 기둥 쌍마다 천간합/육합/충 여부(합화·형·파·해는 아직 다루지 않음)');
const R_GAP = rule('R-CLM-GAP', '없는 오행 → 보완 포인트', 'balance', '천간·지지 겉글자에 없는 오행(지장간 제외)');
const R_CORE = rule('R-CLM-CORE', '오행 분포의 큰 그림', 'balance', '가장 많은/적은 오행');
const R_PALACE = rule('R-CLM-LOVE-PALACE', '일지(배우자궁) 십성 → 관계 선호', 'love', '일지 본기 천간의 일간 기준 십성');
const R_STAR = rule('R-CLM-LOVE-STAR', '이성 인연 별(재성/관성) 개수', 'love', '성별에 따라 재성(남)/관성(여), 미입력이면 둘 다. ≥2 HIGH, 0 LOW');
const R_PREL = rule('R-CLM-LOVE-PALACE-REL', '일지와 다른 지지의 합충', 'love', '일지와 연지·월지·시지의 육합/충');
const R_YEAR = rule('R-CLM-YEARLY', '세운 간지 → 해당 연도 주제', 'yearly', '세운 천간/지지 십성 + 일지·월지와의 합충. 연도 경계는 입춘(샘플 엔진은 근사)');
const R_LUCK = rule('R-CLM-LUCK-MISSING', '대운 계산 미제공 고지', 'luck', '검증된 대운 계산이 없으면 NONE 명제로 한계만 안내');
const R_CDM = rule('R-CLM-COMPAT-DM', '두 일간의 오행·십성 관계', 'compat', '일간 오행 관계(같음/생/극) + 서로의 십성 + 천간합 여부');
const R_CBR = rule('R-CLM-COMPAT-BRANCH', '두 일지의 합충', 'compat', '두 일지의 육합/충');
const R_CMO = rule('R-CLM-COMPAT-MONTH', '두 월지의 합충', 'compat', '두 월지의 육합/충');
const R_CCO = rule('R-CLM-COMPAT-COMPLEMENT', '오행 보완', 'compat', '한쪽이 ≤1 인 오행을 상대가 ≥2 로 가진 경우');
const R_CAF = rule('R-CLM-COMPAT-AFFECTION', '각자의 일지 십성 → 애정표현 방식', 'compat', '일지 본기 십성별 관계 선호');

const stance3 = (score: number): S3 => (score >= 3 ? 'HIGH' : score === 0 ? 'LOW' : 'CONTEXTUAL');
const sal = (n: number): 1 | 2 | 3 | 4 | 5 => Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
const mk = (c: Omit<Claim, 'status'> & { status?: Claim['status'] }): Claim => ({ status: 'DRAFT', ...c });

/** 한 사람의 해석 명제. p 는 궁합에서 A/B 구분 접두사(사실 줄 ID 접두사와 같다). */
export function buildPersonClaims(A: ChartAnalysis, p = '', who = '나'): Claim[] {
  const out: Claim[] = [];
  const id = (k: string) => `C-${p ? p.replace('_', '-') : ''}${k}`;
  const fact = (k: string) => `${p}${k}`;
  const domStr = A.dominant.map((e) => PLAIN_EL[e]).join('·'), weakStr = A.weak.map((e) => PLAIN_EL[e]).join('·');
  out.push(mk({ id: id('core'), domain: 'balance', semanticKey: `${p}core_structure`, stance: 'CONTEXTUAL', thesis: `${who}의 사주는 ${domStr} 기운이 가장 두드러지고 ${weakStr} 기운이 상대적으로 적은 구조예요`, factIds: [fact('core'), fact('balance')], counterFactIds: [], ruleId: R_CORE, condition: '사주 전체를 큰 그림으로 볼 때', limitation: '오행 개수는 드러난 글자 기준이며, 땅 속 글자와 실제 힘의 크기는 반영하지 않았어요', salience: 5, tags: ['core', 'balance'], anchors: [A.dm, ...A.dominant.map((e) => ELEMENT_KO[e].slice(0, 1))] }));
  for (const g of GROUPS) {
    const spec = GROUP_SPEC[g], sc = A.groupScore[g], st = stance3(sc);
    const present = [...new Set(A.gods.filter((x) => GROUP[x.god] === g).map((x) => x.god))];
    out.push(mk({ id: id(spec.key), domain: spec.tags[0], semanticKey: `${p}${spec.key}`, stance: st, thesis: spec.text[st], factIds: [fact('gods')], counterFactIds: st === 'HIGH' && !A.seasonSupported ? [fact('season')] : [], ruleId: spec.rule, condition: spec.condition[st], limitation: spec.limitation, salience: sal(sc === 0 ? 2 : 1 + sc), tags: spec.tags, anchors: [g, ...present] }));
  }
  for (const t of TENSIONS) {
    if (A.groupScore[t.a] >= 3 && A.groupScore[t.b] >= 3) out.push(mk({ id: id(`tension-${t.key}`), domain: 'personality', semanticKey: `${p}${t.key}`, stance: 'CONTEXTUAL', thesis: t.text, factIds: [fact('gods')], counterFactIds: [fact('power')], ruleId: t.rule, condition: '두 기준이 동시에 요구되는 상황', limitation: '두 성향이 공존한다는 뜻이며 어느 한쪽이 틀렸다는 뜻이 아니에요', salience: 5, tags: ['personality', 'relationship', 'advice'], anchors: [t.a, t.b] }));
  }
  const pw = A.power;
  out.push(mk({ id: id('self-power'), domain: 'personality', semanticKey: `${p}self_power`, stance: pw === 'SELF' ? 'HIGH' : pw === 'OTHER' ? 'LOW' : 'MIXED', thesis: pw === 'SELF' ? '자기 힘이 센 편이라 스스로 중심을 잡고 버티는 힘이 있는 한편, 도움 요청이나 방향 전환이 늦어질 수 있어요' : pw === 'OTHER' ? '바깥 힘(표현·재물·책임)이 센 편이라 환경과 요구에 민감하고, 에너지를 쓰는 만큼 회복 시간이 필요할 수 있어요' : '자기 힘과 바깥 힘이 비교적 균형을 이뤄 상황에 따라 앞에 서기도 하고 맞추기도 하는 편이에요', factIds: [fact('power')], counterFactIds: [], ruleId: R_POWER, condition: '에너지를 쓰는 일과 쉬는 일의 균형을 볼 때', limitation: '전통 신강·신약의 단순 근사라 학파에 따라 판단이 달라질 수 있어요', salience: 3, tags: ['personality', 'strength', 'career', 'money', 'advice'], anchors: [pw === 'SELF' ? '자기 힘' : pw === 'OTHER' ? '바깥 힘' : '균형'] }));
  out.push(mk({ id: id('season'), domain: 'balance', semanticKey: `${p}season_support`, stance: A.seasonSupported ? 'HIGH' : 'LOW', thesis: A.seasonSupported ? `${A.season.name}에 태어나 계절의 기운이 일간을 받쳐 주는 편이라 타고난 기질이 비교적 안정적으로 드러나요` : `${A.season.name}에 태어나 계절의 기운이 일간을 직접 돕지 않는 편이라, 기질이 환경의 영향을 받아 달라지는 모습이 보일 수 있어요`, factIds: [fact('season')], counterFactIds: [], ruleId: R_SEASON, condition: '타고난 기질이 환경에서 어떻게 드러나는지 볼 때', limitation: '월령은 하나의 근거이며 다른 구조와 함께 평가해요', salience: 2, tags: ['personality', 'balance', 'advice'], anchors: [A.season.name.slice(0, 2), A.monthBranch] }));
  out.push(mk({ id: id('relations'), domain: 'relationship', semanticKey: `${p}internal_relations`, stance: A.relations.length ? 'CONTEXTUAL' : 'NONE', thesis: A.relations.length ? `원국 안에 ${A.relations.join(', ')}이(가) 있어, 해당 자리가 나타내는 주제끼리 서로 영향을 주고받기 쉬워요` : '원국 안에서 뚜렷한 합·충이 보이지 않아 구조가 비교적 조용한 편이에요', factIds: [fact('relations')], counterFactIds: [], ruleId: R_REL, condition: A.relations.length ? '관련된 자리의 주제가 이슈가 될 때' : '변화가 적은 안정적인 시기에', limitation: '합충이 있다고 반드시 작용하는 것은 아니며 강도는 따로 봐야 해요', salience: A.relations.length ? 3 : 1, tags: ['relations', 'relationship', 'love', 'personality'], anchors: A.relations.length ? ['합', '충'].filter((w) => A.relations.join().includes(w)) : ['합충 없음'] }));
  if (A.missing.length) out.push(mk({ id: id('gap'), domain: 'balance', semanticKey: `${p}element_gap`, stance: 'LOW', thesis: `${A.missing.map((e) => PLAIN_EL[e]).join('·')} 기운이 사주의 드러난 글자에 보이지 않아, 이 기운과 연결된 활동·환경·루틴으로 균형을 보완해 볼 수 있어요`, factIds: [fact('balance')], counterFactIds: [], ruleId: R_GAP, condition: '일상의 균형을 점검하고 싶을 때', limitation: '없는 오행은 약점이 아니라 보완 포인트이며, 땅 속 글자까지 보면 달라질 수 있어요', salience: 3, tags: ['balance', 'advice', 'strength'], anchors: A.missing.map((e) => ELEMENT_KO[e].slice(0, 1)) }));
  return out;
}

export function buildLoveClaims(L: LoveAnalysis): Claim[] {
  const out: Claim[] = [mk({ id: 'C-love-palace', domain: 'love', semanticKey: 'love_palace', stance: 'CONTEXTUAL', thesis: `일지(배우자궁)의 ${L.palaceGod}은(는) 관계에서 ${GOD_LOVE[L.palaceGod]}`, factIds: ['love_palace'], counterFactIds: [], ruleId: R_PALACE, condition: '가까운 관계에서 편안함을 느끼는 조건을 볼 때', limitation: '일지 하나로 배우자 유형을 확정하지 않아요', salience: 5, tags: ['love', 'relationship'], anchors: [L.palaceGod, '일지'] })];
  const star = L.gender === 'F' ? L.gwan : L.gender === 'M' ? L.jae : Math.max(L.jae, L.gwan);
  const name = L.gender === 'F' ? '관성' : L.gender === 'M' ? '재성' : '재성·관성';
  out.push(mk({ id: 'C-love-star', domain: 'love', semanticKey: 'relationship_star', stance: star >= 2 ? 'HIGH' : star === 0 ? 'LOW' : 'CONTEXTUAL', thesis: star >= 2 ? `${name}이(가) 여러 곳에 보여 인연의 주제가 삶에서 자주 떠오르기 쉬워요` : star === 0 ? `${name}이(가) 원국에 드러나지 않아 인연이 적극적인 선택과 환경 만들기로 이어질 때 더 선명해지기 쉬워요` : `${name}이(가) 적당히 보여 인연의 주제가 시기와 환경에 따라 부각되는 편이에요`, factIds: ['love_stars'], counterFactIds: [], ruleId: R_STAR, condition: '관계가 시작되는 환경을 볼 때', limitation: '인연의 별 개수로 결혼·연애 여부를 단정하지 않아요', salience: 3, tags: ['love', 'relationship', 'strength'], anchors: ['재성', '관성'] }));
  out.push(mk({ id: 'C-love-palace-rel', domain: 'love', semanticKey: 'palace_relations', stance: L.palaceRelations.length ? 'CONTEXTUAL' : 'NONE', thesis: L.palaceRelations.length ? `일지가 ${L.palaceRelations.map(([k, r]) => `${POS_BRANCH[k]}와 ${r}`).join(', ')} 관계라, 관계 영역이 다른 자리의 주제와 맞물려 움직이기 쉬워요` : '일지에 합·충이 없어 관계 영역이 비교적 조용한 구조예요', factIds: ['love_relations'], counterFactIds: [], ruleId: R_PREL, condition: L.palaceRelations.length ? '관련 자리의 주제(사회 환경·가족 등)가 이슈가 될 때' : '큰 환경 변화가 없을 때', limitation: '합충의 작용 강도는 별도로 판단해요', salience: L.palaceRelations.length ? 4 : 2, tags: ['love', 'relationship'], anchors: ['일지', ...L.palaceRelations.map(([, r]) => r)] }));
  return out;
}

export function buildYearClaims(y: YearAnalysis): Claim {
  const rel = [y.toDay !== '없음' ? `일지(배우자궁)와 ${y.toDay}이라 관계 영역이 움직이기 쉬워요` : '일지와는 합·충이 없어 비교적 잔잔해요', y.toMonth !== '없음' ? `월지와도 ${y.toMonth}이라 사회적 환경 변화가 함께 올 수 있어요` : ''].filter(Boolean).join('. ');
  return mk({ id: `C-year-${y.year}`, domain: 'yearly', semanticKey: `year_${y.year}`, stance: 'CONTEXTUAL', thesis: `${y.year}년(${y.pillar})은 천간이 ${y.stemGod}(${GOD_TRAIT[y.stemGod]}), 지지가 ${y.branchGod}인 해예요. ${rel}`, factIds: [`year_${y.year}`], counterFactIds: [], ruleId: R_YEAR, condition: '해당 연도 입춘 이후', limitation: '샘플 엔진은 입춘 경계를 근사하므로 경계일 전후는 달라질 수 있고, 사건을 예언하지 않아요', salience: y.toDay !== '없음' ? 5 : 3, tags: ['yearly', 'love', `year:${y.year}`], anchors: [`${y.year}년`, y.pillar, y.stemGod] });
}
export const luckMissingClaim = (): Claim => mk({ id: 'C-luck-missing', domain: 'luck', semanticKey: 'luck_cycle', stance: 'NONE', thesis: '대운(10년 단위 큰 흐름)은 검증된 계산이 아직 없어 이번 리포트에서는 세운 중심으로 읽어요', factIds: ['luck_missing'], counterFactIds: [], ruleId: R_LUCK, condition: '대운 계산이 제공되지 않는 동안', limitation: '대운의 간지·시작 나이를 지어내지 않아요', salience: 2, tags: ['luck', 'limits'], anchors: ['대운'] });

export interface CompatInput { rel: string; tgAB: string; tgBA: string; combine: boolean; branchRel: string; bd: string; bb: string; monthRel: string; mA: string; mB: string; aGets: string[]; bGets: string[]; aLoveGod: string; bLoveGod: string; aLoveKey: string; bLoveKey: string }
export function buildCompatClaims(c: CompatInput & { aLoveText: string; bLoveText: string }): Claim[] {
  return [
    mk({ id: 'C-compat-core', domain: 'compat', semanticKey: 'compat_core', stance: 'CONTEXTUAL', thesis: `두 일간의 오행 관계는 "${c.rel}"이고, 나 기준 상대는 ${c.tgAB}, 상대 기준 나는 ${c.tgBA}이에요${c.combine ? '. 일간끼리 천간합이라 서로 끌어당기는 힘이 있어요' : ''}`, factIds: ['dm_rel'], counterFactIds: [], ruleId: R_CDM, condition: '관계의 기본 결을 볼 때', limitation: '궁합은 점수나 성공 여부가 아니라 상호작용의 경향이에요', salience: 5, tags: ['compat_core', 'communication', 'love'], anchors: [c.rel, c.tgAB, c.tgBA] }),
    mk({ id: 'C-compat-branch', domain: 'compat', semanticKey: 'compat_branch', stance: c.branchRel === '충' ? 'LOW' : c.branchRel === '육합' ? 'HIGH' : 'NONE', thesis: `두 일지 ${c.bd}·${c.bb}는 ${c.branchRel === '없음' ? '합도 충도 없는 관계' : c.branchRel}예요. ${c.branchRel === '충' ? '속도와 방식의 차이가 드러나기 쉬워 조율이 중요해요' : c.branchRel === '육합' ? '정서적으로 가까워지기 쉬운 구조예요' : '구조적으로 크게 부딪히거나 묶이지 않아요'}`, factIds: ['branch_rel'], counterFactIds: [], ruleId: R_CBR, condition: '가까운 관계에서 일상의 리듬이 맞물릴 때', limitation: '합충은 하나의 근거이며 다른 구조와 함께 봐요', salience: 4, tags: ['compat_core', 'conflict', 'affection'], anchors: [c.branchRel === '없음' ? '합도 충도' : c.branchRel, c.bd, c.bb] }),
    mk({ id: 'C-compat-month', domain: 'compat', semanticKey: 'compat_month', stance: c.monthRel === '충' ? 'LOW' : c.monthRel === '육합' ? 'HIGH' : 'NONE', thesis: `두 월지 ${c.mA}·${c.mB}는 ${c.monthRel === '없음' ? '합도 충도 없는 관계' : c.monthRel}이라 생활 환경과 사회적 리듬이 ${c.monthRel === '충' ? '엇갈리기 쉬워요' : c.monthRel === '육합' ? '잘 맞물리기 쉬워요' : '크게 부딪히거나 묶이지 않아요'}`, factIds: ['month_rel'], counterFactIds: [], ruleId: R_CMO, condition: '생활 방식과 사회적 리듬을 맞출 때', limitation: '생활 습관은 환경과 선택의 영향이 커요', salience: 3, tags: ['lifestyle', 'conflict'], anchors: ['월지', c.mA, c.mB] }),
    mk({ id: 'C-compat-complement', domain: 'compat', semanticKey: 'compat_complement', stance: c.aGets.length || c.bGets.length ? 'HIGH' : 'NONE', thesis: `상대는 나에게 ${c.aGets.join('·') || '뚜렷하게 채워 주는 기운이 없고'}${c.aGets.length ? ' 기운을 채워 주고' : ''}, 나는 상대에게 ${c.bGets.join('·') || '뚜렷하게 채워 주는 기운이 없어요'}${c.bGets.length ? ' 기운을 채워 줘요' : ''}`, factIds: ['complement'], counterFactIds: [], ruleId: R_CCO, condition: '서로의 부족한 부분을 보완할 때', limitation: '보완은 장점이 될 수도 의존이 될 수도 있어요', salience: 3, tags: ['lifestyle', 'communication', 'affection'], anchors: [...c.aGets, ...c.bGets, '오행 보완'] }),
    mk({ id: 'C-compat-a-love', domain: 'compat', semanticKey: 'affection_a', stance: 'CONTEXTUAL', thesis: `나의 일지 십성은 ${c.aLoveGod}이라 관계에서 ${c.aLoveText}`, factIds: ['a_love'], counterFactIds: [], ruleId: R_CAF, condition: '애정을 표현하고 받는 방식을 볼 때', limitation: '일지 하나로 애정 방식을 단정하지 않아요', salience: 4, tags: ['affection', 'love'], anchors: [c.aLoveGod] }),
    mk({ id: 'C-compat-b-love', domain: 'compat', semanticKey: 'affection_b', stance: 'CONTEXTUAL', thesis: `상대의 일지 십성은 ${c.bLoveGod}이라 관계에서 ${c.bLoveText}`, factIds: ['b_love'], counterFactIds: [], ruleId: R_CAF, condition: '애정을 표현하고 받는 방식을 볼 때', limitation: '일지 하나로 애정 방식을 단정하지 않아요', salience: 4, tags: ['affection', 'love'], anchors: [c.bLoveGod] }),
  ];
}

/** 승인된 규칙 ID 집합으로 명제의 승인 상태를 정한다(상담사 승인 DB 의 결과). 기본값은 전부 DRAFT. */
export function applyApprovals(claims: Claim[], approvedRuleIds: ReadonlySet<string> = new Set()): Claim[] {
  return claims.map((c) => (approvedRuleIds.has(c.ruleId) ? { ...c, status: 'APPROVED' as const } : c));
}
/** 서비스에서 써도 되는 명제: 승인된 것만. (샌드박스/검수 화면에서만 allowDraft) */
/**
 * 기준서(R-006)가 "임의 점수 합산 금지, 승인된 강약 규칙 통과 전에는 확정 금지"라고 정한 근사 규칙.
 * 승인 전에는 승인(APPROVED) 상태여도 AI 입력에서 제외한다(루브릭이 정한 신강·신약을 점수 비율로 흉내 내지 않기 위해).
 */
export const HELD_RULE_IDS: ReadonlySet<string> = new Set(['R-CLM-POWER']);
export const usableClaims = (claims: Claim[], allowDraft = false) => claims.filter((c) => !HELD_RULE_IDS.has(c.ruleId) && (c.status === 'APPROVED' || (allowDraft && c.status === 'DRAFT')));

const OPPOSED: Record<ClaimStance, ClaimStance[]> = { HIGH: ['LOW'], LOW: ['HIGH'], MIXED: [], CONTEXTUAL: [], NONE: [] };
/** 같은 의미 키에 상반된 입장이 동시에 있으면 충돌 후보. 상황 차이(CONTEXTUAL)로 설명되는 것은 충돌로 보지 않는다. */
export function detectConflicts(claims: Claim[]): ClaimConflict[] {
  const by = new Map<string, Claim[]>();
  for (const c of claims.filter((x) => x.status !== 'REJECTED')) by.set(c.semanticKey, [...(by.get(c.semanticKey) ?? []), c]);
  const out: ClaimConflict[] = [];
  for (const [key, list] of by) {
    const bad = list.filter((a) => list.some((b) => b !== a && OPPOSED[a.stance].includes(b.stance)));
    if (bad.length) out.push({ semanticKey: key, claimIds: bad.map((c) => c.id), reason: '같은 의미 축에 상반된 입장(HIGH/LOW)이 함께 있어요. 상황 차이인지 오류인지 전문가 검수가 필요해요.' });
  }
  return out;
}

/** 참조 무결성: 중복 ID, 근거 없음, 존재하지 않는 근거 */
export function validateClaimReferences(factIds: Iterable<string>, claims: Claim[]): string[] {
  const known = new Set(factIds), errors: string[] = [], seen = new Set<string>();
  for (const c of claims) {
    if (seen.has(c.id)) errors.push(`${c.id}: 중복된 명제 ID`);
    seen.add(c.id);
    if (!c.factIds.length) errors.push(`${c.id}: 해석 근거가 없음`);
    for (const f of [...c.factIds, ...c.counterFactIds]) if (!known.has(f)) errors.push(`${c.id}: 존재하지 않는 근거 ${f}`);
  }
  return errors;
}
