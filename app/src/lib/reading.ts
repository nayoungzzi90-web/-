import type { Element, Pillar, SajuPreview } from "./saju";
export type { Element };
import type { FriendKind } from "@/components/Friends";
import type { Daeun } from "./daeun";
import { BRANCHES, BRANCH_KO, STEMS, STEM_KO, solarTermsUtc } from "./saju-engine";

// 규칙 기반 무료 풀이(결정론). 쓰는 근거: 천간·지지의 오행, 오행 개수, 오행 상생·상극.
// 쓰지 않는 것(검증 전): 십성 판정, 신강·신약, 격국, 용신, 대운·세운 해석.
// 올해·내년 흐름은 해의 간지(입춘 기준, 달력 사실)의 오행을 내 일간과 상생·상극으로만 견준 분위기 비유다.
export const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];
export const EL_WORD: Record<Element, string> = {
  목: "나무",
  화: "불",
  토: "흙",
  금: "쇠",
  수: "물",
};
export const EL_HANJA: Record<Element, string> = {
  목: "木",
  화: "火",
  토: "土",
  금: "金",
  수: "水",
};
export const EL_FRIEND: Record<Element, FriendKind> = {
  목: "seonbi",
  화: "ssi",
  토: "tiger",
  금: "rabbit",
  수: "turtle",
};
const GEN: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
}; // 상생
const CTRL: Record<Element, Element> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
}; // 상극

export type Relation = "same" | "helps" | "gives" | "rules" | "pressed";
// 기준(me)에서 본 other의 작용
export function relation(me: Element, other: Element): Relation {
  if (me === other) return "same";
  if (GEN[other] === me) return "helps"; // 상대가 나를 살림
  if (GEN[me] === other) return "gives"; // 내가 상대를 살림(기운을 씀)
  if (CTRL[me] === other) return "rules"; // 내가 상대를 다룸
  return "pressed"; // 상대가 나를 누름
}

const STEM_ELEM: Element[] = [
  "목",
  "목",
  "화",
  "화",
  "토",
  "토",
  "금",
  "금",
  "수",
  "수",
];
export const stemElement = (stem: number): Element => STEM_ELEM[stem]!;
const BRANCH_ELEM: Element[] = [
  "수",
  "토",
  "목",
  "목",
  "토",
  "화",
  "화",
  "토",
  "금",
  "금",
  "토",
  "수",
];
export const branchElement = (b: number): Element => BRANCH_ELEM[b]!;

// 일간(10개)별 이미지·성향. 재미를 위한 표현이다.
const STEM_INFO: {
  image: string;
  trait: string;
  strengths: string[];
  weaknesses: string[];
}[] = [
  {
    image: "곧게 뻗는 큰 나무",
    trait: "앞장서서 길을 여는 리더 기질",
    strengths: ["추진력", "정의감", "책임감"],
    weaknesses: ["고집", "융통성 부족"],
  },
  {
    image: "바람에 눕지 않는 덩굴",
    trait: "어디서든 뿌리내리는 적응력",
    strengths: ["적응력", "친화력", "섬세함"],
    weaknesses: ["눈치 과다", "결정 지연"],
  },
  {
    image: "한낮의 해",
    trait: "주변을 환하게 밝히는 분위기 메이커",
    strengths: ["열정", "솔직함", "표현력"],
    weaknesses: ["성급함", "금방 식는 열정"],
  },
  {
    image: "밤을 밝히는 촛불",
    trait: "조용히 오래 타오르는 집중력",
    strengths: ["집중력", "배려", "감성"],
    weaknesses: ["예민함", "속앓이"],
  },
  {
    image: "움직이지 않는 큰 산",
    trait: "믿음직하게 중심을 잡는 사람",
    strengths: ["신뢰감", "포용력", "끈기"],
    weaknesses: ["느린 결정", "변화 거부"],
  },
  {
    image: "씨앗을 품은 밭",
    trait: "남을 키우는 데 능한 살림꾼",
    strengths: ["현실감각", "다정함", "꼼꼼함"],
    weaknesses: ["걱정 많음", "자기 얘기 미룸"],
  },
  {
    image: "달빛에 벼린 칼",
    trait: "결단이 빠르고 의리 있는 해결사",
    strengths: ["결단력", "의리", "추진력"],
    weaknesses: ["직설적인 말", "타협 어려움"],
  },
  {
    image: "먼지를 털면 반짝이는 보석",
    trait: "섬세하고 자존심이 센 완성도 장인",
    strengths: ["안목", "섬세함", "자기관리"],
    weaknesses: ["예민함", "상처 오래 감"],
  },
  {
    image: "멈추지 않는 큰 강",
    trait: "생각이 깊고 스케일이 큰 전략가",
    strengths: ["통찰력", "대범함", "유연함"],
    weaknesses: ["산만함", "마음 읽기 어려움"],
  },
  {
    image: "조용히 스며드는 이슬비",
    trait: "눈치 빠르고 감수성 풍부한 관찰자",
    strengths: ["직관", "공감력", "지혜"],
    weaknesses: ["걱정", "우유부단"],
  },
];

const MISSING_TIP: Record<Element, string> = {
  목: "새로 배우고 키우는 활동(공부, 새 취미, 산책)",
  화: "마음을 겉으로 꺼내는 활동(말하기, 글쓰기, 운동)",
  토: "생활 리듬과 안정감을 만드는 습관(규칙적인 식사·수면)",
  금: "정리하고 끊어내는 결단(미루던 일 마무리, 물건 정리)",
  수: "쉬고 생각을 비우는 시간(충분한 잠, 혼자만의 휴식)",
};
const DOMINANT_NOTE: Record<Element, string> = {
  목: "성장하고 뻗어 나가려는 힘이 센 편이에요",
  화: "열정과 표현이 앞서는 편이에요",
  토: "안정과 현실을 중시하는 편이에요",
  금: "결단과 원칙이 분명한 편이에요",
  수: "생각과 감정의 깊이가 깊은 편이에요",
};
const REL_BRANCH: Record<Relation, string> = {
  same: "같은 기운이 받쳐주고 있어서 자기 색이 선명한 편이에요",
  helps:
    "나를 살려주는 기운이 깔려 있어서 기본 체력과 버티는 힘이 든든한 편이에요",
  gives:
    "내 기운을 밖으로 쏟는 구조라서 베풀고 표현하는 쪽에 힘을 많이 쓰는 편이에요",
  rules:
    "내가 다루는 기운이 깔려 있어서 현실을 장악하고 챙기려는 마음이 강한 편이에요",
  pressed:
    "나를 단련시키는 기운이 깔려 있어서 책임과 압박 속에서 성장하는 편이에요",
};


