// 신살(神煞) — 일반적으로 쓰는 표. 참고용.
//
// 출처 상태(중요): 저장소에 신살 원문이 없다. 입문서·구결에서 흔히 쓰는 방식을 정리했을 뿐이며
// 《연해자평》 등 고전 원문과 대조하지 않았고 전문가 검증도 받지 않았다. 책·학파마다 다르다.
// 학파 차이가 큰 항목(음간 양인 등)은 넣지 않거나 방식을 화면에 밝힌다.
// 풀이 문장에는 쓰지 않고 표 이름 붙이기에만 쓴다. 길흉·의미 해석은 하지 않는다.
import type { Pillar } from "./saju";
import { JANGSAENG_BRANCH } from "./twelve-stages";

export const BRANCH_CHAR = "子丑寅卯辰巳午未申酉戌亥";
export const BRANCH_NAME = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const STEM_CHAR = "甲乙丙丁戊己庚辛壬癸";
const mod = (n: number, m: number) => ((n % m) + m) % m;
const B = (s: string) => [...s].map((c) => BRANCH_CHAR.indexOf(c));

// 천을귀인(일간 기준) — "甲戊庚牛羊, 乙己鼠猴鄉, 丙丁豬雞位, 壬癸兔蛇藏, 六辛逢馬虎"
export const CHEONEUL: readonly (readonly [number, number])[] = [
  [1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5],
];
// 일간 기준 지지 표(甲乙丙丁戊己庚辛壬癸 순서)
export const YANGIN = [3, null, 6, null, 6, null, 9, null, 0, null] as const; // 양간만: 甲卯 丙午 戊午 庚酉 壬子
export const MUNCHANG = B("巳午申酉申酉亥子寅卯"); // 문창귀인
export const GEUMYEO = B("辰巳未申未申戌亥丑寅"); // 금여록
export const AMROK = B("亥戌申未申未巳辰寅丑"); // 암록(건록의 육합)
export const HONGYEOM = B("午午寅未辰辰戌酉子申"); // 홍염살
export const TAEGEUK: readonly (readonly number[])[] = [
  B("子午"), B("子午"), B("卯酉"), B("卯酉"), B("辰戌丑未"), B("辰戌丑未"), B("寅亥"), B("寅亥"), B("巳申"), B("巳申"),
];
// 월지 기준(월지 번호 0~11 순서: 子丑寅卯辰巳午未申酉戌亥)
// 월덕귀인: 천간. 寅午戌月 丙 · 申子辰月 壬 · 亥卯未月 甲 · 巳酉丑月 庚
export const WOLDEOK_STEM = [8, 6, 2, 0, 8, 6, 2, 0, 8, 6, 2, 0] as const; // 子壬 丑庚 寅丙 卯甲 辰壬 巳庚 午丙 未甲 申壬 酉庚 戌丙 亥甲
// 천덕귀인: 월지별 [천간 또는 지지]. 寅월 丁, 卯월 申, 辰월 壬, 巳월 辛, 午월 亥, 未월 甲, 申월 癸, 酉월 寅, 戌월 丙, 亥월 乙, 子월 巳, 丑월 庚
export const CHEONDEOK: readonly ({ stem: number } | { branch: number })[] = [
  { branch: 5 }, // 子월 巳
  { stem: 6 }, // 丑월 庚
  { stem: 3 }, // 寅월 丁
  { branch: 8 }, // 卯월 申
  { stem: 8 }, // 辰월 壬
  { stem: 7 }, // 巳월 辛
  { branch: 11 }, // 午월 亥
  { stem: 0 }, // 未월 甲
  { stem: 9 }, // 申월 癸
  { branch: 2 }, // 酉월 寅
  { stem: 2 }, // 戌월 丙
  { stem: 1 }, // 亥월 乙
];
// 일주·기둥 간지(천간 번호, 지지 번호)
export const GOEGANG: readonly (readonly [number, number])[] = [[6, 4], [6, 10], [8, 4], [4, 10]]; // 庚辰 庚戌 壬辰 戊戌
export const BAEKHO: readonly (readonly [number, number])[] = [[0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1]]; // 甲辰 乙未 丙戌 丁丑 戊辰 壬戌 癸丑
// 지지 쌍
export const WONJIN: readonly (readonly [number, number])[] = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]]; // 子未 丑午 寅酉 卯申 辰亥 巳戌
export const GWIMUN: readonly (readonly [number, number])[] = [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]]; // 子酉 丑午 寅未 卯申 辰亥 巳戌
// 고신·과숙(연지 기준, 계절 3지지 묶음)
export const GOSIN_GWASUK = [
  { members: B("亥子丑"), gosin: 2, gwasuk: 10 },
  { members: B("寅卯辰"), gosin: 5, gwasuk: 1 },
  { members: B("巳午未"), gosin: 8, gwasuk: 4 },
  { members: B("申酉戌"), gosin: 11, gwasuk: 7 },
] as const;

