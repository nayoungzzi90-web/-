import { ELEMENTS, EL_FRIEND, relation, type Element } from "./reading";
import { FRIEND_INFO } from "@/components/Friends";

// 오행 친구 찾기(재미용 성향 놀이). 사주 계산과 무관하다: 생년월일을 쓰지 않고, 사주 결과라고 말하지 않는다.
// 10문항 × 4지선다. 문항마다 오행 하나를 빼서(5종을 번갈아) 각 오행이 정확히 8번씩 나오게 했다.
// 점수는 고른 선택지의 오행 개수. 최다 오행이 '오행 친구', 둘째가 '부캐'. 동점은 나중에 고른 쪽이 앞선다(결정론).

export interface Option {
  t: string;
  el: Element;
}
export interface Question {
  q: string;
  options: [Option, Option, Option, Option];
}

export const QUESTIONS: Question[] = [
  {
    q: "약속 장소에 도착했는데 친구가 30분 늦는대요. 나는?",
    options: [
      { t: "근처를 탐험하며 새로 생긴 가게를 찾아본다", el: "목" },
      { t: "먼저 온 사람들에게 말을 걸며 분위기를 띄운다", el: "화" },
      { t: "자리를 맡아 두고 마실 것부터 시켜 둔다", el: "토" },
      { t: "“정확히 몇 시에 와?” 시간부터 확인한다", el: "금" },
    ],
  },
  {
    q: "계획 없는 주말 아침, 눈을 떴어요.",
    options: [
      { t: "처음 가 보는 카페나 동네를 검색한다", el: "목" },
      { t: "단톡방에 “오늘 뭐 해?” 일단 던져 본다", el: "화" },
      { t: "집안을 정리하고 맛있는 브런치를 차린다", el: "토" },
      { t: "이불 속에서 영상을 보다 흘러가는 대로 보낸다", el: "수" },
    ],
  },
  {
    q: "친구가 고민을 털어놓았어요.",
    options: [
      { t: "“이렇게 해 보면 어때?” 방법을 같이 찾는다", el: "목" },
      { t: "같이 화내고 같이 웃으며 온몸으로 공감한다", el: "화" },
      { t: "“결론은 이거야” 핵심만 짚어 정리해 준다", el: "금" },
      { t: "말없이 끝까지 들으며 마음을 살핀다", el: "수" },
    ],
  },
  {
    q: "단톡방에서 나는 어떤 사람?",
    options: [
      { t: "새 소식과 링크를 물어 오는 정보통", el: "목" },
      { t: "분위기가 험해지면 화제를 돌리는 중재자", el: "토" },
      { t: "날짜·장소를 정리해 공지하는 총무", el: "금" },
      { t: "읽다가 가끔 한마디로 모두를 웃기는 사람", el: "수" },
    ],
  },
  {
    q: "여행을 떠날 때 나는?",
    options: [
      { t: "일단 표부터 끊고, 가서 즐기면 된다", el: "화" },
      { t: "모두가 편하도록 간식과 상비약을 챙긴다", el: "토" },
      { t: "시간표와 예약 내역을 표로 정리해 둔다", el: "금" },
      { t: "현지에서 눈길 가는 대로 흘러가며 구경한다", el: "수" },
    ],
  },
  {
    q: "갑자기 발표를 맡게 됐어요.",
    options: [
      { t: "일단 시작하고 하면서 다듬는다", el: "목" },
      { t: "사람들 앞이 오히려 신난다, 애드리브를 준비한다", el: "화" },
      { t: "자료를 차근차근 쌓아 안정적으로 준비한다", el: "토" },
      { t: "구조부터 잡고 불필요한 건 과감히 뺀다", el: "금" },
    ],
  },
  {
    q: "마음에 쏙 드는 물건을 발견했어요.",
    options: [
      { t: "새롭다는 게 끌린다, 써 보고 싶다", el: "목" },
      { t: "사진부터 찍어 친구들에게 자랑한다", el: "화" },
      { t: "오래 쓸 수 있는지 실용성을 따져 본다", el: "토" },
      { t: "후기를 한참 찾아보고 하루 더 생각한다", el: "수" },
    ],
  },
  {
    q: "친구와 의견이 갈렸어요.",
    options: [
      { t: "내 생각을 솔직히 말하고 서로 키워 보자고 한다", el: "목" },
      { t: "감정이 확 올라오지만 금방 풀고 웃는다", el: "화" },
      { t: "옳고 그름을 분명히 가리고 싶다", el: "금" },
      { t: "한 발 물러나 지켜보다 상대에게 맞춰 준다", el: "수" },
    ],
  },
  {
    q: "행복한 하루의 마무리는?",
    options: [
      { t: "내일 해 볼 새 계획을 적어 보며 잠든다", el: "목" },
      { t: "따뜻한 밥을 먹고 포근한 이불에 눕는다", el: "토" },
      { t: "정돈된 방, 깨끗한 책상을 보며 뿌듯해한다", el: "금" },
      { t: "잔잔한 음악과 혼자만의 생각 시간", el: "수" },
    ],
  },
  {
    q: "친구들이 나를 한마디로 말한다면?",
    options: [
      { t: "“같이 있으면 신나는 사람”", el: "화" },
      { t: "“곁에 있으면 든든한 사람”", el: "토" },
      { t: "“한 번 말하면 믿음이 가는 사람”", el: "금" },
      { t: "“깊이를 알 수 없는 사람”", el: "수" },
    ],
  },
];

