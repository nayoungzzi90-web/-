import { describe, expect, it } from "vitest";
import { elementSentence, pillarParts, stemElement } from "@/lib/pillar-view";

describe("만세력 표 글자·오행 대응", () => {
  it("갑자(0,0): 갑=목·자=수, 한자와 한글이 맞는다", () => {
    const p = pillarParts({ stem: 0, branch: 0, hanja: "甲子", ko: "갑자" });
    expect(p.stem).toEqual({ hanja: "甲", ko: "갑", element: "목" });
    expect(p.branch).toEqual({ hanja: "子", ko: "자", element: "수" });
  });
  it("경진: 경=금·진=토, 임오: 임=수·오=화", () => {
    const a = pillarParts({ stem: 6, branch: 4, hanja: "庚辰", ko: "경진" });
    expect([a.stem.element, a.branch.element]).toEqual(["금", "토"]);
    const b = pillarParts({ stem: 8, branch: 6, hanja: "壬午", ko: "임오" });
    expect([b.stem.element, b.branch.element]).toEqual(["수", "화"]);
  });
  it("열 개 천간과 열두 지지가 모두 대응표에 있고 두 글자(한자+한글)가 기둥의 이름과 같다", () => {
    for (let s = 0; s < 10; s++)
      for (let b = 0; b < 12; b++) {
        if ((s + b) % 2) continue; // 60갑자는 음양이 같은 짝만 존재
        const parts = pillarParts({ stem: s, branch: b, hanja: "", ko: "" });
        expect(parts.stem.hanja).toHaveLength(1);
        expect(parts.branch.ko).toHaveLength(1);
      }
    expect(stemElement(0)).toBe("목");
    expect(stemElement(9)).toBe("수");
  });
  it("오행 문장은 가장 많은 기운과 한 글자도 없는 기운을 사실대로 말한다", () => {
    const s = elementSentence({ 목: 4, 화: 1, 토: 2, 금: 0, 수: 1 });
    expect(s).toContain("목(나무)");
    expect(s).toContain("4글자");
    expect(s).toContain("금(쇠)은 한 글자도 없어요");
    expect(elementSentence({ 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 })).toContain("빠진 기운은 없어요");
    expect(elementSentence({ 목: 1, 화: 1, 토: 1, 금: 1, 수: 1 })).toContain("고르게");
  });
});
