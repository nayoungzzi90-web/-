import { fnv } from '../hash';
import { Element, SajuFacts, Stem } from '../saju/types';

export const CHARACTER_RULE_VERSION = 'char-rules-1.0';

export interface CharacterBase {
  id: string;
  stem: Stem;
  name: string;
  animal: string;
  emoji: string;
  element: Element;
  color: string;
  summary: string;
  temperament: string;
  strengths: string[];
  weaknesses: string[];
  shareLine: string;
}

/** 일간 10종 기본 캐릭터. 일러스트는 public/characters/{id}.webp 슬롯에 독자 제작 에셋을 넣으면 자동 사용된다. */
export const CHARACTERS: Record<Stem, CharacterBase> = {
  甲: { id: 'gap', stem: '甲', name: '곧은 소나무 도령', animal: '🌲', emoji: '🌲', element: 'wood', color: '#2F7168', summary: '큰 나무처럼 곧게 뻗어 가는 개척자', temperament: '한번 방향을 정하면 앞으로 쭉 나아가는 힘이 있어요. 자존심과 책임감이 강하고, 도움이 필요한 사람 곁에서 든든한 그늘이 되어 주는 편이에요.', strengths: ['추진력과 리더십', '정직하고 올곧은 태도', '시작하는 용기'], weaknesses: ['유연성이 부족해 보일 수 있어요', '도움 요청을 어려워해요'], shareLine: '나는 곧게 자라는 소나무 도령!' },
  乙: { id: 'eul', stem: '乙', name: '살랑살랑 덩굴 아씨', animal: '🌿', emoji: '🌿', element: 'wood', color: '#4C8F6B', summary: '부드럽게 틈을 찾아 자라나는 적응의 달인', temperament: '상황에 맞춰 유연하게 길을 찾는 사람이에요. 섬세하고 친화력이 좋아 어느 자리에서든 분위기를 부드럽게 만들어요.', strengths: ['적응력과 센스', '사람을 편하게 만드는 힘', '끈질긴 생활력'], weaknesses: ['눈치를 많이 봐서 지칠 수 있어요', '결정을 미루는 경향'], shareLine: '나는 살랑살랑 덩굴 아씨!' },
  丙: { id: 'byeong', stem: '丙', name: '활짝 해님 호랑이', animal: '🐯', emoji: '🐯', element: 'fire', color: '#C0562F', summary: '어디서든 분위기를 밝히는 태양 같은 존재', temperament: '밝고 솔직하며 표현이 시원시원해요. 사람들을 끌어당기는 에너지가 있고, 마음을 열면 아낌없이 따뜻하게 베풀어요.', strengths: ['밝은 에너지와 표현력', '솔직하고 화끈한 성격', '사람을 북돋는 힘'], weaknesses: ['성급하게 결론 내릴 수 있어요', '관심이 식으면 금방 지쳐요'], shareLine: '나는 활짝 해님 호랑이!' },
  丁: { id: 'jeong', stem: '丁', name: '오롯한 등불 토끼', animal: '🐰', emoji: '🐰', element: 'fire', color: '#D98A3D', summary: '작지만 오래 따뜻한 등불 같은 마음', temperament: '겉은 차분해도 속은 뜨겁게 깊어요. 한 사람, 한 가지에 오래 마음을 쏟고 섬세하게 살피는 힘이 있어요.', strengths: ['집중력과 섬세함', '깊고 따뜻한 정', '분위기를 읽는 감각'], weaknesses: ['예민해지면 혼자 앓아요', '속마음을 늦게 표현해요'], shareLine: '나는 오롯한 등불 토끼!' },
  戊: { id: 'mu', stem: '戊', name: '듬직한 큰바위 곰', animal: '🐻', emoji: '🐻', element: 'earth', color: '#9A7B4F', summary: '흔들리지 않고 곁을 지키는 산 같은 사람', temperament: '신뢰와 안정감이 몸에 밴 사람이에요. 말수는 적어도 약속을 지키고, 주변 사람들이 기대어 쉴 수 있는 중심이 되어 줘요.', strengths: ['믿음직한 안정감', '포용력과 인내', '꾸준한 실행'], weaknesses: ['변화 앞에서 느릴 수 있어요', '고집이 세 보일 때가 있어요'], shareLine: '나는 듬직한 큰바위 곰!' },
  己: { id: 'gi', stem: '己', name: '포근한 논밭 거북이', animal: '🐢', emoji: '🐢', element: 'earth', color: '#B48A44', summary: '무엇이든 품어 키워 내는 부드러운 대지', temperament: '조용히 곁에서 돌보고 키우는 데 재능이 있어요. 현실 감각이 좋고, 천천히 가도 결국 열매를 맺는 사람이에요.', strengths: ['돌봄과 현실 감각', '꼼꼼하고 성실함', '사람을 키우는 재능'], weaknesses: ['걱정이 많아질 수 있어요', '자기 몫을 뒤로 미뤄요'], shareLine: '나는 포근한 논밭 거북이!' },
  庚: { id: 'gyeong', stem: '庚', name: '단단한 쇠칼 선비', animal: '🗡️', emoji: '🗡️', element: 'metal', color: '#5E6B7A', summary: '결단력과 의리로 길을 가르는 강철 마음', temperament: '옳고 그름이 분명하고 결단이 빨라요. 의리가 깊어 한번 내 사람이면 끝까지 챙기고, 위기에서 더 빛나요.', strengths: ['결단력과 의리', '원칙과 실행력', '위기 대처'], weaknesses: ['말이 직설적으로 들릴 수 있어요', '양보가 어려워요'], shareLine: '나는 단단한 쇠칼 선비!' },
  辛: { id: 'sin', stem: '辛', name: '반짝반짝 옥구슬 아씨', animal: '💎', emoji: '💎', element: 'metal', color: '#8A8FA8', summary: '다듬을수록 빛나는 섬세한 보석', temperament: '감각이 예민하고 미적 기준이 뚜렷해요. 자신을 아름답게 다듬는 데 진심이고, 완성도 높은 결과를 만들어 내요.', strengths: ['세련된 안목', '완성도에 대한 집념', '섬세한 관찰력'], weaknesses: ['자기 기준이 높아 스스로 힘들어요', '상처를 오래 기억해요'], shareLine: '나는 반짝반짝 옥구슬 아씨!' },
  壬: { id: 'im', stem: '壬', name: '넓은 강물 용', animal: '🐲', emoji: '🐲', element: 'water', color: '#33495D', summary: '큰 흐름을 읽고 멀리 보는 자유로운 영혼', temperament: '생각의 폭이 넓고 자유로워요. 호기심이 많아 새로운 곳으로 흘러가며, 큰 그림을 보는 눈이 좋아요.', strengths: ['큰 그림과 통찰', '포용력과 자유로움', '위기에서의 유연함'], weaknesses: ['한곳에 머물기 어려워요', '마음을 잘 안 보여 줘요'], shareLine: '나는 넓은 강물 용!' },
  癸: { id: 'gye', stem: '癸', name: '촉촉한 이슬 고양이', animal: '🐱', emoji: '🐱', element: 'water', color: '#4E7A9E', summary: '조용히 스며들어 마음을 읽는 이슬 같은 감성', temperament: '직관과 공감 능력이 뛰어나요. 조용히 사람의 마음에 스며들고, 필요한 때를 알아채는 센스가 있어요.', strengths: ['직관과 공감', '조용한 집중력', '지혜로운 관찰'], weaknesses: ['생각이 많아 걱정이 늘어요', '감정 기복에 영향을 받아요'], shareLine: '나는 촉촉한 이슬 고양이!' },
};