// 삼합 그룹(지지 번호)과 지살(=삼합의 장생 지지)
export const SAMHAP_GROUPS = [
  { members: [2, 6, 10], jisal: 2, dohwa: 3, yeokma: 8, hwagae: 10 }, // 寅午戌
  { members: [8, 0, 4], jisal: 8, dohwa: 9, yeokma: 2, hwagae: 4 }, // 申子辰
  { members: [5, 9, 1], jisal: 5, dohwa: 6, yeokma: 11, hwagae: 1 }, // 巳酉丑
  { members: [11, 3, 7], jisal: 11, dohwa: 0, yeokma: 5, hwagae: 7 }, // 亥卯未
] as const;
export const groupOf = (branch: number) =>
  SAMHAP_GROUPS.find((g) => (g.members as readonly number[]).includes(branch))!;

// 12신살(삼합 기준): 지살에서 시작해 겁살(지살−3)부터 12개가 지지 순서로 이어진다.
export const SINSAL12 = [
  "겁살", "재살", "천살", "지살", "년살", "월살", "망신살", "장성살", "반안살", "역마살", "육해살", "화개살",
] as const;
export const SINSAL12_HANJA = [
  "劫煞", "災煞", "天煞", "地煞", "年煞", "月煞", "亡身煞", "將星煞", "攀鞍煞", "驛馬煞", "六害煞", "華蓋煞",
] as const;
/** 기준 지지(삼합 그룹 결정)에서 본 어떤 지지의 12신살 번호(0=겁살 … 11=화개살) */
export function sinsal12Index(base: number, target: number): number {
  const j = groupOf(base).jisal;
  return mod(target - (j - 3), 12);
}

/** 일주의 공망 지지 두 개(旬空). 예: 甲子旬 → 戌·亥 */
export function gongmang(dayStem: number, dayBranch: number): [number, number] {
  const start = mod(dayBranch - dayStem, 12);
  return [(start + 10) % 12, (start + 11) % 12];
}

export type PillarLabel = "시주" | "일주" | "월주" | "연주";
export interface SinsalRow {
  key: string;
  group: "귀인·길신 계열" | "삼합 계열" | "일간 기준 그 외" | "간지·지지 쌍";
  name: string;
  hanja: string;
  rule: string; // 어떤 기준으로 찾았는지(화면에 보인다)
  targets: string; // 찾는 글자
  hits: string[]; // 해당하는 기둥·쌍(없으면 빈 배열)
  note?: string;
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
  const dg = p.day.stem;
  const hitsBranch = (targets: number[], exclude?: PillarLabel) =>
    list.filter((x) => x.p && x.label !== exclude && targets.includes(x.p.branch)).map((x) => x.label as string);
  const hitsStem = (stem: number) =>
    list.filter((x) => x.p && x.p.stem === stem).map((x) => x.label as string);
  const GJ = "귀인·길신 계열" as const;
  const SH = "삼합 계열" as const;
  const IL = "일간 기준 그 외" as const;
  const PR = "간지·지지 쌍" as const;
  const rows: SinsalRow[] = [];
  const dayRule = `일간 ${STEM_CHAR[dg]} 기준`;

