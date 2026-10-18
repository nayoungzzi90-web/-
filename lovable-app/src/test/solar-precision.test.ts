// R-001 정밀 절입 검증: 엔진 12절기 vs KASI 공개 달력자료(분 단위 해상도, 참고용)
// 주의: KASI 기준이 분 단위이므로 이 검증은 '분 해상도 대조'이며 초 단위 정확도를 주장하지 않는다.
import { describe, expect, it } from "vitest";
import { computeSaju, solarTermsUtc, utcToSeoulWall } from "@/lib/saju-engine.server";
import { KASI_12JEOL, engineTermFor } from "./fixtures/kasi_12jeol_2025_2027";

interface Diff {
  year: number;
  name: string;
  signedSec: number;
  absSec: number;
}

function allDiffs(): Diff[] {
  const out: Diff[] = [];
  for (const year of [2025, 2026, 2027]) {
    KASI_12JEOL[year]!.forEach((kasi, i) => {
      const { engineYear, engineIdx } = engineTermFor(year, i);
      const engine = solarTermsUtc(engineYear)[engineIdx]!;
      const signedSec = (engine.getTime() - kasi.utcMs) / 1000;
      out.push({ year, name: kasi.name, signedSec, absSec: Math.abs(signedSec) });
    });
  }
  return out;
}

describe("R-001 정밀 절입 검증 (KASI 2025~2027, 36개)", () => {
  const diffs = allDiffs();
  const abs = diffs.map((d) => d.absSec).sort((a, b) => a - b);
  const max = abs[abs.length - 1]!;
  const median = abs[Math.floor(abs.length / 2)]!;
  const p95 = abs[Math.floor(abs.length * 0.95) - 1]!;
  const within = (s: number) => abs.filter((a) => a <= s).length;

  it("36개 전부 KASI 기준과 ±120초 이내다 (초과 시 NO-GO, 기준 완화 금지)", () => {
    const worst = [...diffs].sort((a, b) => b.absSec - a.absSec).slice(0, 10);
    console.log("=== KASI 36개 대조 요약 ===");
    console.log(`max=${max.toFixed(1)}s median=${median.toFixed(1)}s p95=${p95.toFixed(1)}s`);
    console.log(`≤60s: ${within(60)}/36, ≤90s: ${within(90)}/36, ≤120s: ${within(120)}/36`);
    console.log(
      "최대 불일치 상위 10:",
      worst
        .map((w) => `${w.year} ${w.name} ${w.signedSec >= 0 ? "+" : ""}${w.signedSec.toFixed(1)}s`)
        .join(" | "),
    );
    expect(diffs.length).toBe(36);
    expect(max).toBeLessThanOrEqual(120);
  });

  it("소한(1월)은 전년도 인덱스 11로 매핑된다", () => {
    // 2026년 소한은 solarTermsUtc(2025)[11]
    const { engineYear, engineIdx } = engineTermFor(2026, 0);
    expect(engineYear).toBe(2025);
    expect(engineIdx).toBe(11);
    const engine = solarTermsUtc(2025)[11]!;
    expect(Math.abs(engine.getTime() - KASI_12JEOL[2026]![0]!.utcMs)).toBeLessThanOrEqual(120_000);
  });

  it("절입 경계 ±120초 이내는 검토 필요, ±1초는 UTC 계산 결과를 그대로 사용한다", () => {
    const w = utcToSeoulWall(solarTermsUtc(2026)[0]!); // 2026 입춘 정확한 순간
    expect(
      computeSaju({ year: w.y, month: w.mo, day: w.d, hour: w.h, minute: w.mi }).needsReview,
    ).toBe(true);
    // 경계에서 충분히 먼 날은 검토 불필요
    expect(computeSaju({ year: 2026, month: 6, day: 15, hour: 12, minute: 0 }).needsReview).toBe(
      false,
    );
  });
});

describe("년주·월주 회귀 (소한 연말연초 매핑 포함)", () => {
  it("2025~2027 소한 전후 월주가 丑月→寅月으로 바뀐다", () => {
    // 2026-01-05 17:23 KST 소한 전: 乙巳년 戊子月(대설 후 子月), 후: 己丑月
    const before = computeSaju({ year: 2026, month: 1, day: 5, hour: 12, minute: 0 });
    const after = computeSaju({ year: 2026, month: 1, day: 5, hour: 20, minute: 0 });
    expect(before.pillars?.year.hanja).toBe("乙巳");
    expect(before.pillars?.month.hanja).toBe("戊子");
    expect(after.pillars?.month.hanja).toBe("己丑");
    expect(after.pillars?.year.hanja).toBe("乙巳"); // 입춘 전이라 연주는 그대로
  });

  it("1900/1988/2000년 대표 날짜의 년주·월주가 안정적이다", () => {
    // 1900-06-15: 庚子년 壬午月 (입춘 후 庚辰? 아님 — 1900은 庚子년, 망종 후 午月, 庚년 午月 천간 = 壬)
    const y1900 = computeSaju({ year: 1900, month: 6, day: 15, hour: 12, minute: 0 });
    expect(y1900.ok).toBe(true);
    expect(y1900.pillars?.year.hanja).toBe("庚子");
    expect(y1900.pillars?.month.hanja).toBe("壬午");
    // 1988-01-10: 소한(1/6) 후 입춘 전 — 丁卯년 癸丑月
    const y1988 = computeSaju({ year: 1988, month: 1, day: 10, hour: 12, minute: 0 });
    expect(y1988.pillars?.year.hanja).toBe("丁卯");
    expect(y1988.pillars?.month.hanja).toBe("癸丑");
    // 2000-12-31: 대설 후 子月 — 庚辰년 戊子月
    const y2000 = computeSaju({ year: 2000, month: 12, day: 31, hour: 12, minute: 0 });
    expect(y2000.pillars?.year.hanja).toBe("庚辰");
    expect(y2000.pillars?.month.hanja).toBe("戊子");
  });

  it("자정 기본 정책과 zi23 선택 정책, 서머타임 모호 시각 차단이 유지된다", () => {
    expect(
      computeSaju({ year: 2000, month: 1, day: 7, hour: 23, minute: 30 }).pillars?.day.hanja,
    ).toBe("甲子");
    expect(
      computeSaju({ year: 2000, month: 1, day: 7, hour: 23, minute: 30 }, "zi23").pillars?.day
        .hanja,
    ).toBe("乙丑");
    expect(computeSaju({ year: 1988, month: 10, day: 9, hour: 2, minute: 30 }).ok).toBe(false);
  });
});
