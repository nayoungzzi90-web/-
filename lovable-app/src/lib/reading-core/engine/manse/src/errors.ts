// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
export type ManseErrorCode =
  | 'INVALID_INPUT' | 'INVALID_DATE' | 'OUT_OF_RANGE' | 'INVALID_TIME'
  | 'NONEXISTENT_LOCAL_TIME' | 'AMBIGUOUS_LOCAL_TIME'
  | 'INVALID_LUNAR_DATE' | 'LEAP_MONTH_NOT_FOUND' | 'LUNAR_OUT_OF_RANGE'
  | 'INVALID_POLICY' | 'INVALID_BIRTHPLACE' | 'GENDER_REQUIRED' | 'DATA_UNAVAILABLE';

export interface ManseError { code: ManseErrorCode; message: string; details?: Record<string, unknown> }
export type Result<T> = { ok: true; value: T } | { ok: false; error: ManseError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: ManseErrorCode, message: string, details?: Record<string, unknown>): Result<never> => ({ ok: false, error: { code, message, details } });