// ── 2단계: 풀이 심화 내용(재미·참고용). 근거는 일간·오행 분포·월지의 계절·상생상극 관계뿐이다.
// 십성·격국·용신·신강신약 판정은 전문가 검증 전이라 쓰지 않는다.
interface StemDeep {
  inner: string;
  love: string;
  work: string;
  money: string;
  people: string;
}
const STEM_DEEP: StemDeep[] = [
  {
    inner:
      "겉으로는 당당하고 곧아 보이지만, 속으로는 ‘내가 책임져야 한다’는 마음이 늘 깔려 있어요. 쓰러지지 않으려는 자존심이 커서 도움을 청하는 데 서툴러요.",
    love: "마음에 들면 돌려 말하지 않고 곧장 다가가요. 한번 정하면 오래 책임지는 편이라 신뢰를 주지만, 내 방식을 고집하면 상대가 답답해할 수 있어요. 상대의 속도를 묻는 한마디가 사랑을 지켜 줘요.",
    work: "시작하고 이끄는 자리에서 힘이 나요. 목표가 분명할수록 쭉쭉 자라지만 방향이 흔들리는 조직에서는 답답해져요. 큰 그림을 그리고 세부는 믿을 만한 사람에게 나누면 더 크게 자라요.",
    money:
      "벌 때는 크게 벌고 쓸 때도 의리 있게 써요. 체면 때문에 나가는 돈만 줄여도 모이는 속도가 달라져요.",
    people:
      "후배와 동료가 따르는 맏형·맏언니 스타일이에요. 다만 옳다고 믿는 걸 밀어붙이면 부딪힐 수 있어서, ‘네 생각은 어때?’를 먼저 물어보면 좋아요.",
  },
  {
    inner:
      "부드럽고 순해 보이지만 속은 의외로 끈질기고 자기 방식이 분명해요. 부딪히기보다 돌아서 원하는 곳에 닿는 법을 알아요.",
    love: "상대의 기분과 취향을 섬세하게 맞춰 주는 다정한 사랑이에요. 맞추다 보니 내 마음을 말할 타이밍을 놓치기 쉬워서, 작은 서운함도 그날 말하는 게 좋아요.",
    work: "사람 사이를 잇고 분위기를 살피는 일, 디테일이 중요한 일에서 강해요. 혼자 모든 걸 짊어지기보다 든든한 기둥 같은 동료와 함께할 때 훨씬 멀리 가요.",
    money:
      "필요한 만큼 알뜰하게 모으는 편이에요. 사람 때문에 쓰는 돈이 많아질 수 있으니 ‘내 몫’ 예산을 따로 두세요.",
    people:
      "누구와도 금방 친해지는 적응력이 무기예요. 다만 모두에게 좋은 사람이 되려다 지치니, 거리를 두어도 되는 관계를 정해 두세요.",
  },
  {
    inner:
      "겉도 속도 밝고 솔직해요. 숨기는 게 서툴러 기분이 얼굴에 다 나지만 그게 매력이에요. 속으로는 인정받고 싶은 마음이 은근히 커요.",
    love: "열정적으로 표현하고 아낌없이 주는 사랑이에요. 처음의 불꽃이 크기 때문에 상대가 부담을 느끼지 않게 속도를 조절하면 좋아요. 칭찬과 반응에 크게 힘을 얻어요.",
    work: "사람 앞에 서는 일, 아이디어를 널리 알리는 일에서 빛나요. 꾸준함이 숙제라서 작은 마감을 여러 개 만들면 열정이 식지 않아요.",
    money:
      "기분 좋게 쓰고 나눠요. 한 번에 크게 쓰기보다 매달 자동으로 모이는 장치를 두면 마음이 편해요.",
    people:
      "어디서나 분위기를 데우는 사람이에요. 내 에너지가 상대에게는 과할 때도 있어서, 상대의 반응을 한 번 살피는 여유가 도움이 돼요.",
  },
  {
    inner:
      "조용하고 따뜻해 보이지만 속에는 깊은 집중과 감성이 타올라요. 관심 있는 것엔 끝까지 파고들고, 마음의 상처는 오래 간직해요.",
    love: "한 사람에게 깊이 몰입하는 섬세한 사랑이에요. 말없이 챙기는 행동으로 마음을 보여 주고, 상대도 그만큼 알아주길 바라요. 서운함은 쌓기 전에 한 줄씩 꺼내 보세요.",
    work: "깊이 파고드는 연구, 창작, 상담, 기획에서 능력이 나와요. 혼자 몰입할 시간이 충분할 때 성과가 커요.",
    money:
      "신중하고 꼼꼼해서 새는 돈이 적어요. 마음 쓰는 곳에는 아끼지 않는 편이라 ‘나를 위한 선물’도 챙기세요.",
    people:
      "소수와 오래 깊이 사귀어요. 넓은 인맥보다 마음이 통하는 몇 사람이 큰 힘이 돼요.",
  },
  {
    inner:
      "겉은 듬직하고 느긋해 보여도 속에서는 많은 것을 오래 품고 있어요. 약속과 책임을 무겁게 여기고, 변화는 천천히 받아들여요.",
    love: "표현은 느리지만 한번 마음을 주면 산처럼 변함없는 사랑이에요. 행동으로 챙기는 만큼 말로도 ‘좋아해’를 건네면 상대가 훨씬 안심해요.",
    work: "중심을 잡고 조직을 안정시키는 역할에 강해요. 관리, 운영, 책임지는 자리에서 신뢰를 얻어요. 새로운 방식도 작은 실험으로 시작하면 부담이 줄어요.",
    money:
      "안정적으로 모으는 힘이 있어요. 너무 지키기만 하면 기회를 놓칠 수 있으니 작은 도전 자금을 따로 두세요.",
    people:
      "주변 사람들의 든든한 쉼터예요. 모두의 고민을 품다 지칠 수 있으니 내 이야기도 꺼내 놓는 연습이 필요해요.",
  },
  {
    inner:
      "부드럽고 포근해 보이지만 속은 현실 감각이 또렷해요. 남을 먼저 챙기고 자기 얘기는 뒤로 미루다 속으로 걱정을 키우기도 해요.",
    love: "상대를 챙기고 키워 주는 다정한 사랑이에요. 헌신이 지나쳐 내가 지치지 않게, 받는 것도 연습해 보세요.",
    work: "사람을 돌보고 길러 내는 일, 꼼꼼한 실무에서 능력이 나와요. 숫자와 계획에 밝아서 살림꾼 같은 역할이 잘 맞아요.",
    money:
      "알뜰하고 현실적이에요. 작은 것부터 불려 가는 방식이 어울려요. 남을 위해 쓰는 돈이 많아지면 한도를 정하세요.",
    people:
      "함께 있으면 마음이 놓이는 사람이에요. 거절을 어려워해서 부탁이 몰릴 수 있으니 ‘생각해 보고 알려줄게’라는 문장을 준비해 두세요.",
  },
  {
    inner:
      "겉은 단단하고 시원시원하지만 속은 의리와 정의감으로 뜨거워요. 한번 정하면 돌아보지 않는 결단이 있고, 불의를 보면 참기 어려워요.",
    love: "솔직하고 의리 있는 사랑이에요. 애정 표현은 서툴러도 위기에 곁을 지키는 사람이에요. 말이 날카롭게 나가지 않게 한 템포 쉬면 좋아요.",
    work: "결단하고 정리하고 밀어붙이는 일에서 강해요. 위기 상황 해결, 영업, 기술, 관리에서 빛나요. 속도가 빠른 만큼 팀원의 보폭을 함께 살피세요.",
    money:
      "필요할 때 과감하게 쓰고 벌어요. 의리로 나가는 보증이나 빌려주기는 신중하세요.",
    people:
      "믿으면 끝까지 가는 의리파예요. 직설이 상처가 될 수 있으니 칭찬을 먼저 건네는 습관이 인간관계를 부드럽게 해요.",
  },
  {
    inner:
      "세련되고 깔끔해 보이지만 속은 예민하고 자존심이 강해요. 완성도에 대한 눈이 높아 스스로에게도 엄격해요.",
    love: "섬세하고 로맨틱한 사랑이에요. 상대의 말 한마디, 분위기 하나를 크게 느껴요. 상처받은 마음을 혼자 오래 간직하지 말고 말로 풀어 보세요.",
    work: "디테일과 안목이 필요한 일, 품질을 책임지는 일에서 돋보여요. 완벽을 기다리다 시작을 놓치지 않게 ‘일단 제출’ 규칙을 정해 보세요.",
    money:
      "좋은 것을 알아보는 눈이 있어 가치 있는 곳에 써요. 취향 소비가 커질 수 있으니 월 한도를 정해 두면 안심돼요.",
    people:
      "품위 있게 거리를 두며 신뢰를 쌓아요. 마음을 열기까지 시간이 걸리지만 열면 오래가요.",
  },
  {
    inner:
      "겉은 자유롭고 넓어 보이지만 속은 생각이 많고 감정의 깊이가 커요. 하고 싶은 게 많아 마음이 여러 갈래로 흐를 때도 있어요.",
    love: "넓은 마음으로 상대를 받아들이는 자유로운 사랑이에요. 속박을 싫어해서 연락이나 약속 방식을 서로 미리 정해 두면 편안해요.",
    work: "큰 판을 읽고 전략을 짜는 일, 여러 분야를 오가는 일에서 능력이 나와요. 산만해지지 않게 이번 달의 중심 목표 하나를 정해 두세요.",
    money:
      "돈의 흐름을 읽는 감이 있어요. 흐르는 만큼 새기도 쉬워서 자동 저축 같은 둑을 만들어 두면 좋아요.",
    people:
      "누구에게나 열려 있는 포용력이 있어요. 속마음을 잘 안 보여 줘서 ‘이 사람은 어렵다’는 오해를 받을 수 있으니, 가끔 내 마음을 먼저 말해 보세요.",
  },
  {
    inner:
      "조용하고 차분해 보이지만 속에는 풍부한 감수성과 직관이 흘러요. 눈치가 빨라 분위기를 먼저 읽고, 생각이 길어지면 걱정도 함께 늘어요.",
    love: "상대의 마음을 섬세하게 읽고 스며드는 사랑이에요. 확신이 설 때까지 오래 지켜보는 편이라, 마음을 조금만 더 일찍 표현하면 인연이 가까워져요.",
    work: "관찰, 연구, 글, 상담, 기획처럼 섬세한 감각이 필요한 일에 잘 맞아요. 걱정이 많아지면 할 일을 쪼개서 오늘 한 칸만 채우세요.",
    money:
      "조용히 꾸준히 모아 가요. 불안해서 쓰는 소비(위로 쇼핑)를 알아채면 지출이 줄어요.",
    people:
      "말없이 곁에 있어 주는 위로 같은 사람이에요. 속으로만 삭이지 말고 ‘요즘 이래서 힘들어’를 한 번씩 털어놓으세요.",
  },
];