export interface QuizScore {
  counts: Record<Element, number>;
  primary: Element;
  secondary: Element;
}

/** answers[i] = i번째 문항에서 고른 선택지 번호(0~3). 모든 문항에 답해야 한다. */
export function scoreQuiz(answers: number[]): QuizScore | null {
  if (answers.length !== QUESTIONS.length) return null;
  const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const last: Record<Element, number> = { 목: -1, 화: -1, 토: -1, 금: -1, 수: -1 };
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const opt = typeof a === "number" ? QUESTIONS[i]!.options[a] : undefined;
    if (!opt) return null;
    counts[opt.el]++;
    last[opt.el] = i;
  }
  const ranked = [...ELEMENTS].sort(
    (x, y) => counts[y] - counts[x] || last[y] - last[x],
  );
  const primary = ranked[0]!;
  const second = ranked[1]!;
  // 한 가지 오행만 고른 경우의 부캐는 상생 순서(목→화→토→금→수→목)의 다음 오행
  const secondary =
    counts[second] > 0
      ? second
      : ELEMENTS[(ELEMENTS.indexOf(primary) + 1) % 5]!;
  return { counts, primary, secondary };
}

export interface TypeText {
  nick: string;
  line: string;
  traits: [string, string, string];
  shine: string;
  care: string;
  tip: string;
  sub: string; // 부캐일 때 한 줄
  vibe: string; // 모임에서 많을 때 한 줄
  missing: string; // 모임에 없을 때 한 줄
}

