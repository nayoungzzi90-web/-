import { computeSaju } from "./saju-engine";
import {
  EL_HANJA,
  EL_WORD,
  relation,
  stemElement,
  type Relation,
} from "./reading";
import type { Element, Pillar } from "./saju";

// 오늘의 복주머니: 오늘의 일진(오늘의 일주)이 내 일간과 맺는 오행 관계로 만든다(결정론).
// 점수·확률·예언을 만들지 않는다. 그날의 분위기를 재미로 읽는 한 줄이다.
export interface DailyFortune {
  date: string;
  todayDay: Pillar;
  rel: Relation;
  headline: string;
  line: string;
  doList: string[];
  avoidList: string[];
  luckyEl: Element;
  luckyColor: string;
  basis: string[];
}

const GEN_INV: Record<Element, Element> = {
  화: "목",
  토: "화",
  금: "토",
  수: "금",
  목: "수",
}; // 나를 살리는 기운
export const COLOR: Record<Element, string> = {
  목: "청색",
  화: "적색",
  토: "황색",
  금: "백색",
  수: "흑색",
};

const TEXT: Record<
  Relation,
  { head: string[]; line: string; doList: string[]; avoidList: string[] }
> = {
  same: {
    head: [
      "같은 기운이 만나는 날, 내 색이 진해져요",
      "거울 같은 날: 나다운 선택이 잘 맞아요",
    ],
    line: "오늘 하루의 기운이 나와 같은 결이라 평소의 나다움이 더 도드라지는 날이에요.",
    doList: ["하고 싶던 일을 내 방식대로 시작하기", "믿는 사람과 의견 나누기"],
    avoidList: ["고집으로 부딪히기", "같은 말 반복하기"],
  },
  helps: {
    head: [
      "도움이 들어오는 날, 손을 내밀어 봐요",
      "받쳐주는 기운이 있는 날이에요",
    ],
    line: "오늘의 기운이 나를 살려주는 쪽이라 부탁하거나 배우기에 좋은 날로 읽어요.",
    doList: ["모르는 건 물어보기", "배움·정리·휴식 챙기기"],
    avoidList: ["혼자 끙끙 앓기", "받은 도움 당연하게 넘기기"],
  },
  gives: {
    head: [
      "힘을 쓰는 날, 표현이 길을 열어요",
      "에너지를 쏟아 보여주는 날이에요",
    ],
    line: "오늘은 내 기운이 밖으로 흘러나가는 날이라 말·글·행동으로 드러낼수록 좋은 흐름이에요.",
    doList: ["아이디어 공유하기", "가볍게 몸 움직이기"],
    avoidList: ["체력 과신하기", "말 많아져 실수하기"],
  },
  rules: {
    head: [
      "내가 쥐는 날, 챙길 건 챙겨요",
      "현실을 다루는 데 힘이 붙는 날이에요",
    ],
    line: "오늘의 기운을 내가 다루는 구조라서 일정·돈·할 일을 정리하고 결정하기에 힘이 붙는 날이에요.",
    doList: ["미뤄둔 결정 하나 내리기", "지출·일정 점검하기"],
    avoidList: ["욕심내어 한꺼번에 벌이기", "남에게 밀어붙이기"],
  },
  pressed: {
    head: [
      "단련받는 날, 한 박자 천천히 가꽥",
      "압박이 오는 날, 버티면 단단해져요",
    ],
    line: "오늘의 기운이 나를 누르는 결이라 서두르면 부담이 커지는 날로 읽어요. 속도를 낮추면 오히려 좋아요.",
    doList: ["중요한 말은 한 번 더 확인하기", "일찍 쉬기"],
    avoidList: ["큰 결정 서두르기", "감정적으로 답장하기"],
  },
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function dailyFortune(
  myDayStem: number,
  date: string,
): DailyFortune | null {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  // 일주만 쓴다. 일주는 자정에 바뀌어 절입과 무관하므로 정오로 계산한다(절입일에 시간 없이 계산을 거절하는 규칙을 피함).
  const r = computeSaju({ year: y, month: m, day: d, hour: 12, minute: 0 });
  if (!r.ok || !r.pillars) return null;
  const todayDay = r.pillars.day;
  const me = stemElement(myDayStem);
  const other = stemElement(todayDay.stem);
  const rel = relation(me, other);
  const t = TEXT[rel];
  const headline = t.head[hash(date + myDayStem) % t.head.length]!;
  const luckyEl = GEN_INV[me];
  return {
    date,
    todayDay,
    rel,
    headline,
    line: t.line,
    doList: t.doList,
    avoidList: t.avoidList,
    luckyEl,
    luckyColor: COLOR[luckyEl],
    basis: [
      `오늘 일진 ${todayDay.hanja}(${todayDay.ko})`,
      `내 일간 ${EL_HANJA[me]}(${EL_WORD[me]})`,
      `오늘 천간 ${EL_WORD[other]}`,
    ],
  };
}