// 월지(자축인묘…) 12개: 태어난 달의 계절 이야기. 달력 달이 아니라 절기 기준이라 '대략'이다.
const SEASON_STORY: { name: string; text: string }[] = [
  {
    name: "한겨울의 깊은 물 (대략 12월)",
    text: "가장 깊은 겨울에 태어났어요. 겉은 잠잠해 보여도 안에서 에너지를 모으는 시기의 기운이라, 준비하고 기다리는 힘이 있어요.",
  },
  {
    name: "겨울 끝자락의 얼어붙은 땅 (대략 1월)",
    text: "봄을 기다리는 겨울의 끝, 단단히 얼어 있지만 곧 풀릴 땅의 기운이에요. 인내와 끈기를 품고 있어요.",
  },
  {
    name: "싹이 올라오는 이른 봄 (대략 2월)",
    text: "입춘 무렵 막 봄이 시작될 때예요. 시작하고 뻗어 나가려는 에너지가 만들어지는 달이에요.",
  },
  {
    name: "꽃 피는 봄 한가운데 (대략 3월)",
    text: "나무가 가장 활기차게 자라는 봄이에요. 성장, 호기심, 사교의 기운이 풍부해요.",
  },
  {
    name: "촉촉한 흙의 늦봄 (대략 4월)",
    text: "봄이 여름으로 넘어가는 환절기, 물기를 머금은 흙이에요. 변화를 품으면서도 현실을 다지는 기운이에요.",
  },
  {
    name: "햇살이 오르는 초여름 (대략 5월)",
    text: "여름이 시작되어 열기가 올라오는 달이에요. 표현과 열정, 존재감이 빛나요.",
  },
  {
    name: "해가 가장 높은 한여름 (대략 6월)",
    text: "가장 뜨거운 여름이에요. 에너지와 열정이 최고조라 눈에 띄고, 식히는 지혜가 함께 필요해요.",
  },
  {
    name: "마른 흙의 늦여름 (대략 7월)",
    text: "한여름 열기가 남은 환절기, 무르익은 흙의 기운이에요. 결실을 준비하는 성숙함이 있어요.",
  },
  {
    name: "서늘한 바람이 부는 초가을 (대략 8월)",
    text: "가을이 열리는 때, 정리하고 거두는 쇠의 기운이 시작돼요. 결단과 실행의 힘이 있어요.",
  },
  {
    name: "맑고 단단한 한가을 (대략 9월)",
    text: "가을이 가장 선명한 때예요. 깔끔함과 완성도를 추구하는 기운이 짙어요.",
  },
  {
    name: "메마른 흙의 늦가을 (대략 10월)",
    text: "가을이 겨울로 넘어가는 환절기, 마른 흙이에요. 지키고 정리하는 책임의 기운이 있어요.",
  },
  {
    name: "물이 차오르는 초겨울 (대략 11월)",
    text: "겨울이 시작되는 때, 물의 기운이 차오르며 생각과 지혜가 깊어져요.",
  },
];
const SEASON_REL: Record<Relation, string> = {
  same: "태어난 계절이 내 오행과 같은 기운이라 타고난 색이 진해요. 장점이 선명한 만큼 한쪽으로 치우치지 않게 다른 기운도 챙기면 좋아요.",
  helps:
    "계절이 나를 북돋아 주는 기운이라 기본 체력과 버티는 힘이 든든해요. 도움을 잘 받는 편이니 고마움 표현을 잊지 마세요.",
  gives:
    "계절의 기운을 내가 키워 주는 구조라 베풀고 표현하는 데 에너지를 많이 써요. 충전 시간을 일정에 미리 넣어 두세요.",
  rules:
    "내가 다루고 이끄는 기운의 계절이라 현실을 장악하려는 마음이 강해요. 성취욕이 큰 만큼 쉬는 날도 계획하세요.",
  pressed:
    "계절의 기운이 나를 단련시키는 구조라 책임과 압박 속에서 성장해요. 힘들 땐 혼자 버티지 말고 도움을 청하세요.",
};
const STAGE_REL: Record<Relation, string> = {
  same: "나와 같은 기운이 받쳐 주어 자기 색이 선명해지는 자리예요",
  helps: "나를 북돋아 주는 기운이 들어와 든든하게 힘을 받는 자리예요",
  gives: "내가 힘을 쏟고 표현하게 되는 자리예요",
  rules: "내가 다루고 챙기려는 마음이 커지는 자리예요",
  pressed: "나를 단련시키는 기운이 있어 책임감이 자라는 자리예요",
};
const BALANCE: Record<Element, { add: string[]; calm: string[] }> = {
  목: {
    add: ["아침에 10분 걷기나 스트레칭", "새로 배우는 작은 취미 하나 시작하기", "초록 소품이나 화분 곁에 두기"],
    calm: ["하고 싶은 일 중 하나만 골라 끝까지 해 보기", "쉬는 날은 일정을 비워 두기"],
  },
  화: {
    add: ["하루 한 번 감정을 말이나 글로 꺼내기", "햇볕 쬐며 걷기", "좋아하는 노래에 몸 움직이기"],
    calm: ["말하기 전에 숨 한 번 고르기", "잠들기 전 화면을 줄이고 차분한 시간 갖기"],
  },
  토: {
    add: ["같은 시간에 식사하고 잠자리에 들기", "집 정리정돈 15분", "동네 단골 가게 하나 만들기"],
    calm: ["다 떠안지 말고 한 가지 나눠 맡기기", "새로운 방식 하나 시도해 보기"],
  },
  금: {
    add: ["미뤄 둔 일 하나 오늘 끝내기", "책상이나 옷장 정리하기", "할 일에 마감 시간 적어 두기"],
    calm: ["완벽 대신 70점짜리 초안 내 보기", "비판보다 칭찬 한마디 먼저 건네기"],
  },
  수: {
    add: ["하루 10분 아무것도 안 하는 시간", "충분히 자고 따뜻한 물 마시기", "일기 한 줄 쓰기"],
    calm: ["머릿속 생각을 종이에 적어 비우기", "고민은 하루에 한 가지만 붙잡기"],
  },
};

