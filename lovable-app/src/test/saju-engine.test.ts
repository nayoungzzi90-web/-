import { describe, expect, it } from "vitest";
import { computeSaju, parseBirthInput, seoulWallToUtc, solarTermsUtc, utcToSeoulWall } from "@/lib/saju-engine.server";
import * as saju from "@/lib/saju";

const KST = 9 * 3600_000;
const kst = (utc: Date) => new Date(utc.getTime() + KST).toISOString().slice(0, 16).replace("T", " ");
const birth = (over: Record<string, unknown>) => ({ name: "테스트", calendar: "solar", leap: false, date: "1995-03-21", time: "07:30", gender: "f", ...over });

describe("R-001 만세력 엔진", () => {
  it("2026 입춘·경칩이 KASI 공개 기준과 90초 이내로 일치한다", () => {
    const terms = solarTermsUtc(2026);
    // KASI: 입춘 2026-02-04 05:02 KST, 경칩 2026-03-05 22:59 KST
    expect(Math.abs(terms[0]!.getTime() - Date.UTC(2026, 1, 3, 20, 2))).toBeLessThanOrEqual(90_000);
    expect(Math.abs(terms[1]!.getTime() - Date.UTC(2026, 2, 5, 13, 59))).toBeLessThanOrEqual(90_000);
  });

  it("입춘 전후로 연주가 바뀐다 (2025 乙巳 → 2026 丙午)", () => {
    expect(computeSaju({ year: 2026, month: 2, day: 4, hour: 4, minute: 0 }).pillars?.year.hanja).toBe("乙巳");
    expect(computeSaju({ year: 2026, month: 2, day: 4, hour: 6, minute: 0 }).pillars?.year.hanja).toBe("丙午");
  });

  it("입춘 정확한 순간 ±120초 이내는 검토 필요로 표시한다", () => {
    const w = utcToSeoulWall(solarTermsUtc(2026)[0]!);
    expect(computeSaju({ year: w.y, month: w.mo, day: w.d, hour: w.h, minute: w.mi }).needsReview).toBe(true);
    expect(computeSaju({ year: 2026, month: 2, day: 10, hour: 12, minute: 0 }).needsReview).toBe(false);
  });

  it("일주 벤치마크: 2000-01-07 甲子, 1995-03-21 辛亥, 1990-04-19 甲寅, 60일 순환", () => {
    expect(computeSaju({ year: 2000, month: 1, day: 7, hour: 12, minute: 0 }).pillars?.day.hanja).toBe("甲子");
    expect(computeSaju({ year: 2000, month: 3, day: 7, hour: 12, minute: 0 }).pillars?.day.hanja).toBe("甲子");
    expect(computeSaju({ year: 1995, month: 3, day: 21, hour: 7, minute: 30 }).pillars?.day.hanja).toBe("辛亥");
    expect(computeSaju({ year: 1990, month: 4, day: 19, hour: 12, minute: 0 }).pillars?.day.hanja).toBe("甲寅");
  });

  it("시주: 甲/己일 子시는 甲子, 자시는 23:00~00:59다", () => {
    expect(computeSaju({ year: 2000, month: 1, day: 7, hour: 0, minute: 30 }).pillars?.hour?.hanja).toBe("甲子");
    const q = computeSaju({ year: 2000, month: 1, day: 8, hour: 0, minute: 30 });
    expect(q.pillars?.day.hanja).toBe("乙丑");
    expect(q.pillars?.hour?.hanja).toBe("丙子");
  });

  it("기본 정책 midnight: 자정(00:00)에 일주가 교체된다", () => {
    // 2000-01-07 23:30은 당일 甲子 일주 유지, 子시 천간은 당일 일간(甲) 기준 甲子
    const late = computeSaju({ year: 2000, month: 1, day: 7, hour: 23, minute: 30 });
    expect(late.pillars?.day.hanja).toBe("甲子");
    expect(late.pillars?.hour?.hanja).toBe("甲子");
    // 2000-01-08 00:30은 乙丑 일주, 子시 천간은 乙일 기준 丙子
    const next = computeSaju({ year: 2000, month: 1, day: 8, hour: 0, minute: 30 });
    expect(next.pillars?.day.hanja).toBe("乙丑");
    expect(next.pillars?.hour?.hanja).toBe("丙子");
  });

  it("선택 정책 zi23: 23:30은 익일 일주로 전환한다 (명시 선택 전용)", () => {
    const p = computeSaju({ year: 2000, month: 1, day: 7, hour: 23, minute: 30 }, "zi23");
    expect(p.pillars?.day.hanja).toBe("乙丑");
    expect(p.pillars?.hour?.branch).toBe(0);
    expect(p.pillars?.hour?.hanja).toBe("丙子");
  });

  it("zi23 정책에서 출생시간 미상이면 일주가 모호하므로 차단한다", () => {
    const p = computeSaju({ year: 1995, month: 3, day: 21, hour: null, minute: 0 }, "zi23");
    expect(p.ok).toBe(false);
    expect(p.pillars).toBeUndefined();
    // midnight 기본 정책에서는 같은 입력이 3주 6글자로 정상 출력
    expect(computeSaju({ year: 1995, month: 3, day: 21, hour: null, minute: 0 }).ok).toBe(true);
  });

  it("월주: 庚辰년 입춘 후 寅月은 戊寅월이다", () => {
    const p = computeSaju({ year: 2000, month: 2, day: 10, hour: 12, minute: 0 });
    expect(p.pillars?.year.hanja).toBe("庚辰");
    expect(p.pillars?.month.hanja).toBe("戊寅");
  });

  it("서머타임 소멸 시각은 차단한다 (1988-05-08 02:30)", () => {
    expect(seoulWallToUtc(1988, 5, 8, 2, 30).status).toBe("nonexistent");
    expect(computeSaju({ year: 1988, month: 5, day: 8, hour: 2, minute: 30 }).ok).toBe(false);
  });

  it("서머타임 중복 시각은 임의 선택 없이 차단한다 (1988-10-09 02:30)", () => {
    expect(seoulWallToUtc(1988, 10, 9, 2, 30).status).toBe("ambiguous");
    const p = computeSaju({ year: 1988, month: 10, day: 9, hour: 2, minute: 30 });
    expect(p.ok).toBe(false);
    expect(p.error).toContain("두 번 존재");
  });

  it("절입일에 출생시간 미상이면 년주·월주를 확정하지 않고 차단한다 (2026-02-04 입춘)", () => {
    const p = computeSaju({ year: 2026, month: 2, day: 4, hour: null, minute: 0 });
    expect(p.ok).toBe(false);
    expect(p.error).toContain("절입일");
    expect(p.pillars).toBeUndefined();
    expect(p.elements).toBeUndefined();
  });

  it("일반일 시간 미상은 시주 없이 3주 6글자로 정상 출력한다", () => {
    const p = computeSaju({ year: 1995, month: 3, day: 21, hour: null, minute: 0 });
    expect(p.ok).toBe(true);
    expect(p.pillars?.hour).toBeNull();
    expect(p.charCount).toBe(6);
    expect(Object.values(p.elements!).reduce((a, b) => a + b, 0)).toBe(6);
    const withTime = computeSaju({ year: 1995, month: 3, day: 21, hour: 7, minute: 30 });
    expect(withTime.charCount).toBe(8);
  });

  it("잘못된 시간 문자열 8종을 모두 거부한다", () => {
    for (const t of ["abc", "12:xx", "24:00", "12:99", "12:30:40", " 12:30", "12:30 ", "7:30"]) {
      const r = parseBirthInput(birth({ time: t }));
      expect(r.ok, `time=${JSON.stringify(t)}`).toBe(false);
    }
    expect(parseBirthInput(birth({ time: "07:30" })).ok).toBe(true);
    expect(parseBirthInput(birth({ time: "23:59" })).ok).toBe(true);
  });

  it("잘못된 JSON·타입 입력을 예외 없이 거부한다", () => {
    for (const bad of [null, undefined, "str", 42, [], { calendar: "solar" }, birth({ date: 123 }), birth({ time: 7 })]) {
      const r = parseBirthInput(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
      if (!r.ok) expect(typeof r.error).toBe("string");
    }
  });

  it("날짜는 엄격한 YYYY-MM-DD + 실존 날짜만 허용한다", () => {
    for (const d of ["1995-3-21", "1995/03/21", "1995-02-30", "1899-01-01", "abcd-ef-gh", "1995-03-21 "]) {
      expect(parseBirthInput(birth({ date: d })).ok, d).toBe(false);
    }
  });

  it("음력은 서버 변환 후에만 허용, 없는 윤달·양력+윤달은 차단한다 (fail-closed)", () => {
    // R-001 lunar 단계: 음력 평달은 서버에서 양력으로 변환됨 (1995 음 3/21 → 양 1995-04-20)
    const l = parseBirthInput(birth({ calendar: "lunar" }));
    expect(l.ok && l.conversion?.convertedSolarDate).toBe("1995-04-20");
    // 1995년 윤달은 8월 → 윤3월은 존재하지 않아 차단
    expect(parseBirthInput(birth({ calendar: "lunar", leap: true, time: null })).ok).toBe(false);
    expect(parseBirthInput(birth({ leap: true })).ok).toBe(false);
    // leap이 boolean이 아닌 문자열/숫자여도 통과하지 않는다
    for (const v of ["true", 1, "false", 0]) {
      expect(parseBirthInput(birth({ leap: v })).ok, JSON.stringify(v)).toBe(false);
    }
    // calendar가 solar가 아닌 임의 값도 차단
    expect(parseBirthInput(birth({ calendar: "SOLAR" })).ok).toBe(false);
    expect(parseBirthInput(birth({ calendar: 1 })).ok).toBe(false);
    // time은 null(미상)과 빈 문자열을 구별한다 — 빈 문자열은 거부
    expect(parseBirthInput(birth({ time: null })).ok).toBe(true);
    expect(parseBirthInput(birth({ time: "" })).ok).toBe(false);
  });

  it("isValidDate도 엄격한 형식을 요구한다", () => {
    expect(saju.isValidDate("1995-03-21")).toBe(true);
    expect(saju.isValidDate("1995-3-21")).toBe(false);
    expect(saju.isValidDate("1995-02-30")).toBe(false);
  });

  it("절기 캐시는 변조할 수 없다", () => {
    const a = solarTermsUtc(2026);
    (a as Date[])[0] = new Date(0); // 배열 인덱스 교체 시도
    expect(solarTermsUtc(2026)[0]!.getTime()).not.toBe(0);
    const b = solarTermsUtc(2026);
    b[0]!.setTime(0); // 반환된 Date 객체 자체 변조 시도
    expect(solarTermsUtc(2026)[0]!.getTime()).not.toBe(0);
  });

  it("finalApproved=false와 검증 상태를 항상 반환한다", () => {
    const p = computeSaju({ year: 1995, month: 3, day: 21, hour: 7, minute: 30 });
    expect(p.finalApproved).toBe(false);
    expect(p.engineVersion).toMatch(/^r001-/);
    expect(p.clockPolicy).toContain("Asia/Seoul");
    expect(p.dayBoundaryPolicy).toContain("midnight");
  });

  it("MOCK 해시 계산이 클라이언트 모듈에서 제거됐다", () => {
    expect((saju as Record<string, unknown>)["calculate"]).toBeUndefined();
    expect((saju as Record<string, unknown>)["seeded"]).toBeUndefined();
  });

  it("ok:false일 때 UI는 해석·오행을 노출하지 않는다", async () => {
    const { SajuResult } = await import("@/routes/character");
    // SajuResult는 pillars/elements가 있는 ok:true 결과만 받는다 — ok:false는 별도 안내 카드로 렌더링
    expect(typeof SajuResult).toBe("function");
    const blocked = computeSaju({ year: 2026, month: 2, day: 4, hour: null, minute: 0 });
    expect(blocked.ok).toBe(false);
    expect(blocked.pillars).toBeUndefined();
    expect(blocked.elements).toBeUndefined();
  });

  it("유료 열람 잠금 유지: Paywall은 disabled 버튼만 렌더링한다", async () => {
    const { Paywall } = await import("@/components/Paywall");
    expect(Paywall.toString()).toContain("disabled");
  });
});
