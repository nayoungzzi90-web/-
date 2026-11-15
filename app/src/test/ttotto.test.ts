import { describe, expect, it } from "vitest";
import { buildCookieResult, cookieReduce, kstDateKey, loadTodayResult, persistTodayResult, saveToNoteBox, type KV } from "../lib/daily-cookie";
import { TT, won } from "../lib/ttotto-content";

const mem = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const ME = { name: "나", calendar: "solar" as const, leap: false, date: "1990-04-19", time: "01:10", gender: "f" as const };

describe("화면 문구·가격", () => {
  it("상품 5개와 가격(최종 확정: 일반 1,900원·신년 2,900원)과 문구에 '웹툰'이 없다", () => {
    expect(TT.products.map((p) => [p.title, p.price])).toEqual([["내 사주", 1900], ["연애운", 1900], ["궁합", 1900], ["택일", 1900], ["신년운세", 2900]]);
    expect(won(1900)).toBe("1,900원");
    expect(JSON.stringify(TT)).not.toContain("웹툰");
    expect(TT.home.title).toBe("또또와 알아보는 나의 사주");
    expect(TT.stories.freeEntry).toBe("처음이라면? 내 사주 무료로 맛보기");
    expect(TT.cookieName).toBe("오늘의 운세쿠키");
  });
});

describe("한국 날짜 경계", () => {
  it("한국 자정 직전/직후로 날짜 키가 바뀐다", () => {
    expect(kstDateKey(new Date("2026-11-15T14:59:59Z"))).toBe("2026-11-15");
    expect(kstDateKey(new Date("2026-11-15T15:00:00Z"))).toBe("2026-11-16");
  });
  it("같은 날·같은 사용자는 같은 결과, 다음 날은 다른 날짜 키", () => {
    const a = buildCookieResult(new Date("2026-11-15T01:00:00Z"), ME);
    const b = buildCookieResult(new Date("2026-11-15T13:00:00Z"), ME);
    expect(a).toEqual(b);
    expect(buildCookieResult(new Date("2026-11-15T16:00:00Z"), ME).dateKey).toBe("2026-11-16");
  });
});

describe("결과 종류", () => {
  it("출생정보가 없으면 응원 메시지(결과 예시)이고 개인 사주 결과로 표시하지 않는다", () => {
    const r = buildCookieResult(new Date("2026-11-15T01:00:00Z"), null);
    expect(r.kind).toBe("cheer");
    expect(r.isSample).toBe(true);
  });
  it("출생정보가 있으면 엔진(오늘의 일진×일간) 결과이고 예시 배지가 없다", () => {
    const r = buildCookieResult(new Date("2026-11-15T01:00:00Z"), ME);
    expect(r.kind).toBe("personal");
    expect(r.isSample).toBe(false);
    expect(r.message.length).toBeGreaterThan(5);
  });
  it("출생정보가 잘못되면 랜덤 성공으로 위장하지 않고 오류를 낸다", () => {
    expect(() => buildCookieResult(new Date(), { ...ME, date: "1800-01-01" })).toThrow();
  });
});

describe("기기 저장", () => {
  const now = new Date("2026-11-15T01:00:00Z");
  it("오늘 결과는 다시 열어도 같고, 이미 연 결과는 다시 추첨하지 않는다", () => {
    const s = mem();
    const r = buildCookieResult(now, null);
    persistTodayResult(s, r, null);
    expect(loadTodayResult(s, now, null)).toEqual(r);
    const other = { ...r, title: "다른 결과" };
    expect(persistTodayResult(s, other, null).title).toBe(r.title);
  });
  it("날짜가 바뀌거나 사용자 종류가 바뀌면 복원하지 않는다", () => {
    const s = mem();
    persistTodayResult(s, buildCookieResult(now, null), null);
    expect(loadTodayResult(s, new Date("2026-11-16T01:00:00Z"), null)).toBeNull();
    expect(loadTodayResult(s, now, ME)).toBeNull();
  });
  it("쪽지함 저장: 저장됨/이미 있음/실패를 구분하고 실패를 성공으로 보이지 않는다", () => {
    const s = mem();
    const r = buildCookieResult(now, null);
    expect(saveToNoteBox(s, r)).toBe("saved");
    expect(saveToNoteBox(s, r)).toBe("already");
    const broken: KV = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(saveToNoteBox(broken, r)).toBe("failed");
  });
});

describe("쿠키 상태 전이", () => {
  it("정상 흐름 idle → loading → opening → revealed", () => {
    let s = cookieReduce("idle", "START");
    s = cookieReduce(s, "READY");
    s = cookieReduce(s, "DONE");
    expect(s).toBe("revealed");
  });
  it("연타: 열리는 중·결과 후 START 는 무시한다", () => {
    expect(cookieReduce("loading", "START")).toBe("loading");
    expect(cookieReduce("opening", "START")).toBe("opening");
    expect(cookieReduce("revealed", "START")).toBe("revealed");
  });
  it("오류 → 재시도, 재접속 복원은 바로 revealed, 움직임 줄이기는 오프닝을 건너뛴다", () => {
    expect(cookieReduce(cookieReduce("loading", "FAIL"), "RETRY")).toBe("loading");
    expect(cookieReduce("idle", "RESTORE")).toBe("revealed");
    expect(cookieReduce("loading", "SKIP_MOTION")).toBe("revealed");
    expect(cookieReduce("revealed", "RESET")).toBe("idle"); // 한국 자정이 지나 새 쿠키가 도착한 경우
  });
});