export interface Chip {
  text: string;
}
export interface Section {
  id: string;
  eyebrow: string;
  title: string;
  friend: FriendKind;
  summary: [string, string, string];
  body: string[];
  basis: string[];
}
export interface Verdict {
  category: string;
  headline: string;
  text: string;
  personal: string; // 내 일간이 이 고민에서 보이는 모습(고민 분류별)
  todo: string[];
  basis: string[];
}
export interface ReadingData {
  dayStem: number;
  dayEl: Element;
  friend: FriendKind;
  image: string;
  trait: string;
  counts: Record<Element, number>;
  dominant: Element[];
  missing: Element[];
  sections: Section[];
  strengths: string[];
  weaknesses: string[];
}

// 한글 받침에 맞는 조사(이/가, 과/와). 마지막 글자가 한글이 아니면 받침이 있는 것으로 본다.
function hasBatchim(word: string): boolean {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  return true;
}
const iga = (w: string) => `${w}${hasBatchim(w) ? "이" : "가"}`;
const ieyoOf = (w: string) => (hasBatchim(w) ? "이에요" : "예요");
const ieyo = (w: string) => `${w}${ieyoOf(w)}`;
const iraneun = (w: string) => `${w}${hasBatchim(w) ? "이라는" : "라는"}`;
const gwawa = (w: string) => `${w}${hasBatchim(w) ? "과" : "와"}`;


// ── 올해·내년 흐름: 입춘 기준 해의 간지(결정론). 길흉 판정이 아니라 오행 관계 비유다.
export interface YearGanji {
  year: number;
  stem: number;
  branch: number;
  hanja: string;
  ko: string;
}
// 한국 시각 기준 지금이 속한 해(입춘 전이면 전년)
export function ganjiYearAt(now: Date): number {
  const y = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const ipchun = solarTermsUtc(y)[0]!; // 황경 315° = 입춘
  return now.getTime() < ipchun.getTime() ? y - 1 : y;
}
export function yearGanji(year: number): YearGanji {
  const stem = (((year - 4) % 10) + 10) % 10;
  const branch = (((year - 4) % 12) + 12) % 12;
  return {
    year,
    stem,
    branch,
    hanja: STEMS[stem]! + BRANCHES[branch]!,
    ko: STEM_KO[stem]! + BRANCH_KO[branch]!,
  };
}
const YEAR_MOOD: Record<Relation, { head: string; line: string; tip: string }> = {
  same: {
    head: "나다움이 선명해지는 분위기",
    line: "나와 같은 기운이 곁에 앉는 해라서, 내 방식이 또렷해지는 대신 고집도 같이 커지기 쉬워요.",
    tip: "내 방식을 밀어붙이기 전에 다른 사람 의견을 한 번만 더 들어 봐요.",
  },
  helps: {
    head: "받쳐 주는 손이 많아지는 분위기",
    line: "나를 살려 주는 기운이 들어오는 해라서, 배우고 도움받는 일이 자연스럽게 늘어나는 비유가 어울려요.",
    tip: "도움을 받을 수 있을 때는 미루지 말고 먼저 물어봐요.",
  },
  gives: {
    head: "꺼내 쓰는 기운이 많아지는 분위기",
    line: "내가 기운을 내어 쓰는 쪽의 해라서, 표현하고 움직일 일이 늘어요. 대신 쉬는 시간을 챙겨야 지치지 않아요.",
    tip: "일정을 채우는 만큼 아무것도 안 하는 칸을 하나씩 비워 둬요.",
  },
  rules: {
    head: "해 볼 일이 눈에 들어오는 분위기",
    line: "내가 다루는 쪽의 기운이 들어오는 해라서, 손에 잡히는 목표가 보이기 쉬워요. 욕심이 앞서면 무리가 되니 속도 조절이 필요해요.",
    tip: "목표를 세 개 이하로 줄이고, 하나를 끝내고 다음으로 가요.",
  },
  pressed: {
    head: "속도를 조절하게 되는 분위기",
    line: "나를 누르는 쪽의 기운이 들어오는 해라서, 신경 쓸 일이 늘고 마음이 바빠지기 쉬워요. 천천히 정리하며 가면 충분히 넘어가는 비유예요.",
    tip: "급한 일과 중요한 일을 나눠 적고, 급하지만 안 중요한 일은 과감히 미뤄요.",
  },
};

// 10년 단위 흐름(대운) 분위기 비유. 천간 오행과 내 일간의 관계만 쓰고 십성 의미·길흉은 쓰지 않는다.
const DAEUN_MOOD: Record<Relation, { head: string; line: string }> = {
  same: {
    head: "나다움을 다지는 10년",
    line: "나와 같은 기운이 오래 곁에 머무는 시기라서, 내 방식과 색깔이 단단해지는 비유가 어울려요. 같은 기운이 겹치는 만큼 고집이 굳지 않게 가끔 다른 시각을 빌려 봐요.",
  },
  helps: {
    head: "기대며 자라는 10년",
    line: "나를 살려 주는 기운이 오래 이어지는 시기라서, 배우고 도움받으며 자라는 비유가 어울려요. 받는 데 익숙해지기보다 배운 것을 직접 써 보면 더 남아요.",
  },
  gives: {
    head: "꺼내 쓰며 펼치는 10년",
    line: "내가 기운을 내어 쓰는 쪽의 시기라서, 표현하고 만들고 움직일 일이 많은 비유가 어울려요. 오래 달리는 구간이니 체력과 쉬는 시간을 일정에 먼저 넣어 둬요.",
  },
  rules: {
    head: "목표를 손에 쥐는 10년",
    line: "내가 다루는 쪽의 기운이 들어오는 시기라서, 해 볼 목표가 눈에 잘 들어오는 비유가 어울려요. 욕심이 앞서면 지치기 쉬우니 한 번에 하나씩 쌓아 가요.",
  },
  pressed: {
    head: "기본기를 단단히 하는 10년",
    line: "나를 누르는 쪽의 기운이 들어오는 시기라서, 신경 쓸 일이 늘고 마음이 바쁜 비유가 어울려요. 천천히 기본기를 다져 두면 이후에 버티는 힘이 커지는 쪽으로 읽어요.",
  },
};

