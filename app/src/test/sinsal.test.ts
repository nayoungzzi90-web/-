import { describe, expect, it } from "vitest";
import { CHEONEUL, SAMHAP_GROUPS, computeSinsal, gongmang, groupOf } from "@/lib/sinsal";
import { stageOf } from "@/lib/twelve-stages";

// 일반 신살 표(원문 미확인)의 내부 일관성 시험. 고전 원문과의 대조가 아니다.
const BR = "子丑寅卯辰巳午未申酉戌亥";
const ST = "甲乙丙丁戊己庚辛壬癸";
const mod = (n: number, m: number) => ((n % m) + m) % m;

describe("공망(旬空)", () => {
  it("六甲旬: 甲子旬→戌亥, 甲戌旬→申酉, 甲申旬→午未, 甲午旬→辰巳, 甲辰旬→寅卯, 甲寅旬→子丑", () => {
    const want: Record<string, string> = { 子: "戌亥", 戌: "申酉", 申: "午未", 午: "辰巳", 辰: "寅卯", 寅: "子丑" };
    for (const [start, pair] of Object.entries(want)) {
      // 그 순의 열 날 모두 같은 공망
      for (let k = 0; k < 10; k++) {
        const stem = k;
        const branch = (BR.indexOf(start) + k) % 12;
        const [a, b] = gongmang(stem, branch);
        expect(BR[a]! + BR[b]!).toBe(pair);
      }
    }
  });
  it("60갑자 어느 날도 자기 일지는 공망이 아니다", () => {
    for (let k = 0; k < 60; k++) {
      const [a, b] = gongmang(k % 10, k % 12);
      expect([a, b]).not.toContain(k % 12);
    }
  });
});

describe("천을귀인", () => {
  it("甲戊庚 丑未 · 乙己 子申 · 丙丁 亥酉 · 辛 寅午 · 壬癸 卯巳", () => {
    const pair = (s: string) => CHEONEUL[ST.indexOf(s)]!.map((b) => BR[b]).join("");
    expect(pair("甲")).toBe("丑未");
    expect(pair("戊")).toBe("丑未");
    expect(pair("庚")).toBe("丑未");
    expect(pair("乙")).toBe("子申");
    expect(pair("己")).toBe("子申");
    expect(pair("丙")).toBe("亥酉");
    expect(pair("丁")).toBe("亥酉");
    expect(pair("辛")).toBe("寅午");
    expect(pair("壬")).toBe("卯巳");
    expect(pair("癸")).toBe("卯巳");
  });
});

describe("도화·역마·화개(삼합 기준)", () => {
  it("12지지가 네 삼합 그룹에 하나씩만 속한다", () => {
    const all = SAMHAP_GROUPS.flatMap((g) => [...g.members]).sort((a, b) => a - b);
    expect(all).toEqual([...Array(12).keys()]);
  });
  it("12운성 표와 일관: 도화=목욕, 화개=묘, 역마=장생의 맞은편(충) 자리", () => {
    // 삼합 그룹의 오행 양간(寅午戌 丙, 申子辰 壬, 巳酉丑 庚, 亥卯未 甲)
    const yang = ["丙", "壬", "庚", "甲"];
    SAMHAP_GROUPS.forEach((g, i) => {
      const stem = ST.indexOf(yang[i]!);
      expect(stageOf(stem, g.dohwa)).toBe("목욕");
      expect(stageOf(stem, g.hwagae)).toBe("묘");
      const jangsaeng = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find((b) => stageOf(stem, b) === "장생")!;
      expect(mod(jangsaeng + 6, 12)).toBe(g.yeokma);
    });
  });
  it("그룹 찾기: 寅·午·戌 → 같은 그룹", () => {
    expect(groupOf(BR.indexOf("寅"))).toBe(groupOf(BR.indexOf("戌")));
  });
});

describe("computeSinsal(예: 乙亥년 己未월 丁未일 乙巳시)", () => {
  const mk = (s: string, b: string) => ({ stem: ST.indexOf(s), branch: BR.indexOf(b), hanja: s + b, ko: "" });
  const rows = computeSinsal({
    year: mk("乙", "亥"), month: mk("己", "未"), day: mk("丁", "未"), hour: mk("乙", "巳"),
  });
  const row = (k: string) => rows.find((r) => r.key === k)!;
  it("천을귀인: 丁 → 亥·酉, 연지 亥에 있다", () => {
    expect(row("cheoneul").hits).toEqual(["연주"]);
  });
  it("공망: 丁未일(甲辰旬) → 寅·卯, 이 사주엔 없다", () => {
    expect(row("gongmang").targets).toContain("寅");
    expect(row("gongmang").hits).toEqual([]);
  });
  it("일지 未 → 亥卯未 그룹: 도화 子, 역마 巳(시주에 있다), 화개 未(기준 기둥 자신은 제외하고 월주에 있다)", () => {
    expect(row("dohwa-일지").hits).toEqual([]);
    expect(row("yeokma-일지").hits).toEqual(["시주"]);
    expect(row("hwagae-일지").hits).toEqual(["월주"]);
  });
  it("시간을 모르면 시주는 해당에서 빠진다", () => {
    const r2 = computeSinsal({ year: mk("乙", "亥"), month: mk("己", "未"), day: mk("丁", "未"), hour: null });
    expect(r2.find((r) => r.key === "yeokma-일지")!.hits).toEqual([]);
  });
});
