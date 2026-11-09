import type { Element, Pillar, SajuPreview } from "./saju";
export type { Element };
import type { FriendKind } from "@/components/Friends";

// 규칙 기반 무료 풀이(결정론). 쓰는 근거: 천간·지지의 오행, 오행 개수, 오행 상생·상극.
// 쓰지 않는 것(검증 전): 십성 판정, 신강·신약, 격국, 용신, 대운·세운.
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

const label = (p: Pillar) => `${p.hanja}(${p.ko})`;

export function buildReading(p: SajuPreview): ReadingData | null {
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
    ? `${missing.map((e) => EL_WORD[e]).join("·")}(${missing.map((e) => EL_HANJA[e]).join("·")})이 하나도 없어요`
    : `${weakest.map((e) => EL_WORD[e]).join("·")}이 가장 적어요`;
  const lackEl = (missing[0] ?? weakest[0])!;

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
      `태어난 날의 하늘 글자가 ${day.hanja.charAt(0)}(${EL_WORD[dayEl]})이에요. 사주에서는 이 글자를 ‘나 자신’으로 보고, ${info.image}에 빗대요. ${info.trait}이 첫인상으로 남는 편이에요.`,
      `여덟 글자를 통틀어 ${dominant.map((e) => EL_WORD[e]).join("·")} 기운이 가장 많아서 ${DOMINANT_NOTE[dom]}. 반대로 ${lackText}, 이쪽은 일부러 채워 주면 균형이 좋아져요.`,
    ],
    basis: [chipDay, chipCount, `연주 ${label(year)}`],
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
      `태어난 날의 땅 글자는 ${day.hanja.charAt(1)}, 오행으로는 ${EL_WORD[branchElement(day.branch)]}이에요. ${REL_BRANCH[brRel]}.`,
      `태어난 달의 땅 글자 ${month.hanja.charAt(1)}(${EL_WORD[branchElement(month.branch)]})는 ${REL_BRANCH[monthRel]}. 두 글자를 함께 보면 겉으로 보이는 나와 환경에서 받는 영향의 결이 읽혀요.`,
    ],
    basis: [
      `일지 ${day.hanja.charAt(1)}`,
      `월지 ${month.hanja.charAt(1)}`,
      `일주 ${label(day)}`,
    ],
  });

  sections.push({
    id: "advice",
    eyebrow: "쓴소리 좀 할게",
    title: `${info.weaknesses[0]}, 이건 조심해요꽥`,
    friend: "ssi",
    summary: [
      `${info.weaknesses.join(" · ")}이(가) 도드라질 수 있어요`,
      `${EL_WORD[dom]} 기운이 많아서 한쪽으로 쏠릴 때가 있어요`,
      `처방: ${MISSING_TIP[lackEl]}`,
    ],
    body: [
      `솔직히 말하면, ${info.weaknesses.join("과 ")}이 올라올 때가 있어요. ${EL_WORD[dom]} 기운이 많은 사주는 그 기운 쪽으로 쏠려서 다른 시각을 놓치기 쉬워요.`,
      `한 가지만 실천해 본다면 ${MISSING_TIP[lackEl]}이에요. 작게 시작해도 균형이 달라져요.`,
    ],
    basis: [chipDay, chipCount],
  });

  sections.push({
    id: "charm",
    eyebrow: "나만의 매력",
    title: `${info.strengths[0]}과 ${info.strengths[1]}이 빛나요`,
    friend: "turtle",
    summary: [
      `${info.strengths.join(" · ")}`,
      `${info.trait}`,
      `${EL_WORD[dom]} 기운이 받쳐줘요`,
    ],
    body: [
      `${info.strengths.join(", ")}이 ${EL_WORD[dayEl]} 기운의 사람이 가진 무기예요. ${info.trait}이라는 점이 사람들 사이에서 신뢰를 얻는 이유가 돼요.`,
    ],
    basis: [chipDay],
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
      "움직이되, 발판부터 깔고 가꽥.",
      "서두르면 쇠가 울어요. 준비하고 움직이면 길이 열려요.",
    ],
  },
  {
    key: "연애·결혼",
    words: [
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
      "마음은 크게, 속도는 천천히 가꽥.",
      "상대보다 내 마음의 결을 먼저 알아봐요.",
    ],
  },
  {
    key: "돈·재물",
    words: ["돈", "재물", "투자", "주식", "월급", "빚", "사업", "매출", "창업"],
    head: [
      "벌 힘은 있고, 새는 구멍을 먼저 막아요꽥.",
      "크게 벌기 전에 지키는 습관이 먼저예요.",
    ],
  },
  {
    key: "시험·공부",
    words: ["시험", "공부", "합격", "자격증", "수능", "면접", "학교"],
    head: [
      "꾸준함이 이기는 판이에요꽥.",
      "몰아치기보다 매일 조금씩이 점괘예요.",
    ],
  },
  {
    key: "관계·가족",
    words: [
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
      "한 걸음 물러서면 길이 보여요꽥.",
      "맞서기보다 거리를 조절하는 게 유리해요.",
    ],
  },
  {
    key: "건강·마음",
    words: ["건강", "우울", "불안", "스트레스", "번아웃", "잠", "피곤"],
    head: ["먼저 쉬어야 길이 보여요꽥.", "몸과 마음의 기운부터 채워요."],
  },
];

export function classifyConcern(text: string): string {
  const t = text.trim();
  for (const c of CATS) if (c.words.some((w) => t.includes(w))) return c.key;
  return "기타";
}

export function buildVerdict(p: SajuPreview, concern: string): Verdict | null {
  const t = concern.trim();
  if (!t || !p.ok || !p.pillars || !p.elements) return null;
  const rd = buildReading(p);
  if (!rd) return null;
  const key = classifyConcern(t);
  const cat = CATS.find((c) => c.key === key);
  const lackEl = (rd.missing[0] ??
    ELEMENTS.reduce((a, b) => (p.elements![a] <= p.elements![b] ? a : b)))!;
  const head = cat ? cat.head[0] : "서두르지 말고, 빈 곳부터 채워요꽥.";
  const text = `${cat ? cat.head[1] : "고민의 결을 더 알려주면 점괘가 선명해져요."} 사주에는 ${EL_WORD[lackEl]}(${EL_HANJA[lackEl]}) 기운이 ${rd.missing.includes(lackEl) ? "없고" : "적고"}, ${EL_WORD[rd.dominant[0]!]} 기운이 가장 많아요. 그래서 ${MISSING_TIP[lackEl]}을 곁들이면 균형이 좋아져요.`;
  return {
    category: key,
    headline: head,
    text,
    todo: [
      "고민을 세 줄로 적어보기: 무엇이, 왜, 언제까지",
      `${MISSING_TIP[lackEl].replace(/\(.*\)/, "")} 이번 주에 한 번 해보기`,
      "결정은 서두르지 말고 하루 뒤에 다시 읽어보기",
    ],
    basis: [
      `일간 ${p.pillars.day.hanja.charAt(0)}(${EL_WORD[rd.dayEl]})`,
      `오행 ${EL_WORD[lackEl]} ${p.elements[lackEl]}개`,
      `고민 키워드: ${key}`,
    ],
  };
}
