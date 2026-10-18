// R-001 한국 음력/윤달 → 양력 변환 (서버 전용, 시범/검토용)
// - 변환 데이터: korean-lunar-calendar 0.4.0 (MIT, usingsky) — KASI 기반 내장 음력 표
// - KASI 공식 API(공공데이터포털)는 서비스키가 없어 실제 호출하지 않음 → independentlyVerified=false
// - 이 모듈은 '날짜'만 변환한다. 연/월주는 절입 태양황경, 일주는 변환된 법정 양력 날짜로 기존 엔진이 계산.
//   음력 달력의 간지(세차·월건·일진)를 사주 4주로 사용하지 않는다.
import KoreanLunarCalendar from "korean-lunar-calendar";
import {
  SOLAR_MAX,
  SOLAR_MIN,
  SUPPORT_MAX_YEAR,
  SUPPORT_MIN_YEAR,
  SUPPORT_RANGE_LABEL,
} from "./support-range";

export const CONVERSION_VERSION = "r001-lunar-0.1";
export const CONVERSION_SOURCE =
  "korean-lunar-calendar 0.4.0 (MIT, KASI 기반 내장 표; KASI 공식 API 실호출 아님)";
export { SOLAR_MAX, SOLAR_MIN };

export interface CalendarConversion {
  originalCalendar: "lunar";
  originalDate: string; // 음력 YYYY-MM-DD
  isLeapMonth: boolean;
  convertedSolarDate: string; // 양력 YYYY-MM-DD
  conversionVersion: string;
  sourceName: string;
  independentlyVerified: false;
}

const LUNAR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export type LunarResult =
  { ok: true; conversion: CalendarConversion } | { ok: false; error: string };

export function convertLunarToSolar(date: unknown, leap: unknown): LunarResult {
  if (typeof leap !== "boolean") return { ok: false, error: "윤달 여부 형식이 올바르지 않아요." };
  if (typeof date !== "string")
    return { ok: false, error: "음력 생년월일 형식이 올바르지 않아요 (YYYY-MM-DD)." };
  const m = LUNAR_RE.exec(date);
  if (!m) return { ok: false, error: "음력 생년월일 형식이 올바르지 않아요 (YYYY-MM-DD)." };
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  // 음력 연도는 1899(양력 1900년 1~2월에 해당) ~ 상한 연도만 후보. 최종 판단은 변환된 양력 날짜 기준.
  if (y < SUPPORT_MIN_YEAR - 1 || y > SUPPORT_MAX_YEAR)
    return { ok: false, error: `지원 범위는 양력 환산 ${SUPPORT_RANGE_LABEL}년이에요.` };
  if (mo < 1 || mo > 12 || d < 1 || d > 30)
    return { ok: false, error: "음력 월은 1~12, 일은 1~30 범위로 입력해 주세요." };

  const cal = new KoreanLunarCalendar();
  if (leap && !cal.setLunarDate(y, mo, 1, true)) {
    return {
      ok: false,
      error: `음력 ${y}년에는 윤${mo}월이 없어요. 윤달 체크를 해제하거나 날짜를 확인해 주세요.`,
    };
  }
  if (!cal.setLunarDate(y, mo, d, leap)) {
    return {
      ok: false,
      error: `음력 ${y}년 ${leap ? "윤" : ""}${mo}월에는 ${d}일이 없어요 (작은달 29일).`,
    };
  }
  const lunarSet = cal.getLunarCalendar();
  if (
    lunarSet.year !== y ||
    lunarSet.month !== mo ||
    lunarSet.day !== d ||
    !!lunarSet.intercalation !== leap
  ) {
    return { ok: false, error: "음력 변환을 확인할 수 없어 계산하지 않았어요." };
  }
  const s = cal.getSolarCalendar();
  const solar = `${pad(s.year, 4)}-${pad(s.month)}-${pad(s.day)}`;
  if (solar < SOLAR_MIN || solar > SOLAR_MAX) {
    return {
      ok: false,
      error: `양력으로 환산하면 지원 범위(${SUPPORT_RANGE_LABEL}년)를 벗어나요.`,
    };
  }
  // 왕복(round-trip) 검증: 양력 → 음력 재변환이 입력과 정확히 일치해야 함
  const back = new KoreanLunarCalendar();
  if (!back.setSolarDate(s.year, s.month, s.day))
    return { ok: false, error: "음력 변환을 확인할 수 없어 계산하지 않았어요." };
  const r = back.getLunarCalendar();
  if (r.year !== y || r.month !== mo || r.day !== d || !!r.intercalation !== leap) {
    return { ok: false, error: "음력 변환 왕복 검증이 일치하지 않아 계산하지 않았어요." };
  }
  return {
    ok: true,
    conversion: {
      originalCalendar: "lunar",
      originalDate: date,
      isLeapMonth: leap,
      convertedSolarDate: solar,
      conversionVersion: CONVERSION_VERSION,
      sourceName: CONVERSION_SOURCE,
      independentlyVerified: false,
    },
  };
}