const label = (p: Pillar) => `${p.hanja}(${p.ko})`;

export function buildReading(
  p: SajuPreview,
  now: Date = new Date(),
  daeun: Daeun | null = null,
): ReadingData | null {
  if (!p.ok || !p.pillars || !p.elements) return null;
  const { year, month, day, hour } = p.pillars;
  const counts = p.elements;
  const dayEl = stemElement(day.stem);
  const info = STEM_INFO[day.stem]!;
  const max = Math.max(...ELEMENTS.map((e) => counts[e]));
  const dominant = ELEMENTS.filter((e) => counts[e] === max);
  const missing = ELEMENTS.filter((e) => counts[e] === 0);
  const least = Math.min(...ELEMENTS.map((e) => counts[e]));
  const weakest = ELEMENTS.filter((e) => counts[e] === least);
  const dom = dominant[0]!;
  const friend = EL_FRIEND[dayEl];
  const total = p.charCount ?? 8;
  const brRel = relation(dayEl, branchElement(day.branch));
  const monthRel = relation(dayEl, branchElement(month.branch));

  const chipDay = `일간 ${day.hanja.charAt(0)}(${EL_WORD[dayEl]})`;
  const chipCount = `오행 ${dominant.map((e) => `${e} ${counts[e]}`).join("·")}`;
  const lackText = missing.length
    ? `${missing.map((e) => EL_WORD[e]).join("·")}(${missing.map((e) => EL_HANJA[e]).join("·")})${hasBatchim(missing.map((e) => EL_WORD[e]).join("·")) ? "이" : "가"} 하나도 없어요`
    : `${iga(weakest.map((e) => EL_WORD[e]).join("·"))} 가장 적어요`;
  const lackEl = (missing[0] ?? weakest[0])!;
  const deep = STEM_DEEP[day.stem]!;
  const monthEl = branchElement(month.branch);
  const season = SEASON_STORY[month.branch]!;
  const firstSentence = (t: string) => t.match(/^.*?[요다]\./)?.[0] ?? t;
  const lackPerson: Record<Element, string> = {
    목: "새로운 걸 같이 시도해 주는 사람",
    화: "표현과 웃음을 나눠 주는 사람",
    토: "생활을 안정시켜 주는 든든한 사람",
    금: "정리와 결단을 도와주는 사람",
    수: "마음을 차분히 들어주는 사람",
  };

  const sections: Section[] = [];

  sections.push({
    id: "summary",
    eyebrow: "한마디로",
    title: `${info.image}, ${DOMINANT_NOTE[dom].replace(/ 편이에요$/, "")}`,
    friend,
    summary: [
      `일간 ${day.hanja.charAt(0)}(${EL_WORD[dayEl]}) — ${info.trait}`,
      `${total}글자 중 ${dominant.map((e) => EL_WORD[e]).join("·")} 기운이 ${max}개로 가장 많아요`,
      `${lackText}`,
    ],
    body: [
      `태어난 날의 하늘 글자가 ${day.hanja.charAt(0)}(${EL_WORD[dayEl]}) ${ieyoOf(STEM_KO[day.stem]!)}. 사주에서는 이 글자를 ‘나 자신’으로 보고, ${info.image}에 빗대요. ${iga(info.trait)} 첫인상으로 남는 편이에요.`,
      `여덟 글자를 통틀어 ${dominant.map((e) => EL_WORD[e]).join("·")} 기운이 가장 많아서 ${DOMINANT_NOTE[dom]}. 반대로 ${lackText}, 이쪽은 일부러 채워 주면 균형이 좋아져요.`,
    ],
    basis: [chipDay, chipCount, `연주 ${label(year)}`],
  });

  sections.push({
    id: "inner",
    eyebrow: "겉모습과 속마음",
    title: `${info.image}의 속마음`,
    friend,
    summary: [
      `겉모습: ${info.trait}`,
      firstSentence(deep.inner),
      `강점은 ${info.strengths.join("·")}`,
    ],
    body: [
      deep.inner,
      `${iga(info.weaknesses.join("·"))} 올라올 땐 ‘지금 내 속마음은 뭐지?’ 하고 한 박자 쉬어 가 보세요.`,
    ],
    basis: [chipDay],
  });

  sections.push({
    id: "elements",
    eyebrow: "오행으로 보는 사주",
    title: `다섯 기운의 지도: ${ELEMENTS.map((e) => `${EL_HANJA[e]}${counts[e]}`).join(" ")}`,
    friend: EL_FRIEND[dom],
    summary: [
      `${ELEMENTS.map((e) => `${EL_WORD[e]} ${counts[e]}`).join(" · ")}`,
      missing.length
        ? "비어 있는 기운은 '나쁨'이 아니라 '배울 자리'예요"
        : "다섯 기운이 모두 있어서 균형의 바탕이 있어요",
      `채우고 싶다면: ${MISSING_TIP[lackEl]}`,
    ],
    body: [
      `${DOMINANT_NOTE[dom]}. 그만큼 그 기운과 관련된 일에서는 힘을 덜 들이고도 성과를 내기 쉬워요.`,
      `${EL_WORD[lackEl]}(${EL_HANJA[lackEl]}) 기운은 ${missing.includes(lackEl) ? "사주에 없어서" : "비교적 적어서"} 의식적으로 챙기면 좋아요. ${MISSING_TIP[lackEl]}이 도움이 돼요.`,
    ],
    basis: [`${total}글자 기준`, chipCount],
  });

  sections.push({
    id: "day",
    eyebrow: `나라는 사람 · 일주 ${day.hanja}`,
    title: `${info.image}, ${EL_WORD[branchElement(day.branch)]} 위에 서다`,
    friend: EL_FRIEND[branchElement(day.branch)],
    summary: [
      `일지 ${day.hanja.charAt(1)}(${EL_WORD[branchElement(day.branch)]})가 나와 맺는 관계`,
      `${REL_BRANCH[brRel].replace(/ 편이에요$/, "")}`,
      `월지 ${month.hanja.charAt(1)}(${EL_WORD[branchElement(month.branch)]})의 영향도 함께 봐요`,
    ],
    body: [
      `태어난 날의 땅 글자는 ${day.hanja.charAt(1)}, 오행으로는 ${ieyo(EL_WORD[branchElement(day.branch)])}. ${REL_BRANCH[brRel]}.`,
      `태어난 달의 땅 글자 ${month.hanja.charAt(1)}(${EL_WORD[branchElement(month.branch)]})는 ${REL_BRANCH[monthRel]}. 두 글자를 함께 보면 겉으로 보이는 나와 환경에서 받는 영향의 결이 읽혀요.`,
    ],
    basis: [
      `일지 ${day.hanja.charAt(1)}`,
      `월지 ${month.hanja.charAt(1)}`,
      `일주 ${label(day)}`,
    ],
  });

  const stageRows = [
    { name: "연주", ctx: "뿌리와 어린 시절 환경", p: year },
    { name: "월주", ctx: "사회생활과 청년기의 무대", p: month },
    { name: "일주", ctx: "나 자신과 가까운 관계의 자리", p: day },
    ...(hour ? [{ name: "시주", ctx: "마무리와 후반부, 꿈의 무대", p: hour }] : []),
  ];

  sections.push({
    id: "season",
    eyebrow: `태어난 계절 · 월지 ${month.hanja.charAt(1)}`,
    title: season.name,
    friend: EL_FRIEND[monthEl],
    summary: [
      season.name,
      `월지 ${month.hanja.charAt(1)}(${EL_WORD[monthEl]})와 나의 관계`,
      firstSentence(SEASON_REL[monthRel]),
    ],
    body: [
      season.text,
      SEASON_REL[monthRel],
      "달은 달력의 달이 아니라 절기를 기준으로 해요. 달이 바뀌는 경계 가까이에 태어났다면 계산 근거의 월주를 함께 확인해 주세요.",
    ],
    basis: [`월지 ${month.hanja.charAt(1)}`, `월주 ${label(month)}`],
  });

  sections.push({
    id: "stage",
    eyebrow: "네 기둥으로 보는 인생 무대",
    title: `${stageRows.map((r) => r.name).join("·")}, 시기마다 다른 무대`,
    friend: EL_FRIEND[branchElement(year.branch)],
    summary: [
      stageRows.map((r) => `${r.name} ${r.p.hanja}`).join(" · "),
      "어린 시절 → 청년기 → 나 → 후반부 순서로 읽어요",
      hour ? "시주까지 모두 읽었어요" : "시주는 출생 시간을 알면 더해져요",
    ],
    body: [
      "사주의 네 기둥은 전통적으로 인생의 시기와 자리를 나눠 읽는 틀이에요. 재미있게 참고해 보세요.",
      ...stageRows.map((r) => {
        const be = branchElement(r.p.branch);
        return `${r.name} ${label(r.p)} — ${r.ctx}. ${EL_WORD[be]} 기운의 자리로, ${STAGE_REL[relation(dayEl, be)]}.`;
      }),
      ...(hour ? [] : ["출생 시간을 몰라 시주(후반부·꿈의 무대)는 읽지 못했어요."]),
    ],
    basis: stageRows.map((r) => `${r.name} ${r.p.hanja}`),
  });

  sections.push({
    id: "love",
    eyebrow: "연애·결혼 스타일",
    title: `${EL_WORD[dayEl]} 기운의 사랑법`,
    friend: "ssi",
    summary: [
      firstSentence(deep.love),
      `일지 ${day.hanja.charAt(1)}(${EL_WORD[branchElement(day.branch)]})는 가까운 사람의 자리`,
      "마음을 말로 꺼내면 인연이 가까워져요",
    ],
    body: [
      deep.love,
      `일지 ${day.hanja.charAt(1)}(${EL_WORD[branchElement(day.branch)]})는 전통적으로 가까운 사람의 자리로 읽어요. 이 자리는 ${REL_BRANCH[brRel]}. 곁에 오래 두는 사람에게서 느끼는 안정감이나 긴장감의 결로 가볍게 참고해 보세요.`,
    ],
    basis: [chipDay, `일지 ${day.hanja.charAt(1)}`],
  });

  sections.push({
    id: "work",
    eyebrow: "일과 재물",
    title: "일하는 방식과 돈 쓰는 법",
    friend: EL_FRIEND[dom],
    summary: [
      firstSentence(deep.work),
      firstSentence(deep.money),
      `${EL_WORD[dom]} 기운이 많아 그쪽 일이 수월해요`,
    ],
    body: [
      deep.work,
      deep.money,
      `${EL_WORD[dom]} 기운이 많은 사주는 그 기운과 닮은 일에서 힘을 덜 들이고 성과를 내기 쉬워요.`,
    ],
    basis: [chipDay, chipCount],
  });

  sections.push({
    id: "people",
    eyebrow: "사람 관계",
    title: "사람 사이에서 나는 이런 사람",
    friend: "rabbit",
    summary: [
      firstSentence(deep.people),
      `${EL_WORD[lackEl]} 기운이 ${missing.includes(lackEl) ? "비어" : "적어"} 있어요`,
      `곁에 두면 좋은 사람: ${lackPerson[lackEl]}`,
    ],
    body: [
      deep.people,
      `${EL_WORD[lackEl]}(${EL_HANJA[lackEl]}) 기운이 ${missing.includes(lackEl) ? "사주에 없어서" : "비교적 적어서"}, ${lackPerson[lackEl]}이 곁에 있으면 서로 부족한 부분이 채워져요.`,
    ],
    basis: [chipDay, chipCount],
  });

  {
    const y1 = yearGanji(ganjiYearAt(now));
    const y2 = yearGanji(y1.year + 1);
    const part = (g: YearGanji) => {
      const se = stemElement(g.stem);
      const be = branchElement(g.branch);
      const rel = relation(dayEl, se);
      const fills =
        (se === lackEl ? 1 : 0) + (be === lackEl ? 1 : 0);
      return { g, se, be, rel, mood: YEAR_MOOD[rel], fills };
    };
    const a = part(y1);
    const b = part(y2);
    const fillText = (x: ReturnType<typeof part>) =>
      x.fills > 0
        ? `${x.g.ko}년에는 내게 적은 ${EL_WORD[lackEl]} 기운이 ${x.fills === 2 ? "두 글자 모두" : "한 글자"} 들어와요.`
        : `${x.g.ko}년의 글자에는 내게 적은 ${EL_WORD[lackEl]} 기운이 없어서, 균형 처방 습관으로 직접 채워 봐요.`;
    const yearBody = (
      x: ReturnType<typeof part>,
      which: string,
      same?: boolean,
    ) =>
      `${which} ${x.g.hanja}(${x.g.ko})년은 ${EL_WORD[x.se]}(${EL_HANJA[x.se]}) 기운 위에 ${EL_WORD[x.be]}(${EL_HANJA[x.be]}) 기운이 얹힌 해예요. ${same ? "올해와 같은 결의 분위기가 한 해 더 이어지는 비유예요." : x.mood.line} ${fillText(x)}`;
    sections.push({
      id: "year",
      eyebrow: "올해·내년 흐름",
      title: `${a.g.ko}년은 ${a.mood.head}`,
      friend: EL_FRIEND[a.se],
      summary: [
        `${a.g.hanja}(${a.g.ko})년 — ${a.mood.head}`,
        `${b.g.hanja}(${b.g.ko})년 — ${b.mood.head}`,
        `올해 한 가지: ${a.mood.tip}`,
      ],
      body: [
        yearBody(a, "올해"),
        yearBody(b, "내년", a.rel === b.rel),
        ...(a.rel === b.rel ? [] : [`내년을 미리 준비한다면: ${b.mood.tip}`]),
        "해가 바뀌는 기준은 입춘(2월 초)이에요. 길흉을 맞히는 풀이가 아니라, 해의 오행과 내 일간을 견준 분위기 비유예요.",
      ],
      basis: [
        chipDay,
        `올해 ${a.g.hanja}(${a.g.ko})`,
        `내년 ${b.g.hanja}(${b.g.ko})`,
      ],
    });
  }

  if (daeun && daeun.pillars.length > 0) {
    const nowAge = (now.getTime() - daeun.birthUtcMs) / (365.2425 * 86_400_000);
    const ps = daeun.pillars;
    let idx = -1;
    for (let i = 0; i < ps.length; i++)
      if (ps[i]!.startAgeYears <= nowAge) idx = i;
    const lastEnd = ps[ps.length - 1]!.startAgeYears + 10;
    if (nowAge >= 0 && nowAge < lastEnd) {
      const notYet = idx < 0;
      const cur = notYet ? ps[0]! : ps[idx]!;
      const nxt = notYet ? ps[1] : ps[idx + 1];
      const se = stemElement(cur.stem);
      const be = branchElement(cur.branch);
      const mood = DAEUN_MOOD[relation(dayEl, se)];
      const fills = (se === lackEl ? 1 : 0) + (be === lackEl ? 1 : 0);
      const span = (d: (typeof ps)[number], next?: (typeof ps)[number]) =>
        `만 ${d.startAge.years}세~${next ? next.startAge.years : d.startAge.years + 10}세(${d.startYear}년경~)`;
      const lead = notYet
        ? `아직 첫 10년 흐름이 시작되기 전이에요(약 만 ${cur.startAge.years}세 시작). 시작하면 ${cur.hanja}(${cur.ko}) 흐름이 먼저 와요.`
        : `지금은 ${cur.hanja}(${cur.ko}) 흐름 위에 있어요. ${span(cur, nxt)}.`;
      const body: string[] = [
        lead,
        `${EL_WORD[se]}(${EL_HANJA[se]}) 기운 위에 ${EL_WORD[be]}(${EL_HANJA[be]}) 기운이 얹힌 10년이에요. ${mood.line}`,
        fills > 0
          ? `이 흐름에는 내게 적은 ${EL_WORD[lackEl]} 기운이 ${fills === 2 ? "두 글자 모두" : "한 글자"} 들어 있어서, 부족한 쪽이 조금 채워지는 비유가 돼요.`
          : `이 흐름의 글자에는 내게 적은 ${EL_WORD[lackEl]} 기운이 없어요. 균형 처방 습관으로 직접 채워 보면 좋아요.`,
      ];
      if (nxt) {
        const ne = stemElement(nxt.stem);
        body.push(
          `다음 10년은 ${nxt.hanja}(${nxt.ko}) 흐름이고, ${DAEUN_MOOD[relation(dayEl, ne)].head}로 읽어요.(${span(nxt, ps[ps.indexOf(nxt) + 1])})`,
        );
      }
      body.push(
        `${daeun.timeKnown ? "" : "출생 시간을 몰라 정오로 가정해 계산해서 시작 나이가 달라질 수 있어요. "}10년 흐름은 만세력 참고 표와 같은 계산(3일=1년)이고 전문가 검증 전이에요. 길흉을 맞히는 풀이가 아니라 오행 관계로 읽은 분위기 비유예요.`,
      );
      sections.push({
        id: "daeun",
        eyebrow: "지금 10년의 계절",
        title: `${cur.ko}, ${mood.head}`,
        friend: EL_FRIEND[se],
        summary: [
          `${cur.hanja}(${cur.ko}) — ${mood.head}`,
          nxt
            ? `다음: ${nxt.hanja}(${nxt.ko}), ${DAEUN_MOOD[relation(dayEl, stemElement(nxt.stem))].head}`
            : "마지막 10년 구간이에요",
          "참고용 · 전문가 검증 전",
        ],
        body,
        basis: [chipDay, `${notYet ? "첫" : "현재"} ${cur.hanja}(${cur.ko})`, daeun.rule],
      });
    }
  }

  sections.push({
    id: "advice",
    eyebrow: "쓴소리 좀 할게",
    title: `${info.weaknesses[0]}, 이건 조심해요`,
    friend: "ssi",
    summary: [
      `${iga(info.weaknesses.join(" · "))} 도드라질 수 있어요`,
      `${EL_WORD[dom]} 기운이 많아서 한쪽으로 쏠릴 때가 있어요`,
      `처방: ${MISSING_TIP[lackEl]}`,
    ],
    body: [
      `솔직히 말하면, ${iga(info.weaknesses.join("과 "))} 올라올 때가 있어요. ${EL_WORD[dom]} 기운이 많은 사주는 그 기운 쪽으로 쏠려서 다른 시각을 놓치기 쉬워요.`,
      `한 가지만 실천해 본다면 ${MISSING_TIP[lackEl]}이에요. 작게 시작해도 균형이 달라져요.`,
    ],
    basis: [chipDay, chipCount],
  });

  sections.push({
    id: "charm",
    eyebrow: "나만의 매력",
    title: `${gwawa(info.strengths[0]!)} ${iga(info.strengths[1]!)} 빛나요`,
    friend: "turtle",
    summary: [
      `${info.strengths.join(" · ")}`,
      `${info.trait}`,
      `${EL_WORD[dom]} 기운이 받쳐줘요`,
    ],
    body: [
      `${iga(info.strengths.join(", "))} ${EL_WORD[dayEl]} 기운의 사람이 가진 무기예요. ${iraneun(info.trait)} 점이 사람들 사이에서 신뢰를 얻는 이유가 돼요.`,
    ],
    basis: [chipDay],
  });

  const bal = BALANCE[lackEl];
  const calm = BALANCE[dom].calm;
  sections.push({
    id: "habit",
    eyebrow: "균형 처방",
    title: "균형 맞추는 작은 습관",
    friend: EL_FRIEND[lackEl],
    summary: [
      `채우고 싶은 기운: ${EL_WORD[lackEl]}`,
      `넘치는 기운: ${EL_WORD[dom]}`,
      "하나만 골라 일주일 해 보세요",
    ],
    body: [
      `${EL_WORD[lackEl]}(${EL_HANJA[lackEl]}) 기운을 채우는 작은 습관: ${bal.add.map((x, i) => `${i + 1}) ${x}`).join(" ")}`,
      ...(dom === lackEl
        ? []
        : [`${EL_WORD[dom]} 기운이 센 편이니 이렇게 숨을 골라 보세요: ${calm.join(" / ")}`]),
      "건강·의학 조언이 아니라 생활 습관 제안이에요. 몸이 불편할 땐 꼭 전문가와 상담하세요.",
    ],
    basis: [chipCount],
  });

  void hour;
  return {
    dayStem: day.stem,
    dayEl,
    friend,
    image: info.image,
    trait: info.trait,
    counts,
    dominant,
    missing,
    sections,
    strengths: info.strengths,
    weaknesses: info.weaknesses,
  };
}

