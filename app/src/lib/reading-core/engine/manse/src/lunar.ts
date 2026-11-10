// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
/**
 * 음양력 변환. 합삭(朔)과 중기(中氣)로 월 표를 만들어 변환한다.
 *  - 월 시작일: 합삭이 속한 날(한국 표준시 기준 역일)
 *  - 월 번호: 그 달에 든 중기로 정한다 (우수=1월 … 동지=11월 … 대한=12월)
 *  - 윤달: 중기가 없는 달. 동지가 든 달부터 다음 동지가 든 달 사이에 13개월이 있을 때 그 첫 무중기월
 * 역일 경계는 그 시기의 표준시 오프셋(서머타임 제외)으로 정한다. 한국천문연구원 공식 음력표와의 일치는
 * 독립 라이브러리(korean_lunar_calendar)와의 전수 대조로만 확인했다 (docs/manse/03_VERIFICATION.md).
 */
import { fail, ok, Result } from './errors';
import { dayNumberAt, jdn, validYmd, ymdFromJdn } from './time';
import { offsetAtUtc } from './zone';
import { NEW_MOONS_MS, ZHONGQI } from './terms';

export interface LunarMonth { startDay: number; length: number; year: number; month: number; leap: boolean; hasZhongqi: boolean; startMs: number }
export interface LunarDate { year: number; month: number; day: number; leap: boolean }

export type LunarClock = 'PRE1912_UTC_PLUS8' | 'TZDB_STANDARD';
const MS_1912 = Date.UTC(1911, 11, 31, 16); // 1912-01-01 00:00 +8:00 → 이전 시기의 역일 경계
/**
 * 합삭·중기가 속한 역일을 정하는 시계.
 *  - TZDB_STANDARD: 그 시기 표준시(서머타임 제외) — 1908–11 은 +8:30, 그 전은 서울 지방평균시
 *  - PRE1912_UTC_PLUS8: 1912년 이전은 UTC+8, 이후는 TZDB_STANDARD.
 *    ※ 근거는 독립 라이브러리(korean_lunar_calendar, KASI 자료 기반) 와의 전수 대조에서 추정한 것이며 공식 문서로 확인한 것이 아니다.
 */
const civilDayWith = (clock: LunarClock) => (ms: number) => dayNumberAt(ms, clock === 'PRE1912_UTC_PLUS8' && ms < MS_1912 ? 480 : offsetAtUtc(ms).stdMin);

function build(clock: LunarClock): LunarMonth[] {
  const civilDay = civilDayWith(clock);
  const starts = NEW_MOONS_MS.map((ms) => ({ ms, day: civilDay(ms) }));
  const zq = ZHONGQI.map((t) => ({ day: civilDay(t.ms), lon: t.lon }));
  interface Raw { startDay: number; endDay: number; startMs: number; zq: number[] }
  const raws: Raw[] = [];
  for (let i = 0; i + 1 < starts.length; i++) {
    const startDay = starts[i].day, endDay = starts[i + 1].day;
    const inside = zq.filter((z) => z.day >= startDay && z.day < endDay);
    raws.push({ startDay, endDay, startMs: starts[i].ms, zq: inside.map((z) => z.lon) });
  }
  // 동지(270°)가 든 달 = 11월. 인접한 두 11월 사이가 13개월이면 그 사이의 첫 무중기월이 윤달.
  // 번호는 중기 이름이 아니라 11월부터의 순서로 매긴다 (겨울에는 한 달에 중기가 둘 들어가는 달이 있어 중기 이름으로 매기면 어긋난다).
  const anchors = raws.map((r, i) => (r.zq.includes(270) ? i : -1)).filter((i) => i >= 0);
  const out: LunarMonth[] = [];
  for (let k = 0; k < anchors.length; k++) {
    const from = anchors[k];
    const to = k + 1 < anchors.length ? anchors[k + 1] : raws.length; // 마지막 구간은 끝까지(윤달 판정 불가 → 무중기월은 윤달 후보로만 취급하지 않음)
    const thirteen = k + 1 < anchors.length && to - from === 13;
    let prev = 11, leapUsed = false;
    for (let i = from; i < to; i++) {
      const r = raws[i];
      const has = r.zq.length > 0;
      let month: number, leap = false;
      if (i === from) month = 11;
      else if (thirteen && !leapUsed && !has) { month = prev; leap = true; leapUsed = true; }
      else month = (prev % 12) + 1;
      prev = month;
      const sd = ymdFromJdn(r.startDay);
      const year = month >= 11 && sd.m <= 2 ? sd.y - 1 : sd.y;
      out.push({ startDay: r.startDay, length: r.endDay - r.startDay, year, month, leap, hasZhongqi: has, startMs: r.startMs });
    }
  }
  return out;
}
const cache = new Map<LunarClock, LunarMonth[]>();
export const lunarMonths = (clock: LunarClock = 'PRE1912_UTC_PLUS8'): LunarMonth[] => { let t = cache.get(clock); if (!t) { t = build(clock); cache.set(clock, t); } return t; };
export const LUNAR_MONTHS = lunarMonths();
export const LUNAR_LAST_SOLAR_DAY = jdn(2100, 12, 31);
export const LUNAR_FIRST_SOLAR_DAY = jdn(1900, 1, 1);

