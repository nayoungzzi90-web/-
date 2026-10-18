import { describe, expect, it } from "vitest";
import { toLunar, toSolar, LunarTable } from "kor-lunar";
import { convertLunarToSolar } from "@/lib/lunar-conversion.server";
import { computeSaju, parseBirthInput, previewFromBirthInput } from "@/lib/saju-engine.server";

const conv = (date: string, leap: boolean) => {
  const r = convertLunarToSolar(date, leap);
  return r.ok ? r.conversion.convertedSolarDate : null;
};
const pad = (n: number) => String(n).padStart(2, "0");
const lunar = (over: Record<string, unknown>) => ({
  name: "t",
  gender: "f",
  calendar: "lunar",
  leap: false,
  date: "2025-06-01",
  time: "12:00",
  ...over,
});

describe("R-001 음력/윤달 → 양력 변환", () => {
  it("공개 기준 사례", () => {
    expect(conv("2025-06-01", true)).toBe("2025-07-25"); // 2025 윤6월 1일
    expect(conv("2025-06-01", false)).toBe("2025-06-25");
    expect(conv("2026-01-01", false)).toBe("2026-02-17"); // 2026 설날
    expect(conv("2017-05-01", true)).toBe("2017-06-24"); // 2017 윤5월 1일
    expect(conv("2017-03-01", false)).not.toBeNull();
    expect(conv("2017-03-01", true)).toBeNull(); // 2017 윤달은 5월
    expect(conv("2025-01-01", true)).toBeNull(); // 2025 윤1월 없음
  });

  it("작은달 30일·형식 오류·boolean 아닌 leap 거부", () => {
    // 29일인 달 찾기 (kor-lunar 표 사용 안 함: 본 변환기 자체 거부 확인)
    expect(conv("2025-06-30", true)).toBe(
      LunarTable.getLeapMonthDays(2025, 6) === 30 ? conv("2025-06-30", true) : null,
    );
    let found = 0;
    for (let m = 1; m <= 12; m++)
      if (LunarTable.getMonthDays(2024, m) === 29) {
        expect(conv(`2024-${pad(m)}-30`, false)).toBeNull();
        found++;
      }
    expect(found).toBeGreaterThan(0);
    for (const d of [
      " 2025-06-01",
      "2025-6-1",
      "2025/06/01",
      "2025-13-01",
      "2025-00-10",
      "2025-06-31",
      "",
      "abcd-ef-gh",
    ])
      expect(conv(d, false), d).toBeNull();
    for (const v of ["true", 1, null, undefined, 0])
      expect(convertLunarToSolar("2025-06-01", v).ok).toBe(false);
    expect(convertLunarToSolar(20250601, false).ok).toBe(false);
  });

  it("월경계·월말 및 1900/2026 지원 범위", () => {
    expect(conv("2025-06-29", true)).toBe("2025-08-22");
    expect(conv("1899-12-01", false)).toBe("1900-01-01");
    expect(conv("1899-11-30", false) ?? conv("1899-11-29", false)).toBeNull(); // 1899년 양력 → 범위 밖
    // 양력 2026-12-31에 해당하는 음력은 허용, 그 다음 날(양력 2027-01-01)은 거부
    const l = toLunar(2026, 12, 31),
      n = toLunar(2027, 1, 1);
    expect(conv(`${l.year}-${pad(l.month)}-${pad(l.day)}`, l.isLeapMonth)).toBe("2026-12-31");
    expect(conv(`${n.year}-${pad(n.month)}-${pad(n.day)}`, n.isLeapMonth)).toBeNull();
    // 음 2026-12월 후반은 양력 2027 → 거부
    expect(conv("2026-12-29", false)).toBeNull();
    expect(conv("1898-12-01", false)).toBeNull();
  });

  it("엔진 연동: 음력 간지 대신 양력 환산 날짜로 4주, provenance·finalApproved=false", () => {
    const p = previewFromBirthInput(lunar({}));
    const s = computeSaju({ year: 2025, month: 6, day: 25, hour: 12, minute: 0 });
    expect(p.ok).toBe(true);
    expect(p.pillars).toEqual(s.pillars);
    expect(p.originalBirthCalendar).toBe("lunar");
    expect(p.calendarConversion?.independentlyVerified).toBe(false);
    expect(p.finalApproved).toBe(false);
    expect(previewFromBirthInput(lunar({ leap: true, date: "2025-01-01" })).ok).toBe(false);
    expect(previewFromBirthInput(lunar({ leap: "true" })).ok).toBe(false);
    expect(previewFromBirthInput(lunar({ leap: undefined })).ok).toBe(false);
    const solar = previewFromBirthInput({
      calendar: "solar",
      leap: false,
      date: "2025-06-25",
      time: "12:00",
    });
    expect(solar.originalBirthCalendar).toBe("solar");
    expect(solar.calendarConversion).toBeUndefined();
  });

  it("음력 입력도 DST·절입일 시간 미상·자정 정책 유지", () => {
    // 양력 1988-10-09 02:30 (서머타임 중복) = 음력 1988-08-29
    expect(conv("1988-08-29", false)).toBe("1988-10-09");
    expect(previewFromBirthInput(lunar({ date: "1988-08-29", time: "02:30" })).ok).toBe(false);
    // 양력 2026-02-04 입춘일 = 음력 2025-12-17, 시간 미상 → 차단
    expect(conv("2025-12-17", false)).toBe("2026-02-04");
    expect(previewFromBirthInput(lunar({ date: "2025-12-17", time: null })).ok).toBe(false);
    // 입춘 전/후 연주는 절입 엔진이 결정 (음력 연도 아님)
    expect(
      previewFromBirthInput(lunar({ date: "2025-12-17", time: "04:00" })).pillars?.year.hanja,
    ).toBe("乙巳");
    expect(
      previewFromBirthInput(lunar({ date: "2025-12-17", time: "06:00" })).pillars?.year.hanja,
    ).toBe("丙午");
    // 음력 2026-01-01(설날)이라도 입춘 이후이므로 丙午 — 음력 새해 기준 아님 / 음 2025-12-10 = 양 2026-01-28 → 乙巳
    expect(previewFromBirthInput(lunar({ date: "2025-12-10" })).pillars?.year.hanja).toBe("乙巳");
    // 자정 기본 정책: 1999-12-01(음) = 2000-01-07(양) 23:30 → 甲子일
    expect(conv("1999-12-01", false)).toBe("2000-01-07");
    expect(
      previewFromBirthInput(lunar({ date: "1999-12-01", time: "23:30" })).pillars?.day.hanja,
    ).toBe("甲子");
  });

  it("독립 패키지(kor-lunar) 전수 비교 + 왕복: 1899~2026 모든 음력 일자 및 모든 윤달 1일", () => {
    let compared = 0,
      mismatch = 0,
      leapStarts = 0,
      rejectedOutOfRange = 0,
      invalidRejected = 0;
    const mism: string[] = [];
    for (let y = 1899; y <= 2026; y++) {
      const lm = LunarTable.getLeapMonth(y);
      for (let m = 1; m <= 12; m++) {
        for (const leap of lm === m ? [false, true] : [false]) {
          const days = leap ? LunarTable.getLeapMonthDays(y, m) : LunarTable.getMonthDays(y, m);
          for (let d = 1; d <= 30; d++) {
            const date = `${y}-${pad(m)}-${pad(d)}`;
            const ours = conv(date, leap);
            if (d > days) {
              if (ours === null) invalidRejected++;
              else {
                mismatch++;
                mism.push(date + (leap ? "L" : ""));
              }
              continue;
            }
            const k = toSolar(y, m, d, leap);
            const ks = `${k.year}-${pad(k.month)}-${pad(k.day)}`;
            if (ks < "1900-01-01" || ks > "2026-12-31") {
              if (ours === null) rejectedOutOfRange++;
              else mismatch++;
              continue;
            }
            compared++;
            if (leap && d === 1) leapStarts++;
            if (ours !== ks) {
              mismatch++;
              mism.push(`${date}${leap ? "L" : ""} ours=${ours} kor=${ks}`);
            }
          }
        }
        if (lm !== m) {
          // 윤달이 없는 달에 윤달 지정 → 거부
          if (conv(`${y}-${pad(m)}-01`, true) === null) invalidRejected++;
          else {
            mismatch++;
            mism.push(`${y}-${m} 가짜윤달`);
          }
        }
      }
    }
    console.log(
      `[lunar-xcheck] compared=${compared} leapMonthStarts=${leapStarts} invalidRejected=${invalidRejected} outOfRangeRejected=${rejectedOutOfRange} mismatch=${mismatch}`,
      mism.slice(0, 5),
    );
    expect(compared).toBeGreaterThan(40000);
    expect(leapStarts).toBeGreaterThan(40);
    expect(mismatch).toBe(0);
  });
});
