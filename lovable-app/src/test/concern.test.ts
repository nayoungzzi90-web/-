import { describe, expect, it } from "vitest";
import { CONCERN_MAX, cleanConcern, concernFeedback } from "@/lib/concern";

describe("요즘 고민 입력 다듬기", () => {
  it("앞뒤 공백과 과한 빈 줄을 정리한다", () => {
    expect(cleanConcern("  안녕\r\n\r\n\r\n\r\n반가워  ")).toBe("안녕\n\n반가워");
  });
  it("제어 문자는 빼고 줄바꿈·탭은 살린다", () => {
    expect(cleanConcern("가\u0000나\u0007다\n라")).toBe("가나다\n라");
  });
  it("300자를 넘으면 자른다", () => {
    expect(cleanConcern("가".repeat(500))).toHaveLength(CONCERN_MAX);
  });
  it("빈 입력은 빈 글이 된다", () => {
    expect(cleanConcern("   \n  ")).toBe("");
  });
  it("글자 수에 따라 격려 문구가 달라진다", () => {
    const a = concernFeedback(0);
    const b = concernFeedback(10);
    const c = concernFeedback(60);
    const d = concernFeedback(200);
    expect(new Set([a, b, c, d]).size).toBe(4);
    expect(c).toContain("디테일");
  });
});
