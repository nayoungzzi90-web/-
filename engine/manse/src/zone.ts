/**
 * 대한민국 역사적 시간대 (IANA tz `asia` 파일의 Asia/Seoul 과 ROK 규칙을 옮김).
 *
 *   Zone Asia/Seoul  8:27:52 -   LMT  1908 Apr  1
 *                    8:30    -   KST  1912 Jan  1
 *                    9:00    -   JST  1945 Sep  8
 *                    9:00    ROK  K%sT 1954 Mar 21
 *                    8:30    ROK  K%sT 1961 Aug 10
 *                    9:00    ROK  K%sT
 *
 * 전환 시각은 tz 의 "벽시계 00:00" 을 해당 직전 오프셋 기준 UTC 로 환산했다.
 * 개발 환경의 Intl(ICU) Asia/Seoul 과 1908년 이후 전 구간을 대조하는 테스트가 있다 (zone.test.ts).
 */
import { MS_DAY, daysInMonth, fieldsAt, jdn, msFromFields } from './time';

export interface ZoneOffset { stdMin: number; dstMin: number; totalMin: number; label: 'LMT' | 'KST' | 'JST' | 'KDT' }
export const ZONE_SOURCE = 'IANA tz database `asia` (eggert/tz main, 2026-10-15 열람) — Asia/Seoul + Rule ROK';

const LMT = 8 * 60 + 27 + 52 / 60; // 507.8667
const T = (y: number, m: number, d: number, offMin: number) => msFromFields(y, m, d, 0, 0, 0, offMin);
/** 표준 오프셋 구간 [시작 UTC, 오프셋(분), 이름]. 시작이 없는 첫 구간은 LMT. */
const STD: Array<{ from: number; min: number; name: 'LMT' | 'KST' | 'JST' }> = [
  { from: -Infinity, min: LMT, name: 'LMT' },
  { from: T(1908, 4, 1, LMT), min: 510, name: 'KST' },
  { from: T(1912, 1, 1, 510), min: 540, name: 'JST' },
  { from: T(1945, 9, 8, 540), min: 540, name: 'KST' }, // JST → KST (오프셋 동일)
  { from: T(1954, 3, 21, 540), min: 510, name: 'KST' },
  { from: T(1961, 8, 10, 510), min: 540, name: 'KST' },
];

/** 해당 월의 n번째 요일(dow 0=일) 이상(>=day) 날짜 */
function nthDowOnOrAfter(y: number, m: number, day: number, dow: number): number {
  const wd = (jdn(y, m, day) + 1) % 7; // JDN%7: 0=월 → +1 하면 0=일
  const add = (dow - wd + 7) % 7;
  const d = day + add;
  if (d > daysInMonth(y, m)) throw new Error('규칙 날짜가 월을 넘음');
  return d;
}

interface Dst { from: number; to: number } // [from, to) UTC
const DST: Dst[] = [];
function addDst(y: number, start: { m: number; d: number; h: number }, end: { m: number; d: number; h: number }, stdMin: number) {
  // 시작: 표준시 벽시계 / 끝: 서머타임 벽시계(= 표준+60). 24:00 은 다음날 00:00.
  const from = msFromFields(y, start.m, start.d, start.h, 0, 0, stdMin);
  const to = msFromFields(y, end.m, end.d, end.h === 24 ? 0 : end.h, 0, 0, stdMin + 60) + (end.h === 24 ? MS_DAY : 0);
  DST.push({ from, to });
}
{
  const satOnOrAfter = (y: number, m: number, d: number) => nthDowOnOrAfter(y, m, d, 6);
  const sunOnOrAfter = (y: number, m: number, d: number) => nthDowOnOrAfter(y, m, d, 0);
  addDst(1948, { m: 6, d: 1, h: 0 }, { m: 9, d: 12, h: 24 }, 540);
  addDst(1949, { m: 4, d: 3, h: 0 }, { m: 9, d: satOnOrAfter(1949, 9, 7), h: 24 }, 540);
  addDst(1950, { m: 4, d: 1, h: 0 }, { m: 9, d: satOnOrAfter(1950, 9, 7), h: 24 }, 540);
  addDst(1951, { m: 5, d: 6, h: 0 }, { m: 9, d: satOnOrAfter(1951, 9, 7), h: 24 }, 540);
  addDst(1955, { m: 5, d: 5, h: 0 }, { m: 9, d: 8, h: 24 }, 510);
  addDst(1956, { m: 5, d: 20, h: 0 }, { m: 9, d: 29, h: 24 }, 510);
  for (let y = 1957; y <= 1960; y++) addDst(y, { m: 5, d: sunOnOrAfter(y, 5, 1), h: 0 }, { m: 9, d: satOnOrAfter(y, 9, 17), h: 24 }, 510);
  for (let y = 1987; y <= 1988; y++) addDst(y, { m: 5, d: sunOnOrAfter(y, 5, 8), h: 2 }, { m: 10, d: sunOnOrAfter(y, 10, 8), h: 3 }, 540);
}

export function offsetAtUtc(utcMs: number): ZoneOffset {
  let std = STD[0];
  for (const s of STD) if (utcMs >= s.from) std = s;
  const dst = DST.some((r) => utcMs >= r.from && utcMs < r.to) ? 60 : 0;
  return { stdMin: std.min, dstMin: dst, totalMin: std.min + dst, label: std.name === 'LMT' ? 'LMT' : dst ? 'KDT' : std.name };
}

export interface LocalCandidate { utcMs: number; offset: ZoneOffset; dst: boolean }
/** 벽시계 필드 → UTC 후보. 0개=존재하지 않는 시각(서머타임 시작 공백), 2개=중복(서머타임 종료). */
export function localToUtc(y: number, m: number, d: number, hh: number, mi: number, ss: number): LocalCandidate[] {
  const wall = msFromFields(y, m, d, hh, mi, ss, 0);
  const seen = new Set<number>(); const out: LocalCandidate[] = [];
  // 하루 전후의 모든 오프셋을 후보로 시험
  for (const probe of [wall - 14 * 3_600_000 - MS_DAY, wall - 14 * 3_600_000, wall - 8 * 3_600_000, wall - 8 * 3_600_000 + MS_DAY]) {
    const o = offsetAtUtc(probe);
    for (const total of [o.stdMin, o.stdMin + 60]) {
      const utc = wall - Math.round(total * 60_000);
      const real = offsetAtUtc(utc);
      if (Math.abs(real.totalMin - total) < 1e-9 && !seen.has(utc)) { seen.add(utc); out.push({ utcMs: utc, offset: real, dst: real.dstMin > 0 }); }
    }
  }
  return out.sort((a, b) => a.utcMs - b.utcMs); // 중복 시각이면 [0]=첫 번째(서머타임 중), [1]=두 번째(표준시)
}

export { fieldsAt };
