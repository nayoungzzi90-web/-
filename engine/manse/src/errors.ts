export type ManseErrorCode =
  | 'INVALID_INPUT' | 'INVALID_DATE' | 'OUT_OF_RANGE' | 'INVALID_TIME'
  | 'NONEXISTENT_LOCAL_TIME' | 'AMBIGUOUS_LOCAL_TIME'
  | 'INVALID_LUNAR_DATE' | 'LEAP_MONTH_NOT_FOUND' | 'LUNAR_OUT_OF_RANGE'
  | 'INVALID_POLICY' | 'INVALID_BIRTHPLACE' | 'GENDER_REQUIRED' | 'DATA_UNAVAILABLE';

export interface ManseError { code: ManseErrorCode; message: string; details?: Record<string, unknown> }
export type Result<T> = { ok: true; value: T } | { ok: false; error: ManseError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: ManseErrorCode, message: string, details?: Record<string, unknown>): Result<never> => ({ ok: false, error: { code, message, details } });