  // ── 귀인·길신 계열
  const ce = CHEONEUL[dg]!;
  rows.push({ key: "cheoneul", group: GJ, name: "천을귀인", hanja: "天乙貴人", rule: dayRule, targets: `${ch(ce[0])}·${ch(ce[1])}`, hits: hitsBranch([ce[0], ce[1]]) });
  rows.push({ key: "munchang", group: GJ, name: "문창귀인", hanja: "文昌貴人", rule: dayRule, targets: ch(MUNCHANG[dg]!), hits: hitsBranch([MUNCHANG[dg]!]) });
  rows.push({ key: "hakdang", group: GJ, name: "학당귀인", hanja: "學堂貴人", rule: `${dayRule} (일간의 장생 자리)`, targets: ch(JANGSAENG_BRANCH[dg]!), hits: hitsBranch([JANGSAENG_BRANCH[dg]!]), note: "학파에 따라 학당·장생 대응이 다를 수 있어요." });
  rows.push({ key: "geumyeo", group: GJ, name: "금여록", hanja: "金輿祿", rule: dayRule, targets: ch(GEUMYEO[dg]!), hits: hitsBranch([GEUMYEO[dg]!]) });
  rows.push({ key: "amrok", group: GJ, name: "암록", hanja: "暗祿", rule: `${dayRule} (건록의 육합 자리)`, targets: ch(AMROK[dg]!), hits: hitsBranch([AMROK[dg]!]) });
  const tg = TAEGEUK[dg]!;
  rows.push({ key: "taegeuk", group: GJ, name: "태극귀인", hanja: "太極貴人", rule: dayRule, targets: tg.map(ch).join("·"), hits: hitsBranch([...tg]) });
  const mb = p.month.branch;
  const wd = WOLDEOK_STEM[mb]!;
  rows.push({ key: "woldeok", group: GJ, name: "월덕귀인", hanja: "月德貴人", rule: `월지 ${BRANCH_CHAR[mb]} 기준(삼합 오행의 양간)`, targets: `${STEM_CHAR[wd]}(천간)`, hits: hitsStem(wd) });
  const cd = CHEONDEOK[mb]!;
  rows.push({
    key: "cheondeok", group: GJ, name: "천덕귀인", hanja: "天德貴人", rule: `월지 ${BRANCH_CHAR[mb]} 기준`,
    targets: "stem" in cd ? `${STEM_CHAR[cd.stem]}(천간)` : `${ch(cd.branch)}(지지)`,
    hits: "stem" in cd ? hitsStem(cd.stem) : hitsBranch([cd.branch]),
  });

  // ── 삼합 계열: 도화·역마·화개는 일지·연지 기준 모두
  const kinds = [
    { key: "dohwa", name: "도화살", hanja: "桃花", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.dohwa },
    { key: "yeokma", name: "역마살", hanja: "驛馬", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.yeokma },
    { key: "hwagae", name: "화개살", hanja: "華蓋", pick: (g: (typeof SAMHAP_GROUPS)[number]) => g.hwagae },
  ];
  for (const k of kinds)
    for (const base of [
      { label: "일주" as const, b: p.day.branch, word: "일지" },
      { label: "연주" as const, b: p.year.branch, word: "연지" },
    ]) {
      const t = k.pick(groupOf(base.b));
      rows.push({
        key: `${k.key}-${base.word}`, group: SH, name: `${k.name} · ${base.word} 기준`, hanja: k.hanja,
        rule: `${base.word} ${BRANCH_CHAR[base.b]}(삼합 ${(groupOf(base.b).members as readonly number[]).map((m) => BRANCH_CHAR[m]).join("")})`,
        targets: ch(t), hits: hitsBranch([t], base.label),
      });
    }
  rows.push({ key: "gongmang", group: SH, name: "공망", hanja: "空亡", rule: `일주 ${STEM_CHAR[dg]}${BRANCH_CHAR[p.day.branch]} 기준`, targets: gongmang(dg, p.day.branch).map(ch).join("·"), hits: hitsBranch([...gongmang(dg, p.day.branch)], "일주") });

