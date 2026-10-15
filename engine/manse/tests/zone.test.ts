import { describe, expect, it } from 'vitest';
import { localToUtc, offsetAtUtc } from '../src/zone';

/** 개발 환경 ICU(Intl)의 Asia/Seoul 과 대조: 내 구현과 독립적인 시간대 자료 */
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
function icuOffsetMin(utcMs: number): number {
  const p = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((local - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

describe('Asia/Seoul 역사적 시간대 — ICU 대조', () => {
  it('1908-04-02 ~ 2100 을 5시간 간격으로 샘플링해 오프셋이 일치 (분 단위)', () => {
    const bad: string[] = [];
    for (let t = Date.UTC(1908, 3, 2); t < Date.UTC(2100, 0, 1); t += 5 * 3_600_000) {
      const mine = Math.round(offsetAtUtc(t).totalMin), icu = icuOffsetMin(t);
      if (mine !== icu) bad.push(`${new Date(t).toISOString()} mine=${mine} icu=${icu}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('서머타임·표준시 전환일 앞뒤 3일을 10분 간격으로 촘촘히 대조', () => {
    const points = [[1908, 4, 1], [1912, 1, 1], [1945, 9, 8], [1948, 6, 1], [1948, 9, 13], [1949, 4, 3], [1954, 3, 21], [1955, 5, 5], [1955, 9, 9], [1957, 5, 5], [1960, 9, 17], [1961, 8, 10], [1987, 5, 10], [1987, 10, 11], [1988, 5, 8], [1988, 10, 9]];
    const bad: string[] = [];
    for (const [y, m, d] of points) for (let t = Date.UTC(y, m - 1, d) - 3 * 86_400_000; t < Date.UTC(y, m - 1, d) + 3 * 86_400_000; t += 10 * 60_000) {
      const mine = Math.round(offsetAtUtc(t).totalMin), icu = icuOffsetMin(t);
      if (mine !== icu) bad.push(`${new Date(t).toISOString()} mine=${mine} icu=${icu}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('1987-05-10 02:00~03:00 는 서머타임 시작으로 존재하지 않는 시각', () => {
    expect(localToUtc(1987, 5, 10, 2, 30, 0)).toHaveLength(0);
    expect(localToUtc(1987, 5, 10, 3, 0, 0)).toHaveLength(1);
    expect(localToUtc(1987, 5, 10, 1, 59, 0)[0].offset.totalMin).toBe(540);
  });
  it('1987-10-11 02:00~03:00 는 서머타임 종료로 두 번 존재 (첫 번째=서머타임)', () => {
    const c = localToUtc(1987, 10, 11, 2, 30, 0);
    expect(c).toHaveLength(2);
    expect(c[0].dst).toBe(true); expect(c[1].dst).toBe(false);
    expect(c[1].utcMs - c[0].utcMs).toBe(3_600_000);
  });
  it('1954-03-21 ~ 1961-08-09 는 표준시 UTC+8:30', () => {
    expect(offsetAtUtc(Date.UTC(1958, 0, 15)).totalMin).toBe(510);
    expect(offsetAtUtc(Date.UTC(1958, 6, 15)).totalMin).toBe(570); // 1958 여름: 서머타임 +9:30
    expect(offsetAtUtc(Date.UTC(1962, 0, 15)).totalMin).toBe(540);
  });
});
