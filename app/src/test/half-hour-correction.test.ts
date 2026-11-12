import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/reading-core/engine/manse/src/engine";
import { computeSaju } from "@/lib/saju-engine";

// 30분 보정(2026-11-12 사용자 결정): 일주·시주는 UTC+8:30 시각으로 정한다.
// 子시는 시계 23:30~01:29, 丑 01:30~03:29 … 일주는 시계 00:30에 바뀐다(자정 교체 정책의 보정 시각 00:00).
// POLICY 는 chart.server.ts 와 같은 값이다. 두 엔진이 따로 계산해 서로 일치해야 한다.
const POLICY = {
  ziHour: "MIDNIGHT",
  timeBasis: "KST_PLUS9",
  solarTime: { mode: "FIXED_OFFSET", fixedOffsetMinutes: -30 },
} as const;

type Ymd = [number, number, number];

function viaApp([y, m, d]: Ymd, h: number, mi: number) {
  const p = computeSaju({ year: y, month: m, day: d, hour: h, minute: mi });
  expect(p.ok).toBe(true);
  return [p.pillars?.day.hanja, p.pillars?.hour?.hanja];
}
function viaCore([y, m, d]: Ymd, h: number, mi: number) {
  const r = calculate(
    { calendar: "solar", year: y, month: m, day: d, hour: h, minute: mi },
    POLICY,
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return [];
  return [r.value.pillars.day.ganji, r.value.pillars.hour?.ganji];
}

// 2000-01-07 = 甲子일, 2000-01-08 = 乙丑일.
// [날짜, 시, 분, 일주, 시주]
const BOUNDARY: [Ymd, number, number, string, string][] = [
  [[2000, 1, 7], 23, 29, "甲子", "乙亥"], // 보정 22:59 → 亥
  [[2000, 1, 7], 23, 30, "甲子", "甲子"], // 보정 23:00 → 子 (자시 시작)
  [[2000, 1, 8], 0, 29, "甲子", "甲子"], // 보정 23:59 → 아직 1월 7일
  [[2000, 1, 8], 0, 30, "乙丑", "丙子"], // 보정 00:00 → 일주 교체, 子시 천간은 乙일 기준
  [[2000, 1, 8], 1, 29, "乙丑", "丙子"], // 보정 00:59 → 자시 끝
  [[2000, 1, 8], 1, 30, "乙丑", "丁丑"], // 보정 01:00 → 丑
  [[2000, 1, 8], 3, 29, "乙丑", "丁丑"], // 보정 02:59 → 丑 끝
  [[2000, 1, 8], 3, 30, "乙丑", "戊寅"], // 보정 03:00 → 寅
];

describe("30분 보정: 시지·일주 경계", () => {
  it.each(BOUNDARY)(
    "%j %i:%i → 일주 %s, 시주 %s (두 엔진 일치)",
    (ymd, h, mi, day, hour) => {
      expect(viaApp(ymd, h, mi)).toEqual([day, hour]);
      expect(viaCore(ymd, h, mi)).toEqual([day, hour]);
    },
  );

  it("연도·서머타임과 무관하게 UTC+8:30으로 읽는다 (1957, 1988 서머타임 시기)", () => {
    const samples: [Ymd, number, number][] = [
      [[1957, 7, 1], 12, 0],
      [[1957, 7, 1], 0, 10],
      [[1988, 7, 1], 23, 40],
      [[1988, 7, 1], 0, 20],
      [[1961, 8, 9], 6, 5],
      [[1975, 3, 3], 1, 29],
    ];
    for (const [ymd, h, mi] of samples) {
      expect(viaApp(ymd, h, mi)).toEqual(viaCore(ymd, h, mi));
    }
  });

  it("출생 시각을 모르면 입력한 날짜 그대로 일주를 정하고 시주는 없다", () => {
    const p = computeSaju({
      year: 2000,
      month: 1,
      day: 8,
      hour: null,
      minute: 0,
    });
    expect(p.ok).toBe(true);
    expect(p.pillars?.day.hanja).toBe("乙丑");
    expect(p.pillars?.hour).toBeNull();
  });
});
