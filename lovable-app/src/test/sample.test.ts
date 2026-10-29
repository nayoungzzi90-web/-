import { describe, expect, it } from "vitest";
import { SAMPLE_SECTIONS } from "@/lib/sample-reading";

describe("예시 풀이 데이터", () => {
  it("한자·템플릿 토큰·실명이 없고, 앞 3개만 본문이며 나머지는 잠금(본문 없음)", () => {
    const all = JSON.stringify(SAMPLE_SECTIONS);
    expect(all).not.toMatch(/\p{Script=Han}/u);
    expect(all).not.toContain("{{");
    expect(all).not.toContain("나영");
    expect(SAMPLE_SECTIONS.length).toBeGreaterThanOrEqual(5);
    SAMPLE_SECTIONS.forEach((s, i) => {
      expect(s.locked, s.id).toBe(i >= 3);
      if (s.locked) expect("body" in s).toBe(false);
    });
  });
});