  // ── 일간 기준 그 외
  const yi = YANGIN[dg] ?? null;
  rows.push({
    key: "yangin", group: IL, name: "양인살", hanja: "羊刃", rule: dayRule,
    targets: yi === null ? "음간은 넣지 않았어요" : ch(yi),
    hits: yi === null ? [] : hitsBranch([yi]),
    note: "양간(甲丙戊庚壬)만 봐요. 음간 양인은 학파 차이가 커서 넣지 않았어요.",
  });
  rows.push({ key: "hongyeom", group: IL, name: "홍염살", hanja: "紅艶煞", rule: dayRule, targets: ch(HONGYEOM[dg]!), hits: hitsBranch([HONGYEOM[dg]!]), note: "책마다 칸이 다른 항목이에요." });
  const gs = GOSIN_GWASUK.find((g) => (g.members as readonly number[]).includes(p.year.branch))!;
  rows.push({ key: "gosin", group: IL, name: "고신살 · 연지 기준", hanja: "孤辰", rule: `연지 ${BRANCH_CHAR[p.year.branch]}`, targets: ch(gs.gosin), hits: hitsBranch([gs.gosin], "연주") });
  rows.push({ key: "gwasuk", group: IL, name: "과숙살 · 연지 기준", hanja: "寡宿", rule: `연지 ${BRANCH_CHAR[p.year.branch]}`, targets: ch(gs.gwasuk), hits: hitsBranch([gs.gwasuk], "연주") });

  // ── 간지·지지 쌍
  const ganji = (set: readonly (readonly [number, number])[]) =>
    list.filter((x) => x.p && set.some(([s, b]) => x.p!.stem === s && x.p!.branch === b)).map((x) => x.label as string);
  rows.push({ key: "goegang", group: PR, name: "괴강살", hanja: "魁罡", rule: "네 기둥의 간지 중", targets: "庚辰·庚戌·壬辰·戊戌", hits: ganji(GOEGANG), note: "일주에 있을 때를 주로 봐요." });
  rows.push({ key: "baekho", group: PR, name: "백호살", hanja: "白虎", rule: "네 기둥의 간지 중", targets: "甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑", hits: ganji(BAEKHO) });
  const pairs = (set: readonly (readonly [number, number])[]) => {
    const out: string[] = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!, b = list[j]!;
        if (!a.p || !b.p) continue;
        if (set.some(([x, y]) => (a.p!.branch === x && b.p!.branch === y) || (a.p!.branch === y && b.p!.branch === x)))
          out.push(`${a.label}-${b.label}(${BRANCH_CHAR[a.p.branch]}${BRANCH_CHAR[b.p.branch]})`);
      }
    return out;
  };
  rows.push({ key: "wonjin", group: PR, name: "원진살", hanja: "怨嗔", rule: "네 기둥 지지끼리", targets: "子未·丑午·寅酉·卯申·辰亥·巳戌", hits: pairs(WONJIN) });
  rows.push({ key: "gwimun", group: PR, name: "귀문관살", hanja: "鬼門關", rule: "네 기둥 지지끼리", targets: "子酉·丑午·寅未·卯申·辰亥·巳戌", hits: pairs(GWIMUN) });
  const hasB = (b: number) => list.some((x) => x.p && x.p.branch === b);
  rows.push({ key: "cheonra", group: PR, name: "천라(戌亥)", hanja: "天羅", rule: "네 기둥 지지에 戌과 亥가 모두", targets: "戌·亥", hits: hasB(10) && hasB(11) ? ["있어요"] : [] });
  rows.push({ key: "jimang", group: PR, name: "지망(辰巳)", hanja: "地網", rule: "네 기둥 지지에 辰과 巳가 모두", targets: "辰·巳", hits: hasB(4) && hasB(5) ? ["있어요"] : [] });
  return rows;
}

/** 12신살 표: 일지·연지 각각을 기준으로 네 기둥 지지가 어느 신살에 해당하는지 */
export function twelveSinsal(p: Pillars) {
  const cols = [
    { label: "시주" as const, p: p.hour },
    { label: "일주" as const, p: p.day },
    { label: "월주" as const, p: p.month },
    { label: "연주" as const, p: p.year },
  ];
  return [
    { word: "일지 기준", base: p.day.branch },
    { word: "연지 기준", base: p.year.branch },
  ].map((r) => ({
    word: r.word,
    base: r.base,
    group: (groupOf(r.base).members as readonly number[]).map((m) => BRANCH_CHAR[m]).join(""),
    cells: cols.map((c) =>
      c.p ? { label: c.label, branch: c.p.branch, idx: sinsal12Index(r.base, c.p.branch) } : { label: c.label, branch: null, idx: null },
    ),
  }));
}
