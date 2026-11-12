import { describe, expect, it } from "vitest";
import { computeDaeunForBirth } from "@/lib/daeun";
import { computeDetail, countElements } from "@/lib/saju-detail";
import { ELEMENTS } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";

const NOW = new Date("2026-11-12T12:00:00+09:00");
const me = (date: string, time: string | null, gender: "f" | "m" = "f") => ({ name: "t", calendar: "solar" as const, leap: false, date, time, gender });

describe("명리 상세 분석(화면과 AI 사실이 같은 계산을 쓴다)", () => {
  it("오행 개수가 엔진의 preview.elements 와 같다(시간 있음·없음, 여러 날짜)", () => {
    for (let y = 1960; y <= 2010; y += 5)
      for (let m = 1; m <= 12; m++)
        for (const time of ["10:20", null]) {
          const p = previewFromBirthInput(me(`${y}-${String(m).padStart(2, "0")}-${String(((y + m) % 27) + 1).padStart(2, "0")}`, time));
          if (!p.ok || !p.pillars || !p.elements) continue;
          const c = countElements(p.pillars);
          for (const e of ELEMENTS) expect(c[e]).toBe(p.elements[e]);
        }
  });
  it("대운 10개·향후 5년이 나오고 지금 대운에만 now 표시가 있다", () => {
    const m = me("1995-07-15", "10:20");
    const p = previewFromBirthInput(m);
    const d = computeDetail(p.pillars!, p.elements!, computeDaeunForBirth(m), NOW);
    expect(d.daeun).toHaveLength(10);
    expect(d.daeun.filter((r) => r.now).map((r) => r.name)).toEqual(["병술"]);
    expect(d.daeunNowName).toBe("병술");
    expect(d.nextChange).toEqual({ year: 2033, age: 37 });
    expect(d.years.map((r) => r.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(d.years[0]!.now).toBe(true);
    for (const r of [...d.daeun, ...d.years]) expect(["오르는 구간", "엇갈리는 구간", "쉬어가는 구간"]).toContain(r.mood.label);
  });
  it("분위기는 신호의 개수 비교로만 정해진다(오르는: +가 -보다 많음)", () => {
    const m = me("1995-07-15", "10:20");
    const p = previewFromBirthInput(m);
    const d = computeDetail(p.pillars!, p.elements!, computeDaeunForBirth(m), NOW);
    for (const r of [...d.daeun, ...d.years]) {
      const pos = r.mood.signals.filter((s) => s === "+").length;
      const neg = r.mood.signals.filter((s) => s === "-").length;
      expect(r.mood.label).toBe(pos > neg ? "오르는 구간" : neg > pos ? "쉬어가는 구간" : "엇갈리는 구간");
    }
  });
  it("대운이 없으면(계산 실패) 대운 목록은 비고 5년은 그대로 나온다", () => {
    const m = me("1995-07-15", "10:20");
    const p = previewFromBirthInput(m);
    const d = computeDetail(p.pillars!, p.elements!, null, NOW);
    expect(d.daeun).toEqual([]);
    expect(d.daeunNowName).toBeNull();
    expect(d.years).toHaveLength(5);
  });
});
