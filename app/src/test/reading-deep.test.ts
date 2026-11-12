import { describe, expect, it } from "vitest";
import { buildReading } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";

// 2단계 풀이 심화: 모든 일간·월지 조합에서 빈 문장·깨진 문장이 없고,
// 전문가 검증 전 판정(격국·용신·신강신약·십성·대운·세운)을 단정하지 않는지 확인한다.
const FORBIDDEN = ["격국", "용신", "신강", "신약", "십성", "대운", "세운", "undefined", "NaN", "[object"];

function dates(): string[] {
  const out: string[] = [];
  // 일간 10종 × 월지 12종을 모두 덮도록 1990~2025년에서 약 5일 간격으로 뽑는다.
  for (let y = 1990; y <= 2025; y += 5) {
    for (let m = 1; m <= 12; m++) for (const d of [3, 12, 21, 28]) {
      out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return out;
}

describe("풀이 심화(2단계)", () => {
  it("시간 포함: 섹션 12개, 모든 문장이 채워지고 금지 용어가 없다", () => {
    const stems = new Set<number>();
    const branches = new Set<number>();
    let n = 0;
    for (const date of dates()) {
      const p = previewFromBirthInput({
        name: "테스트",
        calendar: "solar",
        leap: false,
        date,
        time: "10:20",
        gender: "f",
      });
      if (!p.ok || !p.pillars) continue;
      const rd = buildReading(p);
      expect(rd).not.toBeNull();
      stems.add(p.pillars.day.stem);
      branches.add(p.pillars.month.branch);
      expect(rd!.sections.map((s) => s.id)).toEqual([
        "summary", "inner", "elements", "day", "season", "stage",
        "love", "work", "people", "advice", "charm", "habit",
      ]);
      for (const s of rd!.sections) {
        const all = [s.eyebrow, s.title, ...s.summary, ...s.body, ...s.basis];
        for (const t of all) {
          expect(t.trim().length).toBeGreaterThan(1);
          for (const bad of FORBIDDEN) expect(t).not.toContain(bad);
        }
        expect(s.summary).toHaveLength(3);
        expect(s.body.length).toBeGreaterThanOrEqual(1);
      }
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(380);
    expect(stems.size).toBe(10); // 일간 10종 모두 덮음
    expect(branches.size).toBe(12); // 월지 12종 모두 덮음
  });

  it("시간 미상: 시주 없이도 계산되고 안내 문장이 들어간다", () => {
    const p = previewFromBirthInput({
      name: "테스트",
      calendar: "solar",
      leap: false,
      date: "1995-07-15",
      time: null,
      gender: "m",
    });
    const rd = buildReading(p)!;
    const stage = rd.sections.find((s) => s.id === "stage")!;
    expect(stage.body.join(" ")).toContain("시주");
    expect(stage.basis).toHaveLength(3);
  });
});
