// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import { BRANCH_MAIN_STEM, STEM_ELEMENT, branchGod, branchRelation, tenGod } from '../saju/rules';
import { Branch, BRANCH_KO, BRANCHES, Element, SajuFacts, Stem, STEM_KO, STEMS, TenGod } from '../saju/types';

/** 명리 분석의 "계산" 부분: 사실 줄(interpretation.ts)과 해석 명제(claims.ts)가 같은 값을 쓰도록 한 곳에서 계산한다. */
export type Group = '비겁' | '식상' | '재성' | '관성' | '인성';
export const GROUP: Record<TenGod, Group> = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
export const GROUPS: Group[] = ['비겁', '식상', '재성', '관성', '인성'];
export const GROUP_MEANING: Record<Group, string> = {
  비겁: '나와 같은 편·자존감·경쟁심', 식상: '표현력·재능·아이디어를 내보내는 힘', 재성: '현실 감각·재물·결과를 다루는 힘', 관성: '규칙·책임·사회적 인정과 압박', 인성: '배움·보호·정서적 지지',
};
export const GOD_TRAIT: Record<TenGod, string> = {
  비견: '자립심과 동료 의식', 겁재: '승부욕과 추진력', 식신: '표현력과 여유', 상관: '재치와 창의성', 편재: '활동성과 기회 포착력',
  정재: '성실함과 현실 감각', 편관: '도전 정신과 책임감', 정관: '신뢰감과 단정함', 편인: '직관과 독창성', 정인: '배려와 학습 의욕',
};
export const GOD_LOVE: Record<TenGod, string> = {
  비견: '친구처럼 대등한 관계를 편하게 느껴요', 겁재: '관계에서 주도권·경쟁 이슈가 생기기 쉬워요', 식신: '편안하게 챙기고 챙김받는 관계를 선호해요',
  상관: '솔직한 표현이 강하고 틀에 갇히는 걸 싫어해요', 편재: '활동적이고 자유로운 관계를 선호해요', 정재: '안정적이고 현실적인 관계를 선호해요',
  편관: '긴장감과 책임이 따르는 관계에 끌려요', 정관: '예의와 약속을 중시하는 관계를 선호해요', 편인: '정서적 거리와 혼자만의 시간이 필요해요', 정인: '이해받고 돌봄받는 관계를 선호해요',
};
export const STEM_COMBINE: [Stem, Stem][] = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
export const SEASON: Record<Branch, { name: string; element: Element }> = {
  寅: { name: '초봄', element: 'wood' }, 卯: { name: '한봄', element: 'wood' }, 辰: { name: '늦봄(토 기운이 센 달)', element: 'earth' },
  巳: { name: '초여름', element: 'fire' }, 午: { name: '한여름', element: 'fire' }, 未: { name: '늦여름(토 기운이 센 달)', element: 'earth' },
  申: { name: '초가을', element: 'metal' }, 酉: { name: '한가을', element: 'metal' }, 戌: { name: '늦가을(토 기운이 센 달)', element: 'earth' },
  亥: { name: '초겨울', element: 'water' }, 子: { name: '한겨울', element: 'water' }, 丑: { name: '늦겨울(토 기운이 센 달)', element: 'earth' },
};
export const PRODUCES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];
export const POS_STEM = { year: '연간', month: '월간', day: '일간', hour: '시간' } as const;
export const POS_BRANCH = { year: '연지', month: '월지', day: '일지', hour: '시지' } as const;
export type Pos = keyof typeof POS_STEM;

export const ko = (s: Stem) => STEM_KO[STEMS.indexOf(s)];
export const bko = (b: Branch) => BRANCH_KO[BRANCHES.indexOf(b)];
export const pillarsOf = (f: SajuFacts) => (Object.entries(f.pillars) as [Pos, string | null][]).filter(([, p]) => p) as [Pos, string][];

export interface GodSlot { pos: Pos; kind: '천간' | '지지'; stem: Stem; god: TenGod; w: number }
export interface ChartAnalysis {
  dm: Stem; dmEl: Element; hourKnown: boolean;
  pillars: [Pos, string][];
  counts: Record<Element, number>;
  dominant: Element[]; weak: Element[]; missing: Element[];
  gods: GodSlot[];
  groupScore: Record<Group, number>;
  top: Group[]; absent: Group[];
  monthGod: TenGod;
  self: number; other: number; power: 'SELF' | 'OTHER' | 'BALANCED';
  monthBranch: Branch; season: { name: string; element: Element }; seasonSupported: boolean;
  relations: string[];
}

