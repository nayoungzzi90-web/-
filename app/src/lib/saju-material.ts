// 풀이 재료 보강: 일주 핵심 이미지, 위치별 의미 메모, 오행→십성 이름 표기.
// 모두 일반 명리 입문서 수준의 고정 표이며 엔진 계산값(일주·오행)에서만 만든다. 엔진은 수정하지 않는다.
import { ELEMENTS, EL_WORD, branchElement, stemElement } from "./reading";

// 천간 물상(갑~계)
export const STEM_OBJECT = ["큰 나무", "풀·덩굴", "태양", "등불", "큰 산", "논밭", "바위·무쇠", "보석·칼날", "큰 바다", "비·이슬"] as const;
// 지지 동물(자~해)
export const BRANCH_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;
// 지지 계절(자~해, 월지와 같은 방식으로 인묘진=봄, 사오미=여름, 신유술=가을, 해자축=겨울)
const BRANCH_SEASON = ["겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"] as const;
const COLOR_OF = { 목: "푸른", 화: "붉은", 토: "누런", 금: "하얀", 수: "검은" } as const;

export interface CoreImage {
  핵심이미지: string; // 예: 푸른 호랑이, 봄의 큰 나무
  천간물상: string;
  지지동물: string;
  색: string;
  계절: string;
  사용: string;
}

export function buildCoreImage(dayStem: number, dayBranch: number): CoreImage {
  const el = branchElement(dayBranch);
  const color = COLOR_OF[el];
  const animal = BRANCH_ANIMAL[dayBranch]!;
  const obj = STEM_OBJECT[dayStem]!;
  const season = BRANCH_SEASON[dayBranch]!;
  return {
    핵심이미지: `${color} ${animal}, ${season}의 ${obj}`,
    천간물상: obj,
    지지동물: animal,
    색: color,
    계절: season,
    사용: "1번 카드(한마디로)에서만 쓴다",
  };
}

export const POSITION_MEANING = {
  연주: "어린 시절·바깥에서 보이는 인상",
  월주: "사회생활·직업(일터)",
  일주: "일간은 나 자신, 일지는 배우자 자리와 속마음",
  시주: "말년·결과물",
} as const;

const TEN_GOD_PAIR = [["비견", "겁재"], ["식신", "상관"], ["편재", "정재"], ["편관", "정관"], ["편인", "정인"]] as const;
/** 일간 오행 기준으로 어떤 오행이 어떤 십성에 해당하는지(예: 갑목 기준 불 = 식신·상관) */
export function elementTenGods(dayStem: number, elementWord: string): string {
  const d = ELEMENTS.indexOf(stemElement(dayStem));
  const e = ELEMENTS.findIndex((x) => EL_WORD[x] === elementWord);
  if (d < 0 || e < 0) return "";
  return TEN_GOD_PAIR[(e - d + 5) % 5]!.join("·");
}
