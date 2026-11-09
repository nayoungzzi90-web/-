import { describe, expect, it } from "vitest";
import { dailyFortune } from "@/lib/daily";

describe("오늘의 복주머니", () => {
  it("같은 날·같은 일간이면 항상 같은 결과(결정론)", () => {
    const a = dailyFortune(6, "2026-11-09")!;
    const b = dailyFortune(6, "2026-11-09")!;
    expect(a).toEqual(b);
  });
  it("일간 10종 × 60일 모두 계산되고 검증 전 용어가 없다", () => {
    for (let s = 0; s < 10; s++) {
      for (let i = 0; i < 60; i++) {
        const dt = new Date(Date.UTC(2026, 0, 1 + i))
          .toISOString()
          .slice(0, 10);
        const f = dailyFortune(s, dt);
        expect(f).not.toBeNull();
        expect(JSON.stringify(f)).not.toMatch(
          /격국|용신|신강|신약|십성|대운|세운/,
        );
      }
    }
  });
  it("관계가 다섯 종류 모두 나온다", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const dt = new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10);
      seen.add(dailyFortune(6, dt)!.rel);
    }
    expect(seen.size).toBe(5);
  });
});
