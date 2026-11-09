import type { Element, Pillar } from "./saju";

// 만세력 표용: 기둥 하나를 천간·지지 글자(한자+한글)와 오행으로 나눈다. 모두 정해진 대응표라 해석이 들어가지 않는다.
const STEM_KO = "갑을병정무기경신임계";
const STEM_HANJA = "甲乙丙丁戊己庚辛壬癸";
const BRANCH_KO = "자축인묘진사오미신유술해";
const BRANCH_HANJA = "子丑寅卯辰巳午未申酉戌亥";
const STEM_EL: Element[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const BRANCH_EL: Element[] = [
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

export const EL_PLAIN: Record<Element, string> = {
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

export interface Glyph {
  hanja: string;
  ko: string;
  element: Element;
}

export function pillarParts(p: Pillar): { stem: Glyph; branch: Glyph } {
  return {
    stem: { hanja: STEM_HANJA[p.stem]!, ko: STEM_KO[p.stem]!, element: STEM_EL[p.stem]! },
    branch: {
      hanja: BRANCH_HANJA[p.branch]!,
      ko: BRANCH_KO[p.branch]!,
      element: BRANCH_EL[p.branch]!,
    },
  };
}

export function stemElement(stemIndex: number): Element {
  return STEM_EL[stemIndex]!;
}

/** 오행 개수를 한 문장으로. 가장 많은 기운과 한 글자도 없는 기운만 사실대로 말한다. */
export function elementSentence(elements: Record<Element, number>): string {
  const keys = Object.keys(elements) as Element[];
  const max = Math.max(...keys.map((k) => elements[k]));
  const most = keys.filter((k) => elements[k] === max);
  const none = keys.filter((k) => elements[k] === 0);
  const name = (k: Element) => `${k}(${EL_PLAIN[k]})`;
  const a =
    most.length === keys.length
      ? "다섯 기운이 고르게 있어요."
      : `가장 많은 기운은 ${most.map(name).join(", ")}이고 ${max}글자예요.`;
  const b = none.length
    ? ` ${none.map(name).join(", ")}은 한 글자도 없어요.`
    : " 빠진 기운은 없어요.";
  return a + b;
}
