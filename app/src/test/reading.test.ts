import { describe, expect, it } from "vitest";
import { previewFromBirthInput } from "@/lib/saju-engine";
import {
  buildReading,
  buildVerdict,
  classifyConcern,
  relation,
} from "@/lib/reading";

const FORBIDDEN = [
  "격국",
  "용신",
  "신강",
  "신약",
  "대운",
  "세운",
  "십성",
  "정관",
  "편관",
  "정인",
  "편인",
  "식신",
  "상관",
  "겁재",
  "비견",
  "정재",
  "편재",
];
const sample = (hour: string | null = "14:30") =>
  previewFromBirthInput({
    name: "테스트",
    calendar: "solar",
    leap: false,
    date: "1990-05-15",
    time: hour,
    gender: "f",
  });

describe("규칙 기반 풀이", () => {
  it("1990-05-15 14:30 은 庚辰 일주이고 달토(금)가 나온다", () => {
    const r = buildReading(sample())!;
    expect(r.dayEl).toBe("금");
    expect(r.friend).toBe("rabbit");
    expect(r.sections.length).toBe(12); // 2단계 심화로 5 → 12개
  });
  it("검증 전 용어(격국·용신·신강·십성 이름 등)를 풀이에 쓰지 않는다", () => {
    for (const time of ["14:30", null]) {
      const r = buildReading(sample(time))!;
      const all = JSON.stringify(r.sections);
      for (const w of FORBIDDEN) expect(all).not.toContain(w);
    }
  });
  it("오행 개수 합은 글자 수와 같다(시간 모름이면 6)", () => {
    const a = buildReading(sample())!;
    expect(Object.values(a.counts).reduce((x, y) => x + y, 0)).toBe(8);
    const b = buildReading(sample(null))!;
    expect(Object.values(b.counts).reduce((x, y) => x + y, 0)).toBe(6);
  });
  it("상생·상극 관계", () => {
    expect(relation("금", "토")).toBe("helps");
    expect(relation("금", "수")).toBe("gives");
    expect(relation("금", "목")).toBe("rules");
    expect(relation("금", "화")).toBe("pressed");
    expect(relation("금", "금")).toBe("same");
  });
  it("고민 분류와 점괘", () => {
    expect(classifyConcern("올해 이직을 해도 될까요")).toBe("이직·일");
    expect(classifyConcern("아무 말")).toBe("기타");
    const v = buildVerdict(sample(), "올해 이직을 해도 될지 고민이에요")!;
    expect(v.headline.length).toBeGreaterThan(5);
    expect(v.todo.length).toBe(3);
    expect(buildVerdict(sample(), "  ")).toBeNull();
    const all = JSON.stringify(v);
    for (const w of FORBIDDEN) expect(all).not.toContain(w);
  });
});
