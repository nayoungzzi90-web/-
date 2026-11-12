// 지장간(지지 속에 숨은 천간): R-003 원문(《연해자평》 지지장둔가, DRAFT-1·전문가 검증 전)의 표.
// 원문의 나열 순서는 사령(월령 분일) 순서가 아니다. 그래서 '본기'와 '함께 있는 글자'로만 구분하고 여기·중기 같은 역할은 붙이지 않는다.
// 엔진(manse)의 STANDARD 표는 子·卯·酉·午·亥 5개 지지에서 이 표와 다르다 — 사용자 결정(2026-11-12)으로 이 원문 표를 쓴다.
// 이 표가 reading-core 의 R-003 원문 데이터와 같은지는 시험(hidden-stems.test.ts)이 확인한다.
export interface HiddenStem {
  stem: number; // 0~9
  main: boolean; // 본기
}

// 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9, 지지 子0 丑1 … 亥11
const TABLE: { members: number[]; main: number }[] = [
  { members: [9], main: 9 }, // 子 癸
  { members: [5, 9, 7], main: 5 }, // 丑 己癸辛
  { members: [0, 2, 4], main: 0 }, // 寅 甲丙戊
  { members: [1], main: 1 }, // 卯 乙
  { members: [4, 1, 9], main: 4 }, // 辰 戊乙癸
  { members: [2, 6, 4], main: 2 }, // 巳 丙庚戊
  { members: [3, 5], main: 3 }, // 午 丁己
  { members: [5, 3, 1], main: 5 }, // 未 己丁乙
  { members: [6, 8, 4], main: 6 }, // 申 庚壬戊
  { members: [7], main: 7 }, // 酉 辛
  { members: [4, 7, 3], main: 4 }, // 戌 戊辛丁
  { members: [8, 0], main: 8 }, // 亥 壬甲
];

export function hiddenStemsOf(branch: number): HiddenStem[] {
  const row = TABLE[((branch % 12) + 12) % 12]!;
  return row.members.map((stem) => ({ stem, main: stem === row.main }));
}
export const mainStemOf = (branch: number): number =>
  TABLE[((branch % 12) + 12) % 12]!.main;
