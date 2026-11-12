// 신살(神煞) 일부 — 일반적으로 쓰는 표. 참고용.
//
// 출처 상태(중요): 저장소에 신살 원문이 없다. 입문서에서 흔히 쓰는 방식을 정리했을 뿐이며
// 《연해자평》 등 고전 원문과 대조하지 않았고 전문가 검증도 받지 않았다. 책·학파마다 다르다.
// 넣은 것은 계산이 정해져 있고 널리 같게 쓰이는 다섯 가지뿐이다(천을귀인·도화·역마·화개·공망).
// 그 외 신살(홍염·원진·귀문·양인 등)은 학파 차이가 커서 넣지 않았다.
// 풀이 문장에는 쓰지 않고 표 이름 붙이기에만 쓴다. 길흉·의미 해석은 하지 않는다.
import type { Pillar } from "./saju";

export const BRANCH_CHAR = "子丑寅卯辰巳午未申酉戌亥";
export const BRANCH_NAME = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_CHAR = "甲乙丙丁戊己庚辛壬癸";

// 천을귀인(일간 기준) — "甲戊庚牛羊, 乙己鼠猴鄉, 丙丁豬雞位, 壬癸兔蛇藏, 六辛逢馬虎"
export const CHEONEUL: readonly (readonly [number, number])[] = [
  [1, 7], // 甲 丑未
  [0, 8], // 乙 子申
  [11, 9], // 丙 亥酉
  [11, 9], // 丁 亥酉
  [1, 7], // 戊 丑未
  [0, 8], // 己 子申
  [1, 7], // 庚 丑未
  [2, 6], // 辛 寅午
  [3, 5], // 壬 卯巳
  [3, 5], // 癸 卯巳
];

// 삼합 그룹(지지 번호)과 도화·역마·화개 자리
export const SAMHAP_GROUPS = [
  { members: [2, 6, 10], dohwa: 3, yeokma: 8, hwagae: 10 }, // 寅午戌: 卯 · 申 · 戌
  { members: [8, 0, 4], dohwa: 9, yeokma: 2, hwagae: 4 }, // 申子辰: 酉 · 寅 · 辰
  { members: [5, 9, 1], dohwa: 6, yeokma: 11, hwagae: 1 }, // 巳酉丑: 午 · 亥 · 丑
  { members: [11, 3, 7], dohwa: 0, yeokma: 5, hwagae: 7 }, // 亥卯未: 子 · 巳 · 未
] as const;
export const groupOf = (branch: number) =>
  SAMHAP_GROUPS.find((g) => (g.members as readonly number[]).includes(branch))!;

/** 일주의 공망 지지 두 개(旬空). 예: 甲子旬 → 戌·亥 */
export function gongmang(dayStem: number, dayBranch: number): [number, number] {
  const start = (((dayBranch - dayStem) % 12) + 12) % 12; // 그 순(旬)의 첫 지지(甲○)
  return [(start + 10) % 12, (start + 11) % 12];
}

export type PillarLabel = "시주" | "일주" | "월주" | "연주";
export interface SinsalRow {
  key: string;
  name: string;
  hanja: string;
  rule: string; // 어떤 기준으로 찾았는지(화면에 보인다)
  targets: string; // 찾는 지지
  hits: PillarLabel[]; // 해당하는 기둥(없으면 빈 배열)
}
type Pillars = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };

const ch = (b: number) => `${BRANCH_CHAR[b]}(${BRANCH_NAME[b]})`;

export function computeSinsal(p: Pillars): SinsalRow[] {
  const list: { label: PillarLabel; p: Pillar | null }[] = [
    { label: "시주", p: p.hour },
    { label: "일주", p: p.day },
    { label: "월주", p: p.month },
    { label: "연주", p: p.year },
  ];
  const hitsFor = (targets: number[], exclude?: PillarLabel) =>
    list
      .filter((x) => x.p && x.label !== exclude && targets.includes(x.p.branch))
      .map((x) => x.label);

  const rows: SinsalRow[] = [];
  const ce = CHEONEUL[p.day.stem]!;
  rows.push({
    key: "cheoneul",
    name: "천을귀인",
    hanja: "天乙貴人",
    rule: `일간 ${STEM_CHAR[p.day.stem]} 기준`,
    targets: `${ch(ce[0])}·${ch(ce[1])}`,
    hits: hitsFor([ce[0], ce[1]]),
  });
  const kinds = [
    { key: "dohwa", name: "도화살", hanja: "桃花", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.dohwa },
    { key: "yeokma", name: "역마살", hanja: "驛馬", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.yeokma },
    { key: "hwagae", name: "화개살", hanja: "華蓋", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.hwagae },
  ];
  for (const k of kinds) {
    for (const base of [
      { label: "일주" as const, b: p.day.branch, word: "일지" },
      { label: "연주" as const, b: p.year.branch, word: "연지" },
    ]) {
      const t = k.pick(groupOf(base.b));
      rows.push({
        key: `${k.key}-${base.word}`,
        name: `${k.name} · ${base.word} 기준`,
        hanja: k.hanja,
        rule: `${base.word} ${BRANCH_CHAR[base.b]}(삼합 ${(groupOf(base.b).members as readonly number[]).map((m) => BRANCH_CHAR[m]).join("")})`,
        targets: ch(t),
        hits: hitsFor([t], base.label), // 기준이 된 기둥 자신은 제외
      });
    }
  }
  const gm = gongmang(p.day.stem, p.day.branch);
  rows.push({
    key: "gongmang",
    name: "공망",
    hanja: "空亡",
    rule: `일주 ${STEM_CHAR[p.day.stem]}${BRANCH_CHAR[p.day.branch]} 기준`,
    targets: `${ch(gm[0])}·${ch(gm[1])}`,
    hits: hitsFor(gm, "일주"),
  });
  return rows;
}