// ── 고민 점괘: 키워드로 분류(AI 아님). 분류 근거와 한계를 화면에 밝힌다.
const CATS: { key: string; words: string[]; head: [string, string] }[] = [
  {
    key: "이직·일",
    words: [
      "전직",
      "휴직",
      "직업",
      "일자리",
      "이직",
      "퇴사",
      "직장",
      "회사",
      "취업",
      "승진",
      "커리어",
      "일이",
      "부업",
    ],
    head: [
      "움직이되, 발판부터 깔고 가요.",
      "서두르면 쇠가 울어요. 준비하고 움직이면 길이 열려요.",
    ],
  },
  {
    key: "연애·결혼",
    words: [
      "이성",
      "고백",
      "애인",
      "헤어",
      "남자친구",
      "여자친구",
      "권태기",
      "연애",
      "결혼",
      "남친",
      "여친",
      "썸",
      "이별",
      "재회",
      "짝사랑",
      "소개팅",
    ],
    head: [
      "마음은 크게, 속도는 천천히 가요.",
      "상대보다 내 마음의 결을 먼저 알아봐요.",
    ],
  },
  {
    key: "돈·재물",
    words: [
      "대출",
      "적금",
      "부동산",
      "연봉",
      "저축","돈", "재물", "투자", "주식", "월급", "빚", "사업", "매출", "창업"],
    head: [
      "벌 힘은 있고, 새는 구멍을 먼저 막아요.",
      "크게 벌기 전에 지키는 습관이 먼저예요.",
    ],
  },
  {
    key: "시험·공부",
    words: [
      "입시",
      "대학",
      "임용",
      "고시",
      "토익","시험", "공부", "합격", "자격증", "수능", "면접", "학교"],
    head: ["꾸준함이 이기는 판이에요.", "몰아치기보다 매일 조금씩이 점괘예요."],
  },
  {
    key: "관계·가족",
    words: [
      "형제",
      "자매",
      "시댁",
      "처가",
      "친구",
      "가족",
      "부모",
      "엄마",
      "아빠",
      "동료",
      "상사",
      "인간관계",
      "갈등",
    ],
    head: [
      "한 걸음 물러서면 길이 보여요.",
      "맞서기보다 거리를 조절하는 게 유리해요.",
    ],
  },
  {
    key: "건강·마음",
    words: [
      "무기력",
      "멘탈",
      "외로",
      "슬럼프","건강", "우울", "불안", "스트레스", "번아웃", "잠", "피곤"],
    head: ["먼저 쉬어야 길이 보여요.", "몸과 마음의 기운부터 채워요."],
  },
];