const EXPRESSIONS: Record<Element, { id: string; label: string; emoji: string }> = {
  wood: { id: 'expr_wood', label: '씩씩한 표정', emoji: '😆' },
  fire: { id: 'expr_fire', label: '반짝이는 표정', emoji: '🤩' },
  earth: { id: 'expr_earth', label: '느긋한 표정', emoji: '😌' },
  metal: { id: 'expr_metal', label: '또렷한 표정', emoji: '😎' },
  water: { id: 'expr_water', label: '몽글몽글 표정', emoji: '🥹' },
};
const PROPS: Record<Element, { id: string; label: string; emoji: string }> = {
  wood: { id: 'prop_wood', label: '복주머니 새싹', emoji: '🌱' },
  fire: { id: 'prop_fire', label: '청사초롱', emoji: '🏮' },
  earth: { id: 'prop_earth', label: '곶감 꾸러미', emoji: '🍊' },
  metal: { id: 'prop_metal', label: '은장도 노리개', emoji: '🪭' },
  water: { id: 'prop_water', label: '물빛 부채', emoji: '💧' },
};
const EPITHETS = ['새벽을 여는', '눈 속에 피어난', '봄바람을 닮은', '꽃길을 걷는', '구름 위를 노니는', '여름 한낮의', '소나기 뒤에 웃는', '가을 달빛 아래', '단풍 길을 걷는', '서리 위에 선', '첫눈을 기다리는', '한겨울 아궁이 곁의'];

export interface CharacterResult {
  characterId: string;
  stem: Stem;
  name: string;
  epithet: string;
  expression: { id: string; label: string; emoji: string };
  prop: { id: string; label: string; emoji: string };
  ruleVersion: string;
  /** 해석 근거가 있는 부분(일간)과 창작 표현을 구분 */
  basis: { grounded: string; creative: string };
}

const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/** 결정론적: 동일 SajuFacts + 규칙 버전이면 항상 동일 결과 */
export function buildCharacter(facts: SajuFacts): CharacterResult {
  const base = CHARACTERS[facts.dayMaster];
  const counts = ELEMENTS.map((e) => [e, facts.fiveElements[e]] as const);
  // 동률일 때도 흔들리지 않도록 오행 순서로 고정
  const dominant = counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const weakest = counts.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const monthBranchIdx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(facts.pillars.month[1]);
  return {
    characterId: base.id,
    stem: base.stem,
    name: base.name,
    epithet: EPITHETS[(monthBranchIdx + 10) % 12],
    expression: EXPRESSIONS[dominant],
    prop: PROPS[weakest],
    ruleVersion: CHARACTER_RULE_VERSION,
    basis: {
      grounded: `캐릭터는 일간(${facts.dayMaster})에서 정해져요.`,
      creative: '표정·소품·칭호는 오행 분포와 태어난 달에서 고른 창작 표현이며, 심리 검사 결과가 아니에요.',
    },
  };
}

export const characterIdToBase = (id: string) => Object.values(CHARACTERS).find((c) => c.id === id);
export const shareSeed = (facts: SajuFacts) => fnv(facts.inputHash);
