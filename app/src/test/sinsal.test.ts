import { describe, expect, it } from "vitest";
import {
  AMROK, BAEKHO, CHEONDEOK, CHEONEUL, GEUMYEO, GOEGANG, GOSIN_GWASUK, GWIMUN, HONGYEOM, MUNCHANG, SAMHAP_GROUPS,
  SINSAL12, TAEGEUK, WOLDEOK_STEM, WONJIN, YANGIN, computeSinsal, gongmang, groupOf, sinsal12Index, twelveSinsal,
} from "@/lib/sinsal";
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

describe("나머지 신살 표의 내부 일관성", () => {
  const chars = (arr: readonly number[]) => arr.map((b) => BR[b]).join("");
  it("12신살: 어느 기준에서든 12지지가 12신살에 하나씩, 도화=년살·역마=역마살·화개=화개살과 같다", () => {
    for (let base = 0; base < 12; base++) {
      const idxs = new Set<number>();
      for (let t = 0; t < 12; t++) idxs.add(sinsal12Index(base, t));
      expect(idxs.size).toBe(12);
      const g = groupOf(base);
      expect(SINSAL12[sinsal12Index(base, g.dohwa)]).toBe("년살");
      expect(SINSAL12[sinsal12Index(base, g.yeokma)]).toBe("역마살");
      expect(SINSAL12[sinsal12Index(base, g.hwagae)]).toBe("화개살");
      expect(SINSAL12[sinsal12Index(base, g.jisal)]).toBe("지살");
    }
  });
  it("12신살 예: 寅午戌 기준 亥 겁살·子 재살·丑 천살·寅 지살·卯 년살·午 장성살·酉 육해살·戌 화개살", () => {
    const at = (b: string) => SINSAL12[sinsal12Index(BR.indexOf("午"), BR.indexOf(b))];
    expect([at("亥"), at("子"), at("丑"), at("寅"), at("卯"), at("辰"), at("巳"), at("午"), at("未"), at("申"), at("酉"), at("戌")]).toEqual(
      ["겁살", "재살", "천살", "지살", "년살", "월살", "망신살", "장성살", "반안살", "역마살", "육해살", "화개살"],
    );
  });
  it("암록은 건록 자리의 육합이다(건록 ↔ 암록: 寅亥 卯戌 巳申 午未 申巳 酉辰 亥寅 子丑)", () => {
    const six = (b: number) => ({ 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 } as Record<number, number>)[b]!;
    for (let s = 0; s < 10; s++) {
      const geonrok = [...Array(12).keys()].find((b) => stageOf(s, b) === "건록")!;
      expect(AMROK[s]).toBe(six(geonrok));
    }
  });
  it("양인: 양간 甲卯 丙午 戊午 庚酉 壬子, 음간은 넣지 않는다(양인은 제왕 자리와 같다)", () => {
    YANGIN.forEach((b, s) => {
      if (s % 2 === 1) expect(b).toBeNull();
      else expect(stageOf(s, b!)).toBe("제왕");
    });
  });
  it("문창귀인·금여록·홍염·태극귀인 표의 모양(열 천간, 지지 번호 범위)", () => {
    for (const arr of [MUNCHANG, GEUMYEO, AMROK, HONGYEOM]) {
      expect(arr).toHaveLength(10);
      arr.forEach((b) => expect(b).toBeGreaterThanOrEqual(0));
    }
    expect(chars(MUNCHANG)).toBe("巳午申酉申酉亥子寅卯");
    expect(chars(GEUMYEO)).toBe("辰巳未申未申戌亥丑寅");
    expect(chars(TAEGEUK[4]!)).toBe("辰戌丑未");
    expect(chars(TAEGEUK[8]!)).toBe("巳申");
  });
  it("월덕귀인은 월지 삼합의 오행 양간이다", () => {
    const yang = ["丙", "壬", "庚", "甲"];
    for (let m = 0; m < 12; m++) {
      const gi = SAMHAP_GROUPS.indexOf(groupOf(m));
      expect(ST[WOLDEOK_STEM[m]!]).toBe(yang[gi]);
    }
  });
  it("천덕귀인: 월지 12개 모두 정의되고 寅월 丁·卯월 申·午월 亥·子월 巳", () => {
    expect(CHEONDEOK).toHaveLength(12);
    expect(CHEONDEOK[BR.indexOf("寅")]).toEqual({ stem: ST.indexOf("丁") });
    expect(CHEONDEOK[BR.indexOf("卯")]).toEqual({ branch: BR.indexOf("申") });
    expect(CHEONDEOK[BR.indexOf("午")]).toEqual({ branch: BR.indexOf("亥") });
    expect(CHEONDEOK[BR.indexOf("子")]).toEqual({ branch: BR.indexOf("巳") });
  });
  it("원진·귀문은 지지 쌍 여섯 개씩이고 서로 한 지지를 두 번 쓰지 않는다", () => {
    for (const set of [WONJIN, GWIMUN]) {
      expect(set).toHaveLength(6);
      const all = set.flat().sort((a, b) => a - b);
      expect(all).toEqual([...Array(12).keys()]);
    }
  });
  it("고신·과숙 묶음은 12지지를 3개씩 나눈다", () => {
    expect(GOSIN_GWASUK.flatMap((g) => [...g.members]).sort((a, b) => a - b)).toEqual([...Array(12).keys()]);
  });
  it("괴강 4개·백호 7개의 간지는 60갑자에 실제 있는 조합이다(천간·지지의 음양이 같다)", () => {
    for (const [s, b] of [...GOEGANG, ...BAEKHO]) expect(s % 2).toBe(b % 2);
    expect(GOEGANG).toHaveLength(4);
    expect(BAEKHO).toHaveLength(7);
  });
});

