// 12운성(十二運星) — 일반적으로 쓰는 표. 참고용.
//
// 출처 상태(중요): 저장소에 12운성 원문이 없다. 이 표는 명리 입문서에서 흔히 쓰는 방식을
// 정리한 것으로, 《연해자평》 등 고전 원문과 대조하지 않았고 전문가 검증도 받지 않았다.
// (고전 일부 구절과의 부분 일치 확인만 시험에 있다 — 검증이 아니다.)
//
// 채택한 방식(학파마다 다르다):
//  · 양간(甲丙戊庚壬)은 장생부터 지지를 순서대로(순행), 음간(乙丁己辛癸)은 거꾸로(역행) — 흔히 '양생음사'라 부른다.
//  · 戊는 丙과, 己는 丁과 같은 자리에서 시작한다(화토동궁). 壬·癸와 같이 보는 방식(수토동궁)도 있어 결과가 다를 수 있다.
// 풀이 문장에는 쓰지 않고 표 이름 붙이기에만 쓴다. 의미 해석은 하지 않는다.

export const STAGE_KO = [
  "장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양",
] as const;
export const STAGE_HANJA = [
  "長生", "沐浴", "冠帶", "建祿", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養",
] as const;
export type Stage = (typeof STAGE_KO)[number];

// 천간(甲乙丙丁戊己庚辛壬癸)별 '장생' 자리 지지 번호(子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11)
export const JANGSAENG_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 일간(또는 어떤 천간)이 지지에서 놓이는 12운성 번호(0=장생 … 11=양) */
export function stageIndex(stem: number, branch: number): number {
  const start = JANGSAENG_BRANCH[stem]!;
  const yang = stem % 2 === 0;
  return yang ? mod(branch - start, 12) : mod(start - branch, 12);
}
export function stageOf(stem: number, branch: number): Stage {
  return STAGE_KO[stageIndex(stem, branch)]!;
}
