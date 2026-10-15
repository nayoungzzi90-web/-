import { fail, ok, Result } from './errors';

/**
 * 학파·관행이 갈리는 계산 정책. 코드 곳곳에 상수로 박지 않고 여기서만 정한다.
 * 기본값은 "임의 선택"이며, 결과 JSON 에 사용한 정책 전체와 해시가 기록된다.
 */
export interface ManseConfig {
  policyVersion: string;
  /** 연주 경계: 입춘 / 양력 1월 1일 / 음력 설(1월 1일) */
  yearBoundary: 'IPCHUN' | 'JAN1' | 'LUNAR_NEW_YEAR';
  /** 자시(23~01시) 처리 */
  ziHour: 'ZI_23_NEXT_DAY' | 'ZI_SPLIT_YAJA' | 'MIDNIGHT';
  solarTime: {
    mode: 'NONE' | 'LONGITUDE' | 'FIXED_OFFSET';
    fixedOffsetMinutes: number;
    applyEquationOfTime: boolean;
    /** LONGITUDE 인데 출생지 경도가 없을 때 */
    missingPlace: 'FLAG' | 'USE_SEOUL' | 'ERROR';
  };
  /** 시계 시각을 어떤 표준시로 환산할지 (1908–11, 1954–61 의 +8:30 시기 처리 포함) */
  timeBasis: 'KST_PLUS9' | 'ERA_STANDARD' | 'ERA_WALL_CLOCK';
  /** 음력 역일을 정하는 시계 (1912년 이전 처리). 기본값은 독립 대조에서 추정한 값이며 공식 확인 전이다 */
  lunarClock: 'PRE1912_UTC_PLUS8' | 'TZDB_STANDARD';
  /** 서머타임 종료로 같은 벽시계 시각이 두 번 있을 때 */
  dstAmbiguous: 'FIRST' | 'SECOND' | 'ERROR';
  hiddenStems: { table: 'STANDARD' | 'MAIN_ONLY' };
  relations: { halfTriple: 'WITH_PEAK' | 'NONE' };
  luck: {
    startPrecision: 'EXACT' | 'DAYS_QUOTIENT' | 'SHICHEN';
    yearLengthDays: number;
    missingGender: 'OMIT' | 'ERROR';
    count: number;
  };
  /** 절입 시각 ± (이 초 + 절입 불확실도) 안의 출생은 기둥을 확정하지 않는다 */
  boundaryGuardSeconds: number;
  /** true 면 공식 확인되지 않은 절기를 근거로 한 기둥은 모두 검토 필요로 표시 */
  requireOfficialTermData: boolean;
}

export const POLICY_VERSION = 'policy-1.0';
export const DEFAULT_CONFIG: ManseConfig = {
  policyVersion: POLICY_VERSION,
  yearBoundary: 'IPCHUN',
  ziHour: 'ZI_SPLIT_YAJA',
  solarTime: { mode: 'NONE', fixedOffsetMinutes: -30, applyEquationOfTime: false, missingPlace: 'FLAG' },
  timeBasis: 'KST_PLUS9',
  lunarClock: 'PRE1912_UTC_PLUS8',
  dstAmbiguous: 'FIRST',
  hiddenStems: { table: 'STANDARD' },
  relations: { halfTriple: 'WITH_PEAK' },
  luck: { startPrecision: 'EXACT', yearLengthDays: 365.2425, missingGender: 'OMIT', count: 10 },
  boundaryGuardSeconds: 120,
  requireOfficialTermData: false,
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type ConfigOverride = DeepPartial<ManseConfig>;

const ENUMS: Record<string, readonly string[]> = {
  yearBoundary: ['IPCHUN', 'JAN1', 'LUNAR_NEW_YEAR'], ziHour: ['ZI_23_NEXT_DAY', 'ZI_SPLIT_YAJA', 'MIDNIGHT'],
  'solarTime.mode': ['NONE', 'LONGITUDE', 'FIXED_OFFSET'], 'solarTime.missingPlace': ['FLAG', 'USE_SEOUL', 'ERROR'],
  timeBasis: ['KST_PLUS9', 'ERA_STANDARD', 'ERA_WALL_CLOCK'], lunarClock: ['PRE1912_UTC_PLUS8', 'TZDB_STANDARD'], dstAmbiguous: ['FIRST', 'SECOND', 'ERROR'],
  'hiddenStems.table': ['STANDARD', 'MAIN_ONLY'], 'relations.halfTriple': ['WITH_PEAK', 'NONE'],
  'luck.startPrecision': ['EXACT', 'DAYS_QUOTIENT', 'SHICHEN'], 'luck.missingGender': ['OMIT', 'ERROR'],
};

function get(o: unknown, path: string): unknown { return path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), o); }

/** 기본값에 덮어쓰고 값 범위를 검증한다. 알 수 없는 키·값은 조용히 무시하지 않고 오류로 돌려준다. */
export function resolveConfig(override: ConfigOverride = {}): Result<ManseConfig> {
  const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ManseConfig;
  const unknown: string[] = [];
  const walk = (src: Record<string, unknown>, dst: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(src)) {
      if (!(k in dst)) { unknown.push(prefix + k); continue; }
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, dst[k] as Record<string, unknown>, `${prefix}${k}.`);
      else if (v !== undefined) dst[k] = v;
    }
  };
  walk(override as Record<string, unknown>, merged as unknown as Record<string, unknown>, '');
  if (unknown.length) return fail('INVALID_POLICY', `알 수 없는 정책 키: ${unknown.join(', ')}`, { unknown });
  for (const [path, allowed] of Object.entries(ENUMS)) {
    const v = get(merged, path);
    if (!allowed.includes(v as string)) return fail('INVALID_POLICY', `정책 ${path} 값이 올바르지 않아요: ${String(v)}`, { path, allowed });
  }
  const num = (path: string, lo: number, hi: number) => { const v = get(merged, path); return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi; };
  if (!num('solarTime.fixedOffsetMinutes', -180, 180)) return fail('INVALID_POLICY', 'solarTime.fixedOffsetMinutes 는 -180~180 분이어야 해요.');
  if (!num('luck.yearLengthDays', 300, 400)) return fail('INVALID_POLICY', 'luck.yearLengthDays 는 300~400 이어야 해요.');
  if (!num('luck.count', 1, 12) || !Number.isInteger(merged.luck.count)) return fail('INVALID_POLICY', 'luck.count 는 1~12 정수여야 해요.');
  if (!num('boundaryGuardSeconds', 0, 3600)) return fail('INVALID_POLICY', 'boundaryGuardSeconds 는 0~3600 초여야 해요.');
  if (typeof merged.solarTime.applyEquationOfTime !== 'boolean' || typeof merged.requireOfficialTermData !== 'boolean') return fail('INVALID_POLICY', '불리언 정책 값이 올바르지 않아요.');
  return ok(merged);
}

/** 키 정렬 직렬화 */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}
/** 64비트 FNV-1a (암호학적 해시 아님 — 정책 식별용) */
export function hash64(text: string): string {
  let h = 0xcbf29ce484222325n; const P = 0x100000001b3n; const M = (1n << 64n) - 1n;
  for (const b of new TextEncoder().encode(text)) { h ^= BigInt(b); h = (h * P) & M; }
  return h.toString(16).padStart(16, '0');
}
export const policyHash = (c: ManseConfig) => hash64(stableStringify(c));