export function solarToLunar(y: number, m: number, d: number, clock: LunarClock = 'PRE1912_UTC_PLUS8'): Result<LunarDate> {
  const LUNAR_MONTHS = lunarMonths(clock);
  if (!validYmd(y, m, d)) return fail('INVALID_DATE', `존재하지 않는 양력 날짜예요: ${y}-${m}-${d}`);
  const day = jdn(y, m, d);
  if (day < LUNAR_FIRST_SOLAR_DAY || day > LUNAR_LAST_SOLAR_DAY) return fail('LUNAR_OUT_OF_RANGE', '음력 변환은 양력 1900-01-01 ~ 2100-12-31 만 지원해요.');
  let lo = 0, hi = LUNAR_MONTHS.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (LUNAR_MONTHS[mid].startDay <= day) lo = mid; else hi = mid - 1; }
  const mo = LUNAR_MONTHS[lo];
  if (mo.startDay > day || day >= mo.startDay + mo.length) return fail('LUNAR_OUT_OF_RANGE', '음력 표 범위를 벗어났어요.');
  return ok({ year: mo.year, month: mo.month, leap: mo.leap, day: day - mo.startDay + 1 });
}

export function lunarToSolar(year: number, month: number, day: number, leap: boolean, clock: LunarClock = 'PRE1912_UTC_PLUS8'): Result<{ y: number; m: number; d: number }> {
  const LUNAR_MONTHS = lunarMonths(clock);
  if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1 || day > 30) return fail('INVALID_LUNAR_DATE', `올바르지 않은 음력 날짜예요: ${year}-${month}-${day}`);
  const mo = LUNAR_MONTHS.find((x) => x.year === year && x.month === month && x.leap === leap);
  if (!mo) {
    if (leap && LUNAR_MONTHS.some((x) => x.year === year && x.month === month && !x.leap)) return fail('LEAP_MONTH_NOT_FOUND', `${year}년에는 윤${month}월이 없어요.`, { year, month });
    return fail('LUNAR_OUT_OF_RANGE', `음력 ${year}년 ${month}월은 지원 범위 밖이에요.`);
  }
  if (day > mo.length) return fail('INVALID_LUNAR_DATE', `음력 ${year}년 ${leap ? '윤' : ''}${month}월은 ${mo.length}일까지예요.`, { length: mo.length });
  const s = ymdFromJdn(mo.startDay + day - 1);
  const j = mo.startDay + day - 1;
  if (j < LUNAR_FIRST_SOLAR_DAY || j > LUNAR_LAST_SOLAR_DAY) return fail('LUNAR_OUT_OF_RANGE', '변환 결과가 지원 범위(1900~2100)를 벗어나요.');
  return ok({ y: s.y, m: s.m, d: s.d });
}

/** 해당 양력 날짜가 속한 음력 연도의 설날(음력 1월 1일) 양력 날짜 */
export function lunarNewYear(year: number, clock: LunarClock = 'PRE1912_UTC_PLUS8'): { y: number; m: number; d: number } | null {
  const LUNAR_MONTHS = lunarMonths(clock);
  const mo = LUNAR_MONTHS.find((x) => x.year === year && x.month === 1 && !x.leap);
  return mo ? ymdFromJdn(mo.startDay) : null;
}