export const TYPE_TEXT: Record<Element, TypeText> = {
  목: {
    nick: "새싹 개척자",
    line: "일단 시작하고 보는 호기심 대장",
    traits: [
      "새로운 것 앞에서 눈이 반짝여요",
      "생각보다 몸이 먼저 움직여요",
      "솔직해서 말이 시원시원해요",
    ],
    shine: "새 프로젝트, 첫 만남, 처음 가는 여행에서 빛나요",
    care: "시작은 빠른데 마무리가 흐려질 수 있어요. 끝맺을 친구를 곁에 두세요",
    tip: "오늘 하나만 새로 해 보기: 안 가 본 길로 퇴근하기",
    sub: "가끔 새싹처럼 새로운 걸 시도하는 부캐가 있어요",
    vibe: "시작하는 힘이 넘치는 모임이에요",
    missing: "새로 시작해 보자고 바람 넣는 친구가 필요해요",
  },
  화: {
    nick: "분위기 불꽃",
    line: "있는 곳마다 온도가 올라가는 분위기 메이커",
    traits: [
      "표현이 풍부하고 리액션이 커요",
      "사람을 모으고 판을 키워요",
      "감정이 빨리 달아오르고 빨리 풀려요",
    ],
    shine: "모임, 발표, 무대처럼 사람들 앞에서 빛나요",
    care: "달아오른 김에 약속을 너무 많이 잡을 수 있어요. 쉬는 날도 챙기세요",
    tip: "오늘 한 명에게 먼저 안부 인사 보내기",
    sub: "가끔 불꽃처럼 분위기를 띄우는 부캐가 있어요",
    vibe: "시끌벅적 에너지가 가득한 모임이에요",
    missing: "분위기를 확 살려 줄 흥 부자 친구가 필요해요",
  },
  토: {
    nick: "든든한 마을 어른",
    line: "곁에 있으면 마음이 놓이는 믿음직한 사람",
    traits: [
      "남을 챙기는 게 자연스러워요",
      "갈등이 생기면 중간에서 균형을 잡아요",
      "한번 맡은 일은 끝까지 해요",
    ],
    shine: "여러 사람이 얽힌 일을 안정시킬 때 빛나요",
    care: "다 떠안다 지칠 수 있어요. 도와 달라고 말하는 연습이 필요해요",
    tip: "오늘 나를 위한 따뜻한 한 끼 챙기기",
    sub: "가끔 땅처럼 든든하게 받쳐 주는 부캐가 있어요",
    vibe: "서로 챙기는 따뜻한 모임이에요",
    missing: "다 같이 편하게 중심을 잡아 줄 든든한 친구가 필요해요",
  },
  금: {
    nick: "깔끔한 해결사",
    line: "군더더기 없이 핵심을 짚는 결단의 달인",
    traits: [
      "정리하고 결정하는 게 빨라요",
      "약속과 원칙을 소중히 여겨요",
      "말은 직설적이지만 믿음이 가요",
    ],
    shine: "복잡한 일을 정리하고 마감을 지켜야 할 때 빛나요",
    care: "맞는 말도 부드럽게 전하면 더 잘 닿아요. 한마디 온기를 얹어 보세요",
    tip: "오늘 책상 위 하나만 말끔히 정리하기",
    sub: "가끔 칼날처럼 깔끔하게 정리하는 부캐가 있어요",
    vibe: "일사불란하고 결정이 빠른 모임이에요",
    missing: "흐지부지될 때 딱 정리해 줄 해결사 친구가 필요해요",
  },
  수: {
    nick: "깊은 물 관찰자",
    line: "조용히 보고 깊이 헤아리는 공감의 고수",
    traits: [
      "분위기와 사람의 마음을 잘 읽어요",
      "상황에 맞춰 유연하게 변해요",
      "혼자만의 생각 시간이 충전이에요",
    ],
    shine: "섬세한 눈치가 필요한 상담, 기획, 창작에서 빛나요",
    care: "속으로만 삭이면 아무도 몰라요. 마음을 한 줄이라도 꺼내 보세요",
    tip: "오늘 마음에 걸린 생각 한 줄 적어 보기",
    sub: "가끔 물처럼 조용히 스며드는 부캐가 있어요",
    vibe: "차분하고 깊이가 있는 모임이에요",
    missing: "한 걸음 물러나 마음을 살펴 줄 차분한 친구가 필요해요",
  },
};

export const friendName = (el: Element) => FRIEND_INFO[EL_FRIEND[el]].name;