export function classifyConcern(text: string): string {
  const t = text.trim();
  for (const c of CATS) if (c.words.some((w) => t.includes(w))) return c.key;
  return "기타";
}

const STUDY_STYLE: Record<Element, string> = {
  목: "한 군데에 오래 박혀 있기보다 새 단원을 넓혀 갈 때 흥이 나는 공부 스타일이에요. 계획표에 '새로 배우는 칸'과 '복습 칸'을 섞어 두면 질리지 않아요.",
  화: "의욕이 불붙으면 몰아치다가 금방 식기 쉬워요. 짧게 자주, 소리 내어 설명해 보는 공부가 잘 맞아요.",
  토: "느리지만 한 번 익히면 오래 가는 공부 스타일이에요. 매일 같은 시간·같은 자리에서 하는 루틴이 가장 큰 무기예요.",
  금: "정리와 오답 노트에서 힘이 나요. 다만 완벽하게 끝내려다 시작이 늦어지기 쉬우니 70%에서 일단 넘어가 봐요.",
  수: "흐름을 이해하면 빠르게 느는 대신 잡생각이 많아 집중이 흩어지기 쉬워요. 공부 전에 오늘 할 일 세 줄을 적어 머리를 비워 봐요.",
};
const CAT_TODO: Record<string, [string, string]> = {
  "이직·일": [
    "지금 일에서 싫은 것과 지키고 싶은 것을 세 가지씩 적어 보기",
    "가고 싶은 곳에 있는 사람 한 명의 실제 이야기 들어 보기",
  ],
  "연애·결혼": [
    "상대에게 바라는 것 말고, 내가 편안했던 순간 세 가지 적어 보기",
    "서운한 점은 그날 한 문장으로만 전해 보기",
  ],
  "돈·재물": [
    "지난달 지출을 고정비와 변동비로 나눠 적어 보기",
    "새는 구멍 한 곳만 골라 이번 주에 막아 보기",
  ],
  "시험·공부": [
    "오늘 분량을 시간이 아니라 쪽수·문제 수로 정해 보기",
    "하루 끝에 오늘 배운 것을 한 줄로 적어 보기",
  ],
  "관계·가족": [
    "그 사람에게 바라는 것과 내가 줄 수 있는 것을 따로 적어 보기",
    "대화를 '나는 ~했어'로 시작해 보기",
  ],
  "건강·마음": [
    "잠드는 시간과 일어나는 시간을 이번 주만 고정해 보기",
    "힘든 점을 하루 5분만 글로 꺼내 놓기(몸이 계속 불편하면 전문가 상담)",
  ],
};
const DEFAULT_TODO: [string, string] = [
  "고민을 세 줄로 적어 보기: 무엇이, 왜, 언제까지",
  "결정은 서두르지 말고 하루 뒤에 다시 읽어 보기",
];

