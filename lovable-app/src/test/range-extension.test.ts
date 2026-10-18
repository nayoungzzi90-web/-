import { describe, expect, it } from "vitest";
import { computeSaju, parseBirthInput } from "@/lib/saju-engine.server";
import { SUPPORT_MAX_YEAR, SUPPORT_MIN_YEAR } from "@/lib/support-range";

// 2027~2050 기준값: 별도 구현(자체 DE421 만세력 엔진, engine/manse)이 같은 정책(자정 일주 경계, 서울 법정 벽시계)으로 계산한 값.
// 두 구현 모두 KASI 공식 확인이 아니라 서로의 교차 검증이다. 전수 비교는 docs/R001_RANGE_EXTENSION_2026-10-18.md 참고.
const CASES: [number, number, number, number, number, string, string, string, string][] = [
  [2027, 1, 1, 0, 30, "丙午", "庚子", "庚辰", "丙子"],
  [2027, 2, 4, 12, 0, "丁未", "壬寅", "甲寅", "庚午"],
  [2028, 2, 29, 23, 30, "戊申", "甲寅", "甲申", "甲子"],
  [2030, 6, 15, 3, 0, "庚戌", "壬午", "辛巳", "庚寅"],
  [2033, 12, 31, 23, 59, "癸丑", "甲子", "丙辰", "戊子"],
  [2036, 2, 4, 10, 0, "乙卯", "己丑", "辛丑", "癸巳"],
  [2040, 3, 20, 7, 30, "庚申", "己卯", "丁未", "甲辰"],
  [2044, 8, 8, 8, 8, "甲子", "壬申", "己丑", "戊辰"],
  [2045, 5, 5, 5, 5, "乙丑", "庚辰", "己未", "丁卯"],
  [2047, 11, 7, 18, 0, "丁卯", "庚戌", "乙亥", "乙酉"],
  [2050, 1, 1, 0, 0, "己巳", "丙子", "辛巳", "戊子"],
  [2050, 12, 31, 23, 59, "庚午", "戊子", "乙酉", "丙子"],
];

describe("지원 범위 확장 (1900~2050)", () => {
  it("범위 상수", () => {
    expect([SUPPORT_MIN_YEAR, SUPPORT_MAX_YEAR]).toEqual([1900, 2050]);
  });
  it.each(CASES)("%i-%i-%i %i:%i → 독립 구현과 4주 일치", (y, mo, d, h, mi, yp, mp, dp, hp) => {
    const p = computeSaju({ year: y, month: mo, day: d, hour: h, minute: mi });
    expect(p.ok).toBe(true);
    expect([
      p.pillars?.year.hanja,
      p.pillars?.month.hanja,
      p.pillars?.day.hanja,
      p.pillars?.hour?.hanja,
    ]).toEqual([yp, mp, dp, hp]);
  });
  it("2051년은 계산 범위 밖", () => {
    expect(computeSaju({ year: 2051, month: 1, day: 1, hour: 12, minute: 0 }).ok).toBe(false);
  });
  it("미래 날짜는 출생일로 입력할 수 없다(오늘 기준 주입)", () => {
    const base = { calendar: "solar", date: "2030-06-15", time: "03:00" };
    expect(parseBirthInput(base, { today: "2026-10-18" }).ok).toBe(false);
    expect(parseBirthInput(base, { today: "2030-06-15" }).ok).toBe(true);
    expect(parseBirthInput({ ...base, date: "2026-10-18" }, { today: "2026-10-18" }).ok).toBe(true);
    expect(parseBirthInput({ ...base, date: "2026-10-19" }, { today: "2026-10-18" }).ok).toBe(
      false,
    );
  });
  it("음력 입력도 환산된 양력이 미래면 거부", () => {
    // 음 2027-01-01 = 양 2027-02-07
    const lunar = { calendar: "lunar", leap: false, date: "2027-01-01", time: "12:00" };
    expect(parseBirthInput(lunar, { today: "2027-02-06" }).ok).toBe(false);
    expect(parseBirthInput(lunar, { today: "2027-02-07" }).ok).toBe(true);
  });
});