/** a 가 b 를 만났을 때 한 줄 케미(재미용). */
export function chemistry(
  aName: string,
  a: Element,
  bName: string,
  b: Element,
): { title: string; text: string } {
  const fa = friendName(a);
  const fb = friendName(b);
  switch (relation(a, b)) {
    case "same":
      return {
        title: "쌍둥이 케미",
        text: `${aName}님과 ${bName}님은 둘 다 ${fa} 타입! 말 안 해도 통하지만, 같은 약점도 똑같이 나와요. 서로 거울 보듯 웃어넘기면 최고예요.`,
      };
    case "helps":
      return {
        title: "든든한 충전 케미",
        text: `${fb}(${bName}님)의 기운이 ${fa}(${aName}님)를 북돋아 줘요. ${aName}님은 ${bName}님 곁에서 힘이 나는 사이예요.`,
      };
    case "gives":
      return {
        title: "아낌없이 주는 케미",
        text: `${fa}(${aName}님)가 ${fb}(${bName}님)에게 힘을 나눠 주는 사이예요. ${bName}님은 고맙게 받고, ${aName}님은 지치지 않게 가끔 쉬어 가요.`,
      };
    case "rules":
      return {
        title: "리드하는 케미",
        text: `${fa}(${aName}님)가 ${fb}(${bName}님)를 이끄는 편이에요. 주도하되 ${bName}님의 속도도 물어봐 주면 훨씬 부드러워져요.`,
      };
    default:
      return {
        title: "자극하는 케미",
        text: `${fb}(${bName}님) 앞에서 ${fa}(${aName}님)는 긴장하거나 자극을 받아요. 그래서 서로를 성장시키는 사이가 될 수 있어요. 말투만 살짝 부드럽게!`,
      };
  }
}

// ── 모임 판: 닉네임과 오행 번호만 담는 링크 ──
export const BOARD_VERSION = 1;
export const BOARD_MAX = 12;
export const NAME_MAX = 8;
export interface Member {
  name: string;
  primary: Element;
  secondary: Element;
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** 닉네임 정리: 앞뒤 공백 제거, 제어문자·연속 공백 제거, 최대 길이. 비면 빈 문자열. */
export function cleanName(raw: string): string {
  // 제어문자(0~31, 127), 보이지 않는 글자(U+200B~200F, U+2028~202E)는 지운다.
  const hidden = (c: number) =>
    c <= 0x1f || c === 0x7f || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e);
  const text = [...raw]
    .filter((ch) => !hidden(ch.codePointAt(0)!))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  // 글자 단위로 자른다(이모지가 반으로 잘리지 않게). 자른 뒤 끝 공백도 정리한다.
  return [...text].slice(0, NAME_MAX).join("").trim();
}

export function encodeBoard(members: Member[]): string {
  return b64(
    JSON.stringify([
      BOARD_VERSION,
      members.map((m) => [
        m.name,
        ELEMENTS.indexOf(m.primary),
        ELEMENTS.indexOf(m.secondary),
      ]),
    ]),
  );
}

// 링크는 누구나 만들 수 있으므로 모양이 하나라도 다르면 통째로 거부한다.
export function decodeBoard(code: string): Member[] | null {
  if (
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > 1200 ||
    !/^[A-Za-z0-9_-]+$/.test(code)
  )
    return null;
  try {
    const v: unknown = JSON.parse(unb64(code));
    if (!Array.isArray(v) || v.length !== 2 || v[0] !== BOARD_VERSION)
      return null;
    const list: unknown = v[1];
    if (!Array.isArray(list) || list.length < 1 || list.length > BOARD_MAX)
      return null;
    const out: Member[] = [];
    for (const m of list as unknown[]) {
      if (!Array.isArray(m) || m.length !== 3) return null;
      const [name, p, s] = m as [unknown, unknown, unknown];
      if (typeof name !== "string" || name.length === 0) return null;
      if (cleanName(name) !== name) return null;
      if (!Number.isInteger(p) || (p as number) < 0 || (p as number) > 4)
        return null;
      if (!Number.isInteger(s) || (s as number) < 0 || (s as number) > 4)
        return null;
      out.push({
        name,
        primary: ELEMENTS[p as number]!,
        secondary: ELEMENTS[s as number]!,
      });
    }
    return out;
  } catch {
    return null;
  }
}

