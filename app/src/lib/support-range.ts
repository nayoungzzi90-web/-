// 지원 범위의 단일 출처. 값을 바꾸면 안내 문구·검증·테스트가 함께 따라온다.
// 상한 2050: 음력 변환 표(korean-lunar-calendar)가 양력 2050-12-31까지라서 그에 맞춘다.
// 2027~2050 절입·음력은 독립 구현(자체 DE421 엔진)과 교차 검증했다(docs/R001_RANGE_EXTENSION_2026-10-18.md).
export const SUPPORT_MIN_YEAR = 1900;
export const SUPPORT_MAX_YEAR = 2050;
export const SUPPORT_RANGE_LABEL = `${SUPPORT_MIN_YEAR}~${SUPPORT_MAX_YEAR}`;
export const SOLAR_MIN = `${SUPPORT_MIN_YEAR}-01-01`;
export const SOLAR_MAX = `${SUPPORT_MAX_YEAR}-12-31`;
