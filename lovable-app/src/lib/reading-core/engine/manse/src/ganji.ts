// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/** 양(true) / 음(false) */
export const stemYang = (s: number) => s % 2 === 0;
export const branchYang = (b: number) => b % 2 === 0;
const STEM_EL: Element[] = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
const BRANCH_EL: Element[] = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
export const stemElement = (s: number) => STEM_EL[s];
export const branchElement = (b: number) => BRANCH_EL[b];

export const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 60갑자 번호(0=甲子) ↔ (천간, 지지). 천간·지지 번호의 홀짝이 같은 조합만 존재한다. */
export function pillarIndex(stem: number, branch: number): number {
  for (let i = 0; i < 6; i++) { const n = branch + 12 * i; if (n % 10 === stem) return n; }
  throw new Error(`불가능한 간지 조합 stem=${stem} branch=${branch}`);
}
export const fromIndex = (idx: number) => ({ stem: mod(idx, 10), branch: mod(idx, 12) });

export interface Ganji { stem: number; branch: number; ganji: string; ganjiKo: string; index: number }
export function makeGanji(stem: number, branch: number): Ganji {
  return { stem, branch, ganji: STEMS[stem] + BRANCHES[branch], ganjiKo: STEMS_KO[stem] + BRANCHES_KO[branch], index: pillarIndex(stem, branch) };
}
export const ganjiFromIndex = (idx: number): Ganji => { const { stem, branch } = fromIndex(idx); return makeGanji(stem, branch); };