/** 판에 내 결과를 붙인다. 12명을 넘으면 가장 오래된 사람부터 밀려난다. */
export function addMember(board: Member[], me: Member): Member[] {
  return [...board, me].slice(-BOARD_MAX);
}

export interface BoardSummary {
  counts: Record<Element, number>;
  dominant: Element;
  missing: Element[];
  line: string;
}

export function summarizeBoard(board: Member[]): BoardSummary {
  const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const m of board) counts[m.primary]++;
  const dominant = [...ELEMENTS].sort((a, b) => counts[b] - counts[a])[0]!;
  const missing = ELEMENTS.filter((e) => counts[e] === 0);
  const first = missing[0];
  const line =
    first === undefined
      ? "다섯 친구가 모두 모였어요! 균형이 딱 맞는 모임이에요."
      : `${TYPE_TEXT[dominant].vibe}. ${TYPE_TEXT[first].missing}.`;
  return { counts, dominant, missing, line };
}

// ── 결과 화면 확장 내용(재미용 성향 놀이) ──
export interface DeepText {
  short: string; // "OO한" 형용구
  tags: [string, string, string];
  love: string;
  work: string;
  friends: string;
  money: string;
  stress: string;
  relief: string;
  mantra: string;
  lucky: { color: string; item: string; food: string; word: string };
}