export function analyzeChart(f: SajuFacts): ChartAnalysis {
  const dm = f.dayMaster, dmEl = STEM_ELEMENT[dm];
  const pillars = pillarsOf(f);
  const counts = f.fiveElements;
  const max = Math.max(...ELEMENTS.map((e) => counts[e])), min = Math.min(...ELEMENTS.map((e) => counts[e]));
  const gods: GodSlot[] = [];
  for (const [pos, pil] of pillars) {
    if (pos !== 'day') gods.push({ pos, kind: '천간', stem: pil[0] as Stem, god: tenGod(dm, pil[0] as Stem), w: 1 });
    gods.push({ pos, kind: '지지', stem: BRANCH_MAIN_STEM[pil[1] as Branch], god: branchGod(dm, pil[1] as Branch), w: pos === 'month' ? 2 : 1 });
  }
  const groupScore: Record<Group, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  gods.forEach((g) => (groupScore[GROUP[g.god]] += g.w));
  const ranked = (Object.entries(groupScore) as [Group, number][]).sort((a, c) => c[1] - a[1]);
  const self = groupScore.비겁 + groupScore.인성, other = groupScore.식상 + groupScore.재성 + groupScore.관성;
  const mb = f.pillars.month[1] as Branch, se = SEASON[mb];
  const supported = se.element === dmEl || PRODUCES[se.element] === dmEl;
  const rel: string[] = [];
  for (let i = 0; i < pillars.length; i++) for (let j = i + 1; j < pillars.length; j++) {
    const a = pillars[i], c = pillars[j];
    if (STEM_COMBINE.some(([x, y]) => (x === a[1][0] && y === c[1][0]) || (y === a[1][0] && x === c[1][0]))) rel.push(`${POS_STEM[a[0]]}(${a[1][0]})과 ${POS_STEM[c[0]]}(${c[1][0]})은 천간합`);
    const br = branchRelation(a[1][1] as Branch, c[1][1] as Branch);
    if (br !== '없음') rel.push(`${POS_BRANCH[a[0]]}(${a[1][1]})와 ${POS_BRANCH[c[0]]}(${c[1][1]})는 ${br}`);
  }
  return {
    dm, dmEl, hourKnown: f.pillars.hour !== null, pillars, counts,
    dominant: ELEMENTS.filter((e) => counts[e] === max), weak: ELEMENTS.filter((e) => counts[e] === min), missing: ELEMENTS.filter((e) => counts[e] === 0),
    gods, groupScore, top: ranked.filter(([, v]) => v === ranked[0][1] && v > 0).map(([g]) => g), absent: ranked.filter(([, v]) => v === 0).map(([g]) => g),
    monthGod: tenGod(dm, f.pillars.month[0] as Stem),
    self, other, power: self >= other * 1.3 ? 'SELF' : other >= self * 1.3 ? 'OTHER' : 'BALANCED',
    monthBranch: mb, season: se, seasonSupported: supported, relations: rel,
  };
}

export interface LoveAnalysis { palaceBranch: Branch; palaceGod: TenGod; jae: number; gwan: number; sik: number; inn: number; palaceRelations: [Pos, '육합' | '충'][]; gender?: 'F' | 'M' | 'X' }
export function analyzeLove(f: SajuFacts, gender?: 'F' | 'M' | 'X'): LoveAnalysis {
  const dm = f.dayMaster, db = f.pillars.day[1] as Branch;
  const all: TenGod[] = [];
  for (const [pos, pil] of pillarsOf(f)) { if (pos !== 'day') all.push(tenGod(dm, pil[0] as Stem)); all.push(branchGod(dm, pil[1] as Branch)); }
  const cnt = (g: Group) => all.filter((x) => GROUP[x] === g).length;
  const palaceRelations = pillarsOf(f).filter(([k]) => k !== 'day').map(([k, v]) => [k, branchRelation(db, v[1] as Branch)] as const).filter(([, r]) => r !== '없음') as [Pos, '육합' | '충'][];
  return { palaceBranch: db, palaceGod: branchGod(dm, db), jae: cnt('재성'), gwan: cnt('관성'), sik: cnt('식상'), inn: cnt('인성'), palaceRelations, gender };
}

export interface YearAnalysis { year: number; pillar: string; stemGod: TenGod; branchGod: TenGod; toDay: '육합' | '충' | '없음'; toMonth: '육합' | '충' | '없음' }
export function analyzeYear(f: SajuFacts, year: number, pillar: string): YearAnalysis {
  return {
    year, pillar, stemGod: tenGod(f.dayMaster, pillar[0] as Stem), branchGod: branchGod(f.dayMaster, pillar[1] as Branch),
    toDay: branchRelation(pillar[1] as Branch, f.pillars.day[1] as Branch), toMonth: branchRelation(pillar[1] as Branch, f.pillars.month[1] as Branch),
  };
}