export function buildVerdict(
  p: SajuPreview,
  concern: string,
  now: Date = new Date(),
): Verdict | null {
  const t = concern.trim();
  if (!t || !p.ok || !p.pillars || !p.elements) return null;
  const rd = buildReading(p, now);
  if (!rd) return null;
  const key = classifyConcern(t);
  const cat = CATS.find((c) => c.key === key);
  const lackEl = (rd.missing[0] ??
    ELEMENTS.reduce((a, b) => (p.elements![a] <= p.elements![b] ? a : b)))!;
  const deep = STEM_DEEP[rd.dayStem]!;
  const personal =
    key === "이직·일"
      ? deep.work
      : key === "연애·결혼"
        ? deep.love
        : key === "돈·재물"
          ? deep.money
          : key === "관계·가족"
            ? deep.people
            : key === "시험·공부"
              ? STUDY_STYLE[rd.dayEl]
              : deep.inner;
  const yg = yearGanji(ganjiYearAt(now));
  const yearMood = YEAR_MOOD[relation(rd.dayEl, stemElement(yg.stem))];
  const head = cat ? cat.head[0] : "서두르지 말고, 빈 곳부터 채워요.";
  const todo = CAT_TODO[key] ?? DEFAULT_TODO;
  const text = `${cat ? cat.head[1] : "고민의 결을 더 알려주면 점괘가 선명해져요."} 사주에는 ${EL_WORD[lackEl]}(${EL_HANJA[lackEl]}) 기운이 ${rd.missing.includes(lackEl) ? "없고" : "적고"}, ${EL_WORD[rd.dominant[0]!]} 기운이 가장 많아요. 그래서 ${MISSING_TIP[lackEl]}을 곁들이면 균형이 좋아져요. 올해 ${yg.ko}년은 ${yearMood.head}이라, ${yearMood.tip}`;
  return {
    category: key,
    headline: head,
    text,
    personal,
    todo: [
      todo[0],
      todo[1],
      `${MISSING_TIP[lackEl].replace(/\(.*\)/, "")} 이번 주에 한 번 해보기`,
    ],
    basis: [
      `일간 ${p.pillars.day.hanja.charAt(0)}(${EL_WORD[rd.dayEl]})`,
      `오행 ${EL_WORD[lackEl]} ${p.elements[lackEl]}개`,
      `고민 키워드: ${key}`,
      `올해 ${yg.hanja}(${yg.ko})`,
    ],
  };
}