export const DEEP_TEXT: Record<Element, DeepText> = {
  목: {
    short: "새로운 시도를 좋아하는",
    tags: ["#시작이반", "#호기심대장", "#일단가보자"],
    love: "마음에 들면 먼저 다가가는 직진형이에요. 함께 새로운 곳을 가 보는 데이트에서 마음이 쑥쑥 자라요. 다만 시작의 설렘이 식으면 심드렁해지기 쉬워서, 작은 이벤트를 계속 만들어 주는 사람과 잘 맞아요.",
    work: "아이디어를 내고 판을 여는 역할에서 눈에 띄어요. 정해진 반복 업무는 답답할 수 있으니 '이번 주의 새로운 시도'를 하나 끼워 넣어 보세요. 끝맺음은 체크리스트가 도와줘요.",
    friends: "친구들에게 “이거 해 보자!”를 제일 먼저 말하는 사람이에요. 약속 장소도 새로운 곳을 찾아오는 담당! 가끔 앞서 나가서 친구들이 숨 가빠할 수 있으니 속도를 한 번씩 맞춰 주세요.",
    money: "새로운 것, 경험, 배움에 돈을 잘 써요. 호기심에 산 물건이 서랍에 쌓이지 않도록 '일주일 뒤에 사기' 규칙을 만들어 보세요.",
    stress: "같은 일이 반복되거나, 하고 싶은 걸 못 하게 막힐 때 답답해져요.",
    relief: "집 근처 낯선 골목 산책, 화분 돌보기, 처음 듣는 노래 찾기로 숨통을 틔워 보세요.",
    mantra: "일단 한 걸음만, 나머지는 걸으면서 정하자!",
    lucky: { color: "초록", item: "새 노트와 연필", food: "새싹 비빔밥", word: "시작" },
  },
  화: {
    short: "분위기를 데우는",
    tags: ["#분위기메이커", "#리액션부자", "#오늘도반짝"],
    love: "표현이 솔직하고 따뜻해서 사랑받는 타입이에요. 좋아하면 온 얼굴에 티가 나요. 감정이 뜨거운 만큼 식는 것도 빠르게 느껴질 수 있으니, 설렘만큼 편안함을 쌓아 가는 연습이 좋아요.",
    work: "발표, 소통, 사람을 모으는 일에서 에너지가 폭발해요. 혼자 오래 앉아 있는 일은 힘들 수 있어서 중간중간 이야기 나누는 시간을 끼워 넣어 보세요.",
    friends: "모임에 불을 붙이는 사람! 단톡방 첫 마디와 웃음 담당이에요. 모두를 챙기느라 지칠 수 있으니 혼자만의 충전 시간을 꼭 지켜 주세요.",
    money: "기분이 좋을 때 한턱내거나 선물하는 데 쓰는 편이에요. 오늘의 기분에 쓰기 전에 “내일의 나도 좋아할까?”를 한 번 물어보세요.",
    stress: "무시당하거나 반응이 없을 때, 흥이 꺼질 때 마음이 푹 가라앉아요.",
    relief: "좋아하는 노래 크게 틀고 춤추기, 친구와 수다 한판, 햇볕 쬐며 걷기가 잘 맞아요.",
    mantra: "오늘도 나답게 반짝이면 충분해!",
    lucky: { color: "빨강", item: "반짝이는 소품", food: "매콤한 떡볶이", word: "반짝" },
  },
  토: {
    short: "곁을 든든하게 지키는",
    tags: ["#든든함", "#마을어른", "#챙김담당"],
    love: "천천히 마음을 열지만 한번 마음을 주면 오래가는 타입이에요. 말보다 행동으로 챙기는 사랑이라, 가끔은 “좋아해”를 말로 해 주면 상대가 훨씬 안심해요.",
    work: "여러 사람 사이에서 균형을 잡고 끝까지 책임지는 힘이 커요. 다 떠안지 말고 일을 나누는 연습이 필요해요.",
    friends: "모임의 기둥! 아픈 친구, 지친 친구에게 제일 먼저 연락하는 사람이에요. 거절이 어려워도 “이번엔 힘들어”라고 말해 봐도 괜찮아요.",
    money: "알뜰하고 꼼꼼해요. 가족과 친구를 위해서는 선뜻 쓰기도 해요. 나를 위한 작은 선물도 예산에 꼭 넣어 주세요.",
    stress: "변화가 너무 빠르거나 약속이 갑자기 바뀔 때, 책임이 한꺼번에 몰릴 때 힘들어요.",
    relief: "따뜻한 밥 해 먹기, 정리정돈, 동네 한 바퀴 산책으로 마음의 중심을 되찾아요.",
    mantra: "천천히 가도 괜찮아, 나는 나대로 든든해!",
    lucky: { color: "노랑", item: "포근한 담요", food: "따끈한 고구마", word: "든든" },
  },
  금: {
    short: "깔끔하게 결단하는",
    tags: ["#깔끔", "#핵심만", "#믿음직"],
    love: "마음을 쉽게 드러내진 않지만 약속과 신뢰를 중요하게 여기는 진지한 사랑이에요. 표현이 서툴러 차갑게 보일 수 있으니 고마움을 한마디씩 더해 보세요.",
    work: "정리, 분석, 마감 관리에서 빛나요. 완벽하게 하려다 시작이 늦어질 수 있어서 “70점짜리 초안”부터 내 보세요.",
    friends: "고민을 털어놓으면 정확히 짚어 주는 해결사예요. 직설이 상처가 될 수 있으니 “그래도 네 마음은 알아”를 먼저 말해 주세요.",
    money: "계획적이고 기준이 분명해요. 필요한 곳에 정확히 쓰는 편이고, 가끔은 기분 전환용 지출도 허락해 주세요.",
    stress: "약속이 어긋나거나 일이 어지럽게 흩어질 때 예민해져요.",
    relief: "책상·옷장 정리, 깨끗한 환경에서 조용히 차 마시기, 목표 하나 체크하기가 도움이 돼요.",
    mantra: "정리하면 길이 보여, 하나씩 해 보자!",
    lucky: { color: "흰색", item: "작은 정리함", food: "아삭한 배", word: "또렷" },
  },
  수: {
    short: "깊이 헤아리는",
    tags: ["#눈치백단", "#공감요정", "#조용한힘"],
    love: "상대의 마음을 섬세하게 읽고 오래 지켜보는 사랑이에요. 속마음을 숨기다 오해가 생길 수 있어서, 작은 감정도 한 줄 말로 꺼내면 훨씬 가까워져요.",
    work: "기획, 글, 상담, 연구처럼 깊이 생각하는 일에서 능력이 드러나요. 생각만 길어지지 않게 “오늘 할 한 가지”를 정해 보세요.",
    friends: "말은 적어도 가장 오래 기억해 주는 친구예요. 모임에서 조용해도 관찰은 열심히 하고 있죠. 가끔 먼저 연락하면 친구들이 무척 반가워해요.",
    money: "필요한 것을 신중히 고르고 오래 비교해요. 작은 결정은 빨리 내려서 에너지를 아껴 보세요.",
    stress: "시끄럽고 급한 분위기, 혼자만의 시간이 없을 때 지쳐요.",
    relief: "잔잔한 음악, 따뜻한 샤워, 일기 쓰기, 물가 산책으로 마음을 가라앉혀요.",
    mantra: "느리면 어때, 깊이 가는 중이야!",
    lucky: { color: "남색", item: "작은 일기장", food: "따뜻한 차", word: "잔잔" },
  },
};

