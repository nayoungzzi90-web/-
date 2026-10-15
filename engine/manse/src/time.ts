/** 그레고리력(역산 포함) ↔ 율리우스 일수. 모든 날짜 연산은 정수 일수로 한다. */
export function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export function ymdFromJdn(j: number): { y: number; m: number; d: number } {
  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  return { d: e - Math.floor((153 * m + 2) / 5) + 1, m: m + 3 - 12 * Math.floor(m / 10), y: 100 * b + d - 4800 + Math.floor(m / 10) };
}
export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number) => [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
export const validYmd = (y: number, m: number, d: number) => Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d) && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);

export const MS_DAY = 86_400_000;
const JDN_1970 = 2440588;
/** epoch ms(UTC) 의 달력 필드를 offset 분만큼 옮겨서 읽는다 */
export interface Fields { y: number; m: number; d: number; hh: number; mi: number; ss: number; ms: number }
export function fieldsAt(utcMs: number, offsetMin: number): Fields {
  const t = utcMs + offsetMin * 60_000;
  const day = Math.floor(t / MS_DAY), rem = t - day * MS_DAY;
  const { y, m, d } = ymdFromJdn(day + JDN_1970);
  return { y, m, d, hh: Math.floor(rem / 3_600_000), mi: Math.floor((rem % 3_600_000) / 60_000), ss: Math.floor((rem % 60_000) / 1000), ms: rem % 1000 };
}
/** 달력 필드(해당 시계의 값)를 epoch ms 로 — offset 은 이 시계가 UTC 보다 앞선 분 */
export function msFromFields(y: number, m: number, d: number, hh: number, mi: number, ss: number, offsetMin: number): number {
  return (jdn(y, m, d) - JDN_1970) * MS_DAY + hh * 3_600_000 + mi * 60_000 + ss * 1000 - offsetMin * 60_000;
}
/** 시계상 날짜의 정수 일수(JDN) */
export const dayNumberAt = (utcMs: number, offsetMin: number) => Math.floor((utcMs + offsetMin * 60_000) / MS_DAY) + JDN_1970;
export const isoUtc = (ms: number) => new Date(ms).toISOString();
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const fmtClock = (f: Fields) => `${f.y}-${pad2(f.m)}-${pad2(f.d)}T${pad2(f.hh)}:${pad2(f.mi)}:${pad2(f.ss)}`;
