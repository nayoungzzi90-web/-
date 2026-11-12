import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/reading-core/engine/manse/src/engine";
import { tenGod } from "@/lib/reading-core/engine/manse/src/tenGods";
import { STATIC_HIDDEN } from "@/lib/reading-core/engine/saju-rules/src/r003";
import { BRANCHES, STEMS } from "@/lib/reading-core/engine/manse/src/ganji";
import { computeDaeun } from "@/lib/daeun";
import { hiddenStemsOf, mainStemOf } from "@/lib/hidden-stems";
import { TEN_GOD_NOTE, tenGodOf } from "@/lib/ten-gods";

// 3단계 만세력 표: 십성·지장간·대운을 앱 구현으로 만들고, 루트 엔진·R-003 원문 데이터와 대조한다.
const POLICY = {
  ziHour: "MIDNIGHT",
  timeBasis: "KST_PLUS9",
  solarTime: { mode: "FIXED_OFFSET", fixedOffsetMinutes: -30 },
} as const;

describe("십성 이름", () => {
  it("일간 10 × 천간 10 = 100조합이 엔진과 모두 같다", () => {
    for (let dm = 0; dm < 10; dm++)
      for (let st = 0; st < 10; st++)
        expect(tenGodOf(dm, st)).toBe(tenGod(dm, st));
  });
  it("열 가지 이름에 정의 설명이 모두 있다", () => {
    for (const k of Object.keys(TEN_GOD_NOTE)) expect(TEN_GOD_NOTE[k as keyof typeof TEN_GOD_NOTE].length).toBeGreaterThan(5);
    expect(Object.keys(TEN_GOD_NOTE)).toHaveLength(10);
  });
});

describe("지장간 표(R-003 원문)", () => {
  it("12개 지지의 구성원·본기가 R-003 데이터와 같다", () => {
    for (let b = 0; b < 12; b++) {
      const src = STATIC_HIDDEN[BRANCHES[b] as keyof typeof STATIC_HIDDEN];
      const mine = hiddenStemsOf(b);
      expect(mine.map((h) => STEMS[h.stem])).toEqual(src.members);
      expect(STEMS[mainStemOf(b)]).toBe(src.main);
      expect(mine.filter((h) => h.main)).toHaveLength(1);
    }
  });
});

function sampleDates(): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = [];
  for (let y = 1930; y <= 2040; y += 7)
    for (const [m, d] of [[1, 5], [2, 4], [3, 21], [6, 15], [8, 8], [11, 7], [12, 31]] as const)
      out.push([y, m, d, (y + m + d) % 24, (y * 7 + d) % 60]);
  return out;
}

describe("대운", () => {
  it("루트 엔진(DE421)의 대운과 순행·간지·시작 나이가 모두 같다 (남녀 각각)", () => {
    let n = 0;
    for (const [y, m, d, h, mi] of sampleDates()) {
      for (const g of ["f", "m"] as const) {
        const mine = computeDaeun({ year: y, month: m, day: d, hour: h, minute: mi }, g);
        const r = calculate(
          { calendar: "solar", year: y, month: m, day: d, hour: h, minute: mi, gender: g === "f" ? "F" : "M" },
          POLICY,
        );
        if (!mine || !r.ok || !r.value.luck) continue;
        const L = r.value.luck;
        expect(mine.forward).toBe(L.direction === "FORWARD");
        expect(mine.pillars.map((p) => p.hanja)).toEqual(L.pillars.map((p) => p.pillar.ganji));
        // 시작 나이: 절입 시각 계산이 서로 독립이라 아주 작은 차이(초 단위)만 허용
        expect(Math.abs(mine.startAgeYears - L.startAgeYears)).toBeLessThan(0.001);
        expect(mine.startAge.years).toBe(L.startAge.years);
        n++;
      }
    }
    expect(n).toBeGreaterThan(200);
  });
  it("10개 대운이 10년 간격이고 같은 방향으로 60갑자를 따라 간다", () => {
    const d = computeDaeun({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }, "f")!;
    expect(d.pillars).toHaveLength(10);
    for (let i = 1; i < 10; i++)
      expect(d.pillars[i]!.startAgeYears - d.pillars[i - 1]!.startAgeYears).toBeCloseTo(10, 5);
    // 1990-05-15는 庚午년·辛巳월. 연간 庚은 양 → 여자는 역행: 辛巳 바로 앞 庚辰, 그 앞 己卯
    expect(d.forward).toBe(false);
    expect(d.pillars.slice(0, 2).map((p) => p.hanja)).toEqual(["庚辰", "己卯"]);
    // 같은 날 남자는 순행: 辛巳 바로 뒤 壬午, 그 뒤 癸未
    const m = computeDaeun({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }, "m")!;
    expect(m.forward).toBe(true);
    expect(m.pillars.slice(0, 2).map((p) => p.hanja)).toEqual(["壬午", "癸未"]);
  });
  it("출생 시간을 몰라도 계산하고(정오 가정) 그 사실을 알려 준다", () => {
    const d = computeDaeun({ year: 1990, month: 5, day: 15, hour: null, minute: 0 }, "f")!;
    expect(d.timeKnown).toBe(false);
    expect(d.pillars).toHaveLength(10);
  });
});