const COMBO_ADJ: Record<Element, string> = {
  목: "호기심 가득한",
  화: "열정이 넘치는",
  토: "포근한",
  금: "야무진",
  수: "차분한",
};
const MODE_ON: Record<Element, string> = {
  목: "새로운 장소나 처음 하는 일 앞에 섰을 때",
  화: "사람들 앞이거나 신나는 자리에 있을 때",
  토: "누군가 힘들어 보여 챙겨 주고 싶을 때",
  금: "정리할 일이 쌓이고 마감이 다가올 때",
  수: "혼자 생각할 시간이 필요하거나 분위기를 읽어야 할 때",
};

/** 본캐×부캐 20가지 조합 별명. 예: 차분한 새싹 개척자 */
const COMBO_NOUN: Record<Element, string> = {
  목: "새싹 개척자",
  화: "분위기 불꽃",
  토: "마을 어른",
  금: "해결사",
  수: "물 관찰자",
};
export function comboTitle(primary: Element, secondary: Element): string {
  return `${COMBO_ADJ[secondary]} ${COMBO_NOUN[primary]}`;
}
export const modeOn = (secondary: Element) => MODE_ON[secondary];

export interface MatchCard {
  label: string;
  el: Element;
  text: string;
}

/** 나(el)와 다른 네 오행의 관계를 쉬운 말로. relation()으로 찾으므로 상생·상극 규칙과 항상 같다. */
export function matchCards(me: Element): MatchCard[] {
  const find = (k: ReturnType<typeof relation>) =>
    ELEMENTS.find((o) => o !== me && relation(me, o) === k)!;
  const helper = find("helps");
  const given = find("gives");
  const ruled = find("rules");
  const pressed = find("pressed");
  const me_ = friendName(me);
  const s = (e: Element) => DEEP_TEXT[e].short;
  return [
    {
      label: "곁에 있으면 힘이 나는 친구",
      el: helper,
      text: `${friendName(helper)}(${s(helper)} 친구)가 ${me_}에게 기운을 북돋아 줘요. 지칠 때 찾아가 보세요.`,
    },
    {
      label: "내가 챙겨 주고 싶은 친구",
      el: given,
      text: `${friendName(given)}(${s(given)} 친구)에게 ${me_}가 힘을 나눠 줘요. 대신 나도 쉬어 가는 걸 잊지 마세요.`,
    },
    {
      label: "내가 이끌게 되는 친구",
      el: ruled,
      text: `${friendName(ruled)}(${s(ruled)} 친구) 앞에서는 ${me_}가 앞장서게 돼요. 속도는 상대에게 물어봐 주세요.`,
    },
    {
      label: "티격태격하며 크는 친구",
      el: pressed,
      text: `${friendName(pressed)}(${s(pressed)} 친구) 앞에서는 ${me_}가 긴장하거나 자극을 받아요. 서로를 키워 주는 사이가 될 수 있어요.`,
    },
  ];
}
