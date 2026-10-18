import type { Element } from "./saju";

export interface Character {
  id: string;
  stem: string;
  name: string;
  emoji: string;
  element: string;
  tone: "teal" | "vermilion" | "gold" | "indigo" | "muted";
  personality: string;
  strengths: string[];
  weaknesses: string[];
}
export const CHARACTERS: Character[] = [
  {
    id: "gap",
    stem: "甲",
    name: "솔솔 호랑이",
    emoji: "🐯",
    element: "목",
    tone: "teal",
    personality: "곧게 뻗은 소나무처럼 앞장서는 든든한 리더",
    strengths: ["추진력", "정의감", "책임감"],
    weaknesses: ["고집", "융통성 부족"],
  },
  {
    id: "eul",
    stem: "乙",
    name: "넝쿨 토끼",
    emoji: "🐰",
    element: "목",
    tone: "teal",
    personality: "어디서든 뿌리내리는 유연한 생존왕",
    strengths: ["적응력", "친화력", "섬세함"],
    weaknesses: ["눈치 과다", "결정 지연"],
  },
  {
    id: "byeong",
    stem: "丙",
    name: "해님 학",
    emoji: "🦢",
    element: "화",
    tone: "vermilion",
    personality: "모두를 비추는 밝고 따뜻한 분위기 메이커",
    strengths: ["열정", "솔직함", "표현력"],
    weaknesses: ["성급함", "금방 식음"],
  },
  {
    id: "jeong",
    stem: "丁",
    name: "등불 여우",
    emoji: "🦊",
    element: "화",
    tone: "vermilion",
    personality: "어둠 속 촛불처럼 은은히 마음을 밝히는 감성파",
    strengths: ["배려", "집중력", "직관"],
    weaknesses: ["예민함", "속앓이"],
  },
  {
    id: "mu",
    stem: "戊",
    name: "태산 곰",
    emoji: "🐻",
    element: "토",
    tone: "gold",
    personality: "큰 산처럼 묵직하게 곁을 지키는 버팀목",
    strengths: ["신뢰", "포용력", "안정감"],
    weaknesses: ["느린 변화", "무뚝뚝"],
  },
  {
    id: "gi",
    stem: "己",
    name: "들판 두꺼비",
    emoji: "🐸",
    element: "토",
    tone: "gold",
    personality: "기름진 밭처럼 사람을 키워내는 살림꾼",
    strengths: ["실속", "꼼꼼함", "돌봄"],
    weaknesses: ["걱정 많음", "소극성"],
  },
  {
    id: "gyeong",
    stem: "庚",
    name: "무쇠 까치",
    emoji: "🐦‍⬛",
    element: "금",
    tone: "indigo",
    personality: "단단한 쇠처럼 결단력 있는 해결사",
    strengths: ["결단력", "의리", "실행력"],
    weaknesses: ["직설적", "날카로움"],
  },
  {
    id: "sin",
    stem: "辛",
    name: "보석 고양이",
    emoji: "🐱",
    element: "금",
    tone: "indigo",
    personality: "반짝이는 보석처럼 섬세하고 기준 높은 완벽주의자",
    strengths: ["미적 감각", "정확성", "자존감"],
    weaknesses: ["까다로움", "상처 잘 받음"],
  },
  {
    id: "im",
    stem: "壬",
    name: "바다 거북",
    emoji: "🐢",
    element: "수",
    tone: "muted",
    personality: "넓은 바다처럼 큰 그림을 그리는 지혜로운 모험가",
    strengths: ["통찰력", "포용", "자유로움"],
    weaknesses: ["변덕", "산만함"],
  },
  {
    id: "gye",
    stem: "癸",
    name: "이슬 사슴",
    emoji: "🦌",
    element: "수",
    tone: "muted",
    personality: "새벽 이슬처럼 조용히 스며드는 영리한 전략가",
    strengths: ["총명함", "공감", "인내"],
    weaknesses: ["비밀 많음", "우울감"],
  },
];
// 창작 표현 레이어 (명리 근거 없음 — 재미용 장식, UI에 '재미용'으로 명기)
const EPITHETS = [
  "봄바람을 부르는",
  "달빛 아래",
  "복을 품은",
  "구름 위의",
  "꽃잎 속",
  "새벽을 여는",
];
const PROPS = ["복주머니", "부채", "청사초롱", "매화 가지", "엽전 꾸러미", "붓"];
export const RULE_VERSION = "char-rule-2";

// 일간(실제 계산 결과)으로 캐릭터를 고르고, 칭호·소품은 오행 개수 합으로 결정론적으로 선택
export function characterFor(dayStemIndex: number, elements: Record<Element, number>) {
  const c = CHARACTERS[dayStemIndex]!;
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  return {
    ...c,
    epithet: EPITHETS[(dayStemIndex * 3 + total) % EPITHETS.length],
    prop: PROPS[(dayStemIndex + total) % PROPS.length],
  };
}
