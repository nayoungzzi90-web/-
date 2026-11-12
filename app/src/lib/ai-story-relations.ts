// 원국·대운·세운의 합·충·형·파·해 "발견" 계층.
//
// 중요: 이 파일은 관계를 **찾기만 한다.** 합화·삼합이 실제로 성립했는지, 충이 합 때문에 풀렸는지는 판정하지 않는다
// (지시서 V3.0: "발견과 실제 성립을 구분한다". 성립 조건은 R-005·R-010 승인 전).
// 표는 입문서에서 흔히 쓰는 일반 표이며 원문·전문가 검증 전이다. 천간충은 학파별 차이가 있어 정책 값으로 켜고 끈다.
import type { Pillar } from "./saju";

type P4 = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
export const STEM_KO2 = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
export const BRANCH_KO2 = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const EL = ["나무", "나무", "불", "불", "흙", "흙", "쇠", "쇠", "물", "물"];
const TURN: Record<string, string> = { 나무: "나무로", 불: "불로", 흙: "흙으로", 쇠: "쇠로", 물: "물로" };

export interface RelationPolicy {
  /** 천간충(갑경·을신·병임·정계)을 쓰는 학파인가. 기본은 쓰지 않고 '긴장 후보'로만 적지 않는다 */
  stemClash: boolean;
}
export const DEFAULT_RELATION_POLICY: RelationPolicy = { stemClash: true };

// 천간합: 갑기·을경·병신·정임·무계 (합해서 되는 오행은 참고로만 적고 성립은 판정하지 않는다)
const STEM_HAP: [number, number, string][] = [[0, 5, "흙"], [1, 6, "쇠"], [2, 7, "물"], [3, 8, "나무"], [4, 9, "불"]];
const STEM_CHUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9]];
// 지지 관계(자0 축1 인2 묘3 진4 사5 오6 미7 신8 유9 술10 해11)
const CHUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const HAP6: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const PA: [number, number][] = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [10, 7]];
const HAE: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
// 삼합(생지·왕지·고지)과 방합
const SAMHAP: { name: string; el: string; set: [number, number, number]; king: number }[] = [
  { name: "인오술", el: "불", set: [2, 6, 10], king: 6 },
  { name: "신자진", el: "물", set: [8, 0, 4], king: 0 },
  { name: "사유축", el: "쇠", set: [5, 9, 1], king: 9 },
  { name: "해묘미", el: "나무", set: [11, 3, 7], king: 3 },
];
const BANGHAP: { name: string; el: string; set: [number, number, number] }[] = [
  { name: "인묘진", el: "나무", set: [2, 3, 4] },
  { name: "사오미", el: "불", set: [5, 6, 7] },
  { name: "신유술", el: "쇠", set: [8, 9, 10] },
  { name: "해자축", el: "물", set: [11, 0, 1] },
];
const HYUNG_PAIRS: [number, number][] = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]]; // 인사·사신·인신 / 축술·술미·축미 / 자묘
const SELF_HYUNG = [4, 6, 9, 11]; // 진·오·유·해 (같은 글자가 둘일 때)
const has = (set: [number, number][], a: number, b: number) => set.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export interface Pos { label: string; stem: number | null; branch: number }
export const positionsOf = (p: P4): Pos[] => [
  { label: "연", stem: p.year.stem, branch: p.year.branch },
  { label: "월", stem: p.month.stem, branch: p.month.branch },
  { label: "일", stem: p.day.stem, branch: p.day.branch },
  ...(p.hour ? [{ label: "시", stem: p.hour.stem, branch: p.hour.branch }] : []),
];

/** 하늘 글자 관계 발견(원국 안, 또는 외부(대운·세운) 글자와 원국) */
export function stemRelations(base: Pos[], ext?: { label: string; stem: number }, policy = DEFAULT_RELATION_POLICY): string[] {
  const items: { label: string; stem: number }[] = base.filter((x) => x.stem !== null).map((x) => ({ label: `${x.label}간`, stem: x.stem! }));
  const out: string[] = [];
  const pairs: [{ label: string; stem: number }, { label: string; stem: number }][] = [];
  if (ext) for (const it of items) pairs.push([ext, it]);
  else for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) pairs.push([items[i]!, items[j]!]);
  for (const [a, b] of pairs) {
    for (const [x, y, el] of STEM_HAP)
      if ((a.stem === x && b.stem === y) || (a.stem === y && b.stem === x))
        out.push(`${a.label} ${STEM_KO2[a.stem]} ↔ ${b.label} ${STEM_KO2[b.stem]}: 천간합 후보(합해서 ${TURN[el]} 바뀌는지는 판정하지 않음)`);
    if (policy.stemClash) for (const [x, y] of STEM_CHUNG)
      if ((a.stem === x && b.stem === y) || (a.stem === y && b.stem === x)) out.push(`${a.label} ${STEM_KO2[a.stem]} ↔ ${b.label} ${STEM_KO2[b.stem]}: 천간충(부딪힘) 후보`);
  }
  return out;
}

/** 땅 글자 관계 발견. ext 가 있으면 그 글자와 원국의 관계(삼합·방합은 원국 두 글자 + 외부 글자 조합까지) */
export function branchRelations(base: Pos[], ext?: { label: string; branch: number }): string[] {
  const out: string[] = [];
  const nm = (b: number) => BRANCH_KO2[b]!;
  const items = base.map((x) => ({ label: `${x.label}지`, branch: x.branch }));
  const pairs: [{ label: string; branch: number }, { label: string; branch: number }][] = [];
  if (ext) for (const it of items) pairs.push([ext, it]);
  else for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) pairs.push([items[i]!, items[j]!]);
  for (const [a, b] of pairs) {
    const tag = `${a.label} ${nm(a.branch)} ↔ ${b.label} ${nm(b.branch)}`;
    if (has(CHUNG, a.branch, b.branch)) out.push(`${tag}: 충`);
    if (has(HAP6, a.branch, b.branch)) out.push(`${tag}: 육합 후보`);
    if (has(PA, a.branch, b.branch)) out.push(`${tag}: 파`);
    if (has(HAE, a.branch, b.branch)) out.push(`${tag}: 해`);
    if (HYUNG_PAIRS.some(([x, y]) => (a.branch === x && b.branch === y) || (a.branch === y && b.branch === x))) out.push(`${tag}: 형 후보`);
    if (a.branch === b.branch && SELF_HYUNG.includes(a.branch)) out.push(`${tag}: 자형 후보`);
  }
  // 삼합·방합: 원국(+외부) 땅 글자 집합에서 찾는다. 외부 글자가 있으면 그 글자가 들어간 조합만 적는다
  const set = new Set<number>([...items.map((x) => x.branch), ...(ext ? [ext.branch] : [])]);
  const mentions = (b: number[]) => !ext || b.includes(ext.branch);
  for (const t of SAMHAP) {
    const present = t.set.filter((b) => set.has(b));
    if (present.length === 3 && mentions(present)) out.push(`${t.name} 삼합 후보(${t.el}): 세 글자가 모두 있음(성립 여부는 판정하지 않음)`);
    else if (present.length === 2 && present.includes(t.king) && mentions(present)) out.push(`${t.name} 반합 후보(${t.el}): ${present.map(nm).join("·")}`);
  }
  for (const t of BANGHAP) {
    const present = t.set.filter((b) => set.has(b));
    if (present.length === 3 && mentions(present)) out.push(`${t.name} 방합 후보(${t.el}): 세 글자가 모두 있음(성립 여부는 판정하지 않음)`);
  }
  return [...new Set(out)];
}

export const elementOfStemKo = (stem: number) => EL[stem]!;
