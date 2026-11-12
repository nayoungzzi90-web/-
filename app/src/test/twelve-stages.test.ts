import { describe, expect, it } from "vitest";
import { JANGSAENG_BRANCH, STAGE_KO, stageIndex, stageOf } from "@/lib/twelve-stages";

// 일반 12운성 표의 내부 일관성과, 《연해자평》 위키문헌 본문에 흩어져 있는 구절과의 부분 일치를 확인한다.
// 주의: 아래 고전 구절과의 일치는 '표가 맞다'는 검증이 아니다. 원문 표 전체를 확보하기 전에는 미검증이다.
const BR = "子丑寅卯辰巳午未申酉戌亥";
const ST = "甲乙丙丁戊己庚辛壬癸";
const at = (stem: string, branch: string) => stageOf(ST.indexOf(stem), BR.indexOf(branch));

describe("12운성(일반 표)", () => {
  it("열 천간 모두 12지지에 12단계가 하나씩 겹치지 않게 놓인다", () => {
    for (let s = 0; s < 10; s++) {
      const seen = new Set<number>();
      for (let b = 0; b < 12; b++) seen.add(stageIndex(s, b));
      expect(seen.size).toBe(12);
    }
  });
  it("양간은 지지 순서대로, 음간은 거꾸로 진행한다", () => {
    for (let s = 0; s < 10; s++)
      for (let b = 0; b < 12; b++) {
        const next = stageIndex(s, (b + 1) % 12);
        const cur = stageIndex(s, b);
        expect(next).toBe(s % 2 === 0 ? (cur + 1) % 12 : (cur + 11) % 12);
      }
  });
  it("장생 자리: 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯", () => {
    const want = ["亥", "午", "寅", "酉", "寅", "酉", "巳", "子", "申", "卯"];
    JANGSAENG_BRANCH.forEach((b, i) => expect(BR[b]).toBe(want[i]));
    want.forEach((b, i) => expect(at(ST[i]!, b)).toBe("장생"));
  });
  it("건록 자리: 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子", () => {
    const want = ["寅", "卯", "巳", "午", "巳", "午", "申", "酉", "亥", "子"];
    want.forEach((b, i) => expect(at(ST[i]!, b)).toBe("건록"));
  });
  it("甲 한 줄(子부터 亥 순서): 亥에서 장생, 午에서 사, 未에서 묘", () => {
    const row = [...BR].map((b) => at("甲", b));
    // 甲: 亥장생 子목욕 丑관대 寅건록 卯제왕 辰쇠 巳병 午사 未묘 申절 酉태 戌양
    expect(row.join(",")).toBe(
      ["목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양", "장생"].join(","),
    );
  });
  it("《연해자평》 위키문헌 본문 구절과 부분 일치(검증 아님): 丙死於酉·庚死於子·甲死於午·壬死於卯·土 臨官在巳", () => {
    expect(at("丙", "酉")).toBe("사");
    expect(at("庚", "子")).toBe("사");
    expect(at("甲", "午")).toBe("사");
    expect(at("壬", "卯")).toBe("사");
    expect(at("戊", "巳")).toBe("건록");
  });
  it("단계 이름은 12개", () => {
    expect(STAGE_KO).toHaveLength(12);
  });
});
