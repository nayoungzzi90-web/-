import rawTerms from '../data/solar_terms.runtime.json';
import rawMoons from '../data/new_moons.json';
import { BRANCHES } from './ganji';

export type TermStatus = 'computed' | 'cross_checked' | 'official_confirmed' | 'official_mismatch' | 'boundary_review';
export interface Term { ms: number; year: number; seq: number; lon: number; name: string; isJie: boolean; branch: number | null; status: TermStatus; uncertaintySec: number; dataset: string }

export const TERM_DATASET = 'de421-own-v1';
export const TERM_ENGINE = 'manse-ref-1.0';
/** 교차검증 허용치(초): DE421 환산 vs 독립 구현(Swiss/Moshier) */
export const CROSS_CHECK_TOLERANCE_S = 5;
export const SUPPORTED_FROM = Date.UTC(1900, 0, 1) - 9 * 3600_000; // KST 1900-01-01 00:00
/**
 * 절입 시각 불확실도(초). ≤2026: 독립 천문 계산 2종 최대 차이 2.25초 + 시간 척도 여유.
 * 2027 이후는 미래 윤초·ΔT 를 예측해야 하므로 Swiss Ephemeris 와의 UTC 차이(최대 25초)를 반영해 키운다.
 */
export const uncertaintyForYear = (year: number) => (year <= 2026 ? 5 : year <= 2050 ? 30 : 60);

const SEQ = (lon: number) => ((((lon - 285) % 360) + 360) % 360) / 15 + 1;
/** 절(節) 황경 → 월지 번호: 285 소한→丑(1), 315 입춘→寅(2) … 255 대설→子(0) */
const JIE_BRANCH = (lon: number) => (((lon - 315 + 360) % 360) / 30 + 2) % 12;

const NAMES: Record<number, string> = { 285: '소한', 300: '대한', 315: '입춘', 330: '우수', 345: '경칩', 0: '춘분', 15: '청명', 30: '곡우', 45: '입하', 60: '소만', 75: '망종', 90: '하지', 105: '소서', 120: '대서', 135: '입추', 150: '처서', 165: '백로', 180: '추분', 195: '한로', 210: '상강', 225: '입동', 240: '소설', 255: '대설', 270: '동지' };
/** rows: [연도, 황경, UTC ms, 교차검증 통과(1/0)] — 전체 필드는 data/solar_terms.json (축소: tools/make-runtime-data.ts) */
export const TERMS: Term[] = (rawTerms.rows as number[][])
  .map(([year, lon, ms, ok]) => ({
    ms, year, seq: SEQ(lon), lon, name: NAMES[lon],
    isJie: lon % 30 === 15, branch: lon % 30 === 15 ? JIE_BRANCH(lon) : null,
    status: (ok === 1 ? 'cross_checked' : 'computed') as TermStatus,
    uncertaintySec: uncertaintyForYear(year), dataset: TERM_DATASET,
  }))
  .sort((a, b) => a.ms - b.ms);

export const NEW_MOONS_MS: number[] = rawMoons.utc_ms as number[];
export const JIE: Term[] = TERMS.filter((t) => t.isJie);
export const ZHONGQI: Term[] = TERMS.filter((t) => !t.isJie);
export const BRANCH_OF_JIE = (t: Term) => BRANCHES[t.branch as number];

function upperBound(arr: Term[], ms: number): number { // ms 보다 큰 첫 인덱스
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].ms <= ms) lo = mid + 1; else hi = mid; }
  return lo;
}
/** ms 이전(포함)의 마지막 항목과 이후 첫 항목 */
export function bracket(arr: Term[], ms: number): { prev: Term | null; next: Term | null } {
  const i = upperBound(arr, ms);
  return { prev: i > 0 ? arr[i - 1] : null, next: i < arr.length ? arr[i] : null };
}
export const findTerm = (year: number, lon: number) => TERMS.find((t) => t.year === year && t.lon === lon);
export const ipchun = (year: number) => findTerm(year, 315);

export interface DataVerification {
  dataset: string; engine: string;
  /** EPHEMERIS_CROSS_CHECKED: 독립 천문 계산 2종 일치. OFFICIAL_CONFIRMED: 공식표와 일치(현재 0건). */
  level: 'COMPUTED_ONLY' | 'EPHEMERIS_CROSS_CHECKED' | 'OFFICIAL_CONFIRMED';
  officialConfirmed: boolean;
  extendedRange: boolean;
  notes: string[];
}
export function describeVerification(used: Term[], supportedLastYear = 2050): DataVerification {
  const all = used.length ? used : [];
  const official = all.length > 0 && all.every((t) => t.status === 'official_confirmed');
  const cross = all.length > 0 && all.every((t) => t.status === 'cross_checked' || t.status === 'official_confirmed');
  const ext = all.some((t) => t.year > supportedLastYear);
  const notes: string[] = [];
  if (!official) notes.push('한국천문연구원 공식 절입시각과의 일치는 확인되지 않았다 (공식 자료 미적재).');
  if (ext) notes.push('2051년 이후 구간은 JPL DE421 공식 범위 밖일 수 있고 ΔT·윤초가 예측값이라 불확실도가 더 크다.');
  return { dataset: TERM_DATASET, engine: TERM_ENGINE, level: official ? 'OFFICIAL_CONFIRMED' : cross ? 'EPHEMERIS_CROSS_CHECKED' : 'COMPUTED_ONLY', officialConfirmed: official, extendedRange: ext, notes };
}