describe("나머지 신살 계산(예: 乙亥년 己未월 丁未일 乙巳시)", () => {
  const mk = (s: string, b: string) => ({ stem: ST.indexOf(s), branch: BR.indexOf(b), hanja: s + b, ko: "" });
  const pil = { year: mk("乙", "亥"), month: mk("己", "未"), day: mk("丁", "未"), hour: mk("乙", "巳") };
  const rows = computeSinsal(pil);
  const row = (k: string) => rows.find((r) => r.key === k)!;
  it("월덕귀인: 未월 → 甲, 이 사주 천간에 甲이 없다 / 천덕귀인: 未월 → 甲 없음", () => {
    expect(row("woldeok").targets).toContain("甲");
    expect(row("woldeok").hits).toEqual([]);
    expect(row("cheondeok").hits).toEqual([]);
  });
  it("문창귀인: 丁 → 酉, 해당 없음 / 학당귀인: 丁 → 酉 / 금여록: 丁 → 申", () => {
    expect(row("munchang").targets).toContain("酉");
    expect(row("hakdang").targets).toContain("酉");
    expect(row("geumyeo").targets).toContain("申");
    expect(row("munchang").hits).toEqual([]);
  });
  it("홍염살: 丁 → 未, 일주·월주에 있다 / 암록: 丁 → 未, 일주·월주", () => {
    expect(row("hongyeom").hits).toEqual(["일주", "월주"]);
    expect(row("amrok").hits).toEqual(["일주", "월주"]);
  });
  it("양인: 丁은 음간이라 넣지 않는다", () => {
    expect(row("yangin").hits).toEqual([]);
    expect(row("yangin").targets).toContain("음간");
  });
  it("백호살: 丁未일은 해당 없음 · 원진: 亥未/巳亥/… 이 사주 지지 亥未未巳에는 원진·귀문 쌍이 없다", () => {
    expect(row("baekho").hits).toEqual([]);
    expect(row("wonjin").hits).toEqual([]);
    expect(row("gwimun").hits).toEqual([]);
  });
  it("원진·귀문 쌍을 실제로 찾아낸다: 子未(원진), 子酉(귀문)", () => {
    const r = computeSinsal({ year: mk("甲", "子"), month: mk("丙", "未"), day: mk("丁", "酉"), hour: null });
    expect(r.find((x) => x.key === "wonjin")!.hits).toEqual(["월주-연주(未子)"]);
    expect(r.find((x) => x.key === "gwimun")!.hits).toEqual(["일주-연주(酉子)"]);
  });
  it("천라지망: 戌亥가 함께 있으면 천라", () => {
    const r = computeSinsal({ year: mk("甲", "戌"), month: mk("丙", "亥"), day: mk("丁", "酉"), hour: null });
    expect(r.find((x) => x.key === "cheonra")!.hits).toEqual(["있어요"]);
    expect(r.find((x) => x.key === "jimang")!.hits).toEqual([]);
  });
  it("12신살 표: 일지 未(亥卯未, 지살 亥)에서 巳는 역마살·未는 화개살·亥는 지살", () => {
    const t = twelveSinsal(pil)[0]!;
    const byLabel = Object.fromEntries(t.cells.map((c) => [c.label, c.idx === null ? null : SINSAL12[c.idx]]));
    expect(byLabel).toEqual({ 시주: "역마살", 일주: "화개살", 월주: "화개살", 연주: "지살" });
  });
  it("시간을 모르면 12신살 표의 시주는 비어 있다", () => {
    const t = twelveSinsal({ ...pil, hour: null })[0]!;
    expect(t.cells[0]!.idx).toBeNull();
  });
});
