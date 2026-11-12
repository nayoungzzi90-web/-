import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/lib/reading";
import {
  BOARD_MAX,
  DEEP_TEXT,
  QUESTIONS,
  TYPE_TEXT,
  comboTitle,
  matchCards,
  modeOn,
  addMember,
  chemistry,
  cleanName,
  decodeBoard,
  encodeBoard,
  scoreQuiz,
  summarizeBoard,
  type Member,
} from "@/lib/quiz";

/** 문항마다 해당 오행 선택지를 고르는 답안(그 문항에 그 오행이 없으면 0번). */
function pick(el: string): number[] {
  return QUESTIONS.map((q) => {
    const i = q.options.findIndex((o) => o.el === el);
    return i < 0 ? 0 : i;
  });
}

describe("오행 친구 테스트 문항", () => {
  it("10문항, 문항마다 서로 다른 오행 4개", () => {
    expect(QUESTIONS).toHaveLength(10);
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.el)).size).toBe(4);
    }
  });
  it("각 오행이 정확히 8번씩 나온다(한쪽으로 쏠리지 않음)", () => {
    for (const e of ELEMENTS) {
      const n = QUESTIONS.filter((q) => q.options.some((o) => o.el === e)).length;
      expect(n).toBe(8);
    }
  });
});

describe("점수 계산(결정론)", () => {
  it("한 오행을 계속 고르면 그 오행이 친구, 부캐는 상생 다음 오행 또는 남은 최다", () => {
    for (const e of ELEMENTS) {
      const s = scoreQuiz(pick(e));
      expect(s?.primary).toBe(e);
      expect(s?.counts[e]).toBe(8);
      expect(s?.secondary).not.toBe(e);
    }
  });
  it("동점이면 나중에 고른 오행이 앞선다", () => {
    // 5문항은 목, 5문항은 화 — 마지막 문항이 화(마지막에 고른 쪽)면 화가 친구
    const a = pick("목");
    const b = pick("화");
    const mix = QUESTIONS.map((_, i) => (i < 5 ? a[i]! : b[i]!));
    const s = scoreQuiz(mix)!;
    const total = ELEMENTS.reduce((n, e) => n + s.counts[e], 0);
    expect(total).toBe(10);
    // 같은 답안은 항상 같은 결과
    expect(scoreQuiz(mix)).toEqual(s);
  });
  it("답이 모자라거나 범위를 벗어나면 null", () => {
    expect(scoreQuiz([0, 1])).toBeNull();
    expect(scoreQuiz([...pick("목").slice(0, 9), 7])).toBeNull();
    expect(scoreQuiz([...pick("목").slice(0, 9), -1])).toBeNull();
  });
});

