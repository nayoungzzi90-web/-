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

// ── 학파 정책(설정 값). 기본값은 지금까지의 표(양생음사, 戊·己는 丙·丁과 같은 자리)이며 화면·풀이에는 기본값만 쓴다. ──
export interface StagePolicy {
  /** reverse: 음간은 장생부터 거꾸로(양생음사) / same-as-yang: 음간도 짝 양간과 같은 장생지에서 순행(음양동행) */
  yin: "reverse" | "same-as-yang";
  /** fire: 戊·己를 丙·丁과 같은 자리(화토동궁) / water: 壬·癸와 같은 자리(수토동궁) */
  earth: "fire" | "water";
}
export const DEFAULT_STAGE_POLICY: StagePolicy = { yin: "reverse", earth: "fire" };

/** 정책에 따른 장생 지지와 진행 방향. 기본 정책은 stageIndex 와 같은 값을 낸다. */
export function stageIndexWith(stem: number, branch: number, policy: StagePolicy = DEFAULT_STAGE_POLICY): number {
  let start = JANGSAENG_BRANCH[stem]!;
  const yangStem = stem % 2 === 0;
  if (policy.earth === "water" && (stem === 4 || stem === 5)) start = stem === 4 ? 8 : 3; // 戊 申, 己 卯
  if (policy.yin === "same-as-yang" && !yangStem) {
    // 음간의 장생지를 짝 양간(바로 앞 천간)과 같게 하고 순행한다(戊·己는 위 earth 정책을 따른다)
    const partner = stem - 1;
    start = partner === 4 && policy.earth === "water" ? 8 : JANGSAENG_BRANCH[partner]!;
    return mod(branch - start, 12);
  }
  return yangStem ? mod(branch - start, 12) : mod(start - branch, 12);
}