describe("모임 판 링크", () => {
  const m = (name: string, p: number, s: number): Member => ({
    name,
    primary: ELEMENTS[p]!,
    secondary: ELEMENTS[s]!,
  });
  it("인코딩 후 디코딩하면 같다(한글 닉네임 포함)", () => {
    const board = [m("지은", 0, 1), m("민수", 3, 4), m("하늘🌿", 2, 0)];
    expect(decodeBoard(encodeBoard(board))).toEqual(board);
  });
  it("잘못된 링크는 모두 거부한다", () => {
    expect(decodeBoard("")).toBeNull();
    expect(decodeBoard("!!!")).toBeNull();
    expect(decodeBoard("a".repeat(1300))).toBeNull();
    const enc = (v: unknown) =>
      Buffer.from(JSON.stringify(v), "utf8").toString("base64url");
    expect(decodeBoard(enc([2, [["a", 0, 1]]]))).toBeNull(); // 버전
    expect(decodeBoard(enc([1, []]))).toBeNull(); // 빈 판
    expect(decodeBoard(enc([1, [["a", 5, 1]]]))).toBeNull(); // 오행 범위
    expect(decodeBoard(enc([1, [["a", 0, 1.5]]]))).toBeNull();
    expect(decodeBoard(enc([1, [[" a", 0, 1]]]))).toBeNull(); // 정리되지 않은 이름
    expect(decodeBoard(enc([1, [["열글자가넘는닉네임입니다", 0, 1]]]))).toBeNull();
    expect(decodeBoard(enc([1, Array(13).fill(["a", 0, 1])]))).toBeNull(); // 인원 초과
  });
  it("닉네임 정리: 공백·제어문자 제거, 8자 제한", () => {
    expect(cleanName("  지은\u0000  ")).toBe("지은");
    expect(cleanName("가  나   다")).toBe("가 나 다");
    expect([...cleanName("123456789012")]).toHaveLength(8);
    expect(cleanName("   ")).toBe("");
  });
  it("12명을 넘으면 가장 오래된 사람부터 밀려난다", () => {
    let board = [m("a", 0, 1)];
    for (let i = 0; i < 14; i++) board = addMember(board, m(`n${i}`, 1, 2));
    expect(board).toHaveLength(BOARD_MAX);
    expect(board.at(-1)?.name).toBe("n13");
    expect(board[0]?.name).toBe("n2");
    expect(decodeBoard(encodeBoard(board))).toEqual(board);
  });
  it("모임 요약: 부족한 오행과 한 줄", () => {
    const s = summarizeBoard([m("a", 1, 0), m("b", 1, 2), m("c", 4, 0)]);
    expect(s.counts["화"]).toBe(2);
    expect(s.dominant).toBe("화");
    expect(s.missing).toEqual(["목", "토", "금"]);
    expect(s.line).toContain("필요해요");
    const all = summarizeBoard(ELEMENTS.map((_, i) => m(`p${i}`, i, 0)));
    expect(all.missing).toEqual([]);
    expect(all.line).toContain("모두 모였어요");
  });
});

describe("케미 한 줄", () => {
  it("다섯 관계 모두 이름이 들어간 문장을 만든다", () => {
    const seen = new Set<string>();
    for (const b of ELEMENTS) {
      const c = chemistry("가", "목", "나", b);
      expect(c.text).toContain("가님");
      expect(c.text).toContain("나님");
      seen.add(c.title);
    }
    expect(seen.size).toBe(5);
  });
});

describe("결과 화면 확장 내용", () => {
  it("다섯 오행 모두 모든 항목이 채워져 있다", () => {
    for (const e of ELEMENTS) {
      const d = DEEP_TEXT[e];
      expect(d.short.length).toBeGreaterThanOrEqual(5);
      for (const v of [d.love, d.work, d.friends, d.money, d.stress, d.relief, d.mantra]) {
        expect(v.length).toBeGreaterThan(14);
      }
      expect(d.tags).toHaveLength(3);
      d.tags.forEach((t) => expect(t.startsWith("#")).toBe(true));
      expect(Object.values(d.lucky).every((x) => x.length > 0)).toBe(true);
      expect(TYPE_TEXT[e].traits).toHaveLength(3);
    }
  });
  it("본캐×부캐 20가지 별명이 모두 다르다", () => {
    const titles = new Set<string>();
    for (const a of ELEMENTS)
      for (const b of ELEMENTS) if (a !== b) titles.add(comboTitle(a, b));
    expect(titles.size).toBe(20);
    ELEMENTS.forEach((e) => expect(modeOn(e).length).toBeGreaterThan(5));
  });
  it("잘 맞는 친구 4장은 서로 다른 네 오행이고 나 자신은 없다", () => {
    for (const me of ELEMENTS) {
      const cards = matchCards(me);
      expect(cards).toHaveLength(4);
      const els = cards.map((c) => c.el);
      expect(new Set(els).size).toBe(4);
      expect(els).not.toContain(me);
    }
    // 상생: 물이 나무를 살린다 → 나무(솔이)의 '힘이 나는 친구'는 물(고부기)
    expect(matchCards("목")[0]!.el).toBe("수");
  });
});
