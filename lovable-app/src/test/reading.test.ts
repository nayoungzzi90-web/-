import { describe, expect, it } from "vitest";
import { readingInputSchema } from "@/lib/reading-fns";
import {
  FREE_SECTIONS,
  buildReading,
  isUnlocked,
  shapeSections,
  unlockIdFor,
  type BuiltReading,
  type UnlockClient,
} from "@/lib/reading.server";

const me = {
  name: "나영",
  calendar: "solar",
  leap: false,
  date: "1990-04-19",
  time: "01:10",
  gender: "f",
};
const partner = {
  name: "상대",
  calendar: "solar",
  leap: false,
  date: "1993-03-09",
  time: "14:30",
  gender: "m",
};
const TODAY = "2026-10-29";
const ok = (r: BuiltReading) => {
  if (!r.ok) throw new Error(r.error);
  return r;
};
const chars = (s: string) => s.replace(/\s/g, "").length;

describe("풀이 생성(규칙형, 이중 엔진 확인)", () => {
  it("기본 사주: 6개 섹션, 3,000자 이상, 개인 사실이 들어가고 단정 표현이 없다", () => {
    const r = ok(buildReading({ product: "basic", me }, { today: TODAY }));
    expect(r.sections).toHaveLength(6);
    expect(r.chars).toBeGreaterThanOrEqual(3000);
    const all = r.sections.map((s) => s.body).join("\n");
    expect(all).toContain("庚午");
    expect(all).toContain("甲寅");
    expect(all).toContain("2026년은");
    expect(all).not.toMatch(/반드시|무조건|100%|틀림없이|운명이 정해/);
    expect(r.meta).toMatchObject({ mode: "template", crossCheck: "match" });
  });

  it("연애운: 5개 연도(2026~2030)가 풀이되고 4,000자 이상", () => {
    const r = ok(buildReading({ product: "love", me }, { today: TODAY }));
    expect(r.chars).toBeGreaterThanOrEqual(4000);
    const last = r.sections[5]!.body;
    for (const y of [2026, 2027, 2028, 2029, 2030]) expect(last).toContain(`${y}년은`);
  });

  it("궁합: 상대 정보가 있어야 하고 1,500자 이상", () => {
    expect(buildReading({ product: "compat", me }, { today: TODAY })).toMatchObject({ ok: false });
    const r = ok(buildReading({ product: "compat", me, partner }, { today: TODAY }));
    expect(r.chars).toBeGreaterThan(1500);
  });

  it("같은 입력이면 같은 글, 다른 사주면 다른 글(결정론)", () => {
    const a = ok(buildReading({ product: "basic", me }, { today: TODAY }))
      .sections.map((s) => s.body)
      .join("|");
    expect(
      ok(buildReading({ product: "basic", me }, { today: TODAY }))
        .sections.map((s) => s.body)
        .join("|"),
    ).toBe(a);
    const b = ok(
      buildReading({ product: "basic", me: { ...me, date: "1984-09-03" } }, { today: TODAY }),
    )
      .sections.map((s) => s.body)
      .join("|");
    expect(b).not.toBe(a);
  });

  it("음력 입력은 앱 변환을 거쳐 같은 사람의 양력 입력과 같은 글을 만든다", () => {
    // 음 1990-03-24 = 양 1990-04-19
    const lunar = { ...me, calendar: "lunar", date: "1990-03-24" };
    const a = ok(buildReading({ product: "basic", me }, { today: TODAY }))
      .sections.map((s) => s.body)
      .join("|");
    const b = ok(buildReading({ product: "basic", me: lunar }, { today: TODAY }))
      .sections.map((s) => s.body)
      .join("|");
    expect(b).toBe(a);
  });

  it("시간 미상·성별 없음에서도 깨지지 않는다", () => {
    const r = ok(buildReading({ product: "basic", me: { ...me, time: null } }, { today: TODAY }));
    expect(r.sections).toHaveLength(6);
    expect(r.sections[0]!.body).toContain("시주");
  });

  it("잘못된 입력(형식·미래 날짜·범위 밖)은 풀이를 만들지 않는다", () => {
    for (const bad of [
      null,
      "x",
      { ...me, date: "1990-02-30" },
      { ...me, date: "2030-01-01" },
      { ...me, date: "1850-01-01" },
      { ...me, calendar: "weird" },
    ]) {
      expect(
        buildReading({ product: "basic", me: bad }, { today: TODAY }),
        JSON.stringify(bad),
      ).toMatchObject({ ok: false });
    }
  });

  it("두 엔진의 4주가 다르면 풀이를 내지 않는다(fail-closed)", () => {
    const r = buildReading(
      { product: "basic", me },
      { today: TODAY, deps: { pillarsOverride: (_l, p) => ["甲子", ...p.slice(1)] } },
    );
    expect(r).toMatchObject({ ok: false });
    expect((r as { error: string }).error).toContain("검증");
    const rp = buildReading(
      { product: "compat", me, partner },
      {
        today: TODAY,
        deps: { pillarsOverride: (l, p) => (l === "partner" ? ["甲子", ...p.slice(1)] : p) },
      },
    );
    expect(rp).toMatchObject({ ok: false });
  });

  it("절입 시각 가까이의 불일치는 '출생 시각 확인' 안내로 구분한다", () => {
    // 2026 입춘 05:02 KST 근처: 앱 엔진이 검토 필요로 표시하는 입력에서 불일치가 나면 안내 문구가 달라진다
    const near = { ...me, date: "2026-02-04", time: "05:02" };
    const r = buildReading(
      { product: "basic", me: near },
      { today: "2026-10-29", deps: { pillarsOverride: (_l, p) => ["甲子", ...p.slice(1)] } },
    );
    expect((r as { error: string }).error).toMatch(/절입|검증/);
  });
});

describe("잠금(권한 없는 사용자에게는 본문을 보내지 않는다)", () => {
  const full = ok(buildReading({ product: "basic", me }, { today: TODAY }));
  it("미열람: 앞 섹션만 본문, 나머지는 제목과 짧은 미리보기만", () => {
    const out = shapeSections(full.sections, false);
    expect(out.slice(0, FREE_SECTIONS).every((s) => !s.locked)).toBe(true);
    const locked = out.slice(FREE_SECTIONS);
    expect(locked.length).toBe(full.sections.length - FREE_SECTIONS);
    for (const s of locked) {
      expect(s.locked).toBe(true);
      expect("body" in s).toBe(false);
      expect((s as { teaser: string }).teaser.length).toBeLessThanOrEqual(37);
    }
    // 잠긴 섹션의 본문 문장(미리보기 이후)은 응답 어디에도 없다
    const json = JSON.stringify(out);
    for (const s of full.sections.slice(FREE_SECTIONS))
      expect(json).not.toContain(s.body.slice(40, 120));
    // 전체 글자 수 중 무료 공개분은 일부뿐
    const shown = out
      .filter((s) => !s.locked)
      .map((s) => (s as { body: string }).body)
      .join("");
    expect(chars(shown)).toBeLessThan(full.chars * 0.4);
  });
  it("열람: 모든 섹션 본문 전달", () => {
    const out = shapeSections(full.sections, true);
    expect(out.every((s) => !s.locked)).toBe(true);
    expect(out.map((s) => (s as { body: string }).body)).toEqual(full.sections.map((s) => s.body));
  });
  it("열람 id 는 상품+출생정보 해시: 같은 입력은 같은 id, 다른 사람·다른 상품은 다른 id (한 번 결제로 남의 풀이가 열리지 않는다)", () => {
    const a = unlockIdFor("basic", me, undefined)!;
    expect(a).toMatch(/^basic:[0-9a-f]{14}$/);
    expect(unlockIdFor("basic", { ...me, name: "다른이름" }, undefined)).toBe(a); // 이름은 풀이에 영향 없음
    expect(unlockIdFor("love", me, undefined)).not.toBe(a);
    for (const diff of [
      { date: "1990-04-20" },
      { time: "01:11" },
      { time: null },
      { gender: "m" },
      { calendar: "lunar" },
      { leap: true },
    ])
      expect(unlockIdFor("basic", { ...me, ...diff }, undefined), JSON.stringify(diff)).not.toBe(a);
    const c = unlockIdFor("compat", me, partner)!;
    expect(c).toMatch(/^compat:[0-9a-f]{14}$/);
    expect(unlockIdFor("compat", me, { ...partner, time: "14:31" })).not.toBe(c);
    expect(unlockIdFor("compat", { ...me, date: "1991-04-19" }, partner)).not.toBe(c);
    expect(unlockIdFor("compat", partner, me)).not.toBe(c); // 순서도 구분
    expect(unlockIdFor("compat", me, { date: "x" })).toBeNull();
    expect(unlockIdFor("compat", me, undefined)).toBeNull();
    expect(unlockIdFor("basic", null, undefined)).toBeNull();
    expect(unlockIdFor("basic", { ...me, date: "bad" }, undefined)).toBeNull();
  });
});

function fakeClient(res: { data: unknown; error: unknown } | "throw"): {
  client: UnlockClient;
  seen: string[][];
} {
  const seen: string[][] = [];
  const client: UnlockClient = {
    from: (t) => ({
      select: (c) => ({
        eq: (c1, v1) => ({
          eq: (c2, v2) => {
            seen.push([t, c, c1, v1, c2, v2]);
            return {
              maybeSingle: async () => {
                if (res === "throw") throw new Error("boom");
                return res;
              },
            };
          },
        }),
      }),
    }),
  };
  return { client, seen };
}

describe("열람 권한 확인(서버가 DB 에서 직접)", () => {
  it("본인의 열람 기록이 있을 때만 true, 쿼리는 user_id·reading_id 로 좁혀서 보낸다", async () => {
    const yes = fakeClient({ data: { reading_id: "basic" }, error: null });
    expect(await isUnlocked(yes.client, "u1", "basic")).toBe(true);
    expect(yes.seen[0]).toEqual([
      "unlocked_readings",
      "reading_id",
      "user_id",
      "u1",
      "reading_id",
      "basic",
    ]);
    expect(await isUnlocked(fakeClient({ data: null, error: null }).client, "u1", "basic")).toBe(
      false,
    );
  });
  it("조회 오류·예외·id 없음은 모두 잠금(fail-closed)", async () => {
    expect(
      await isUnlocked(
        fakeClient({ data: { reading_id: "basic" }, error: { message: "x" } }).client,
        "u1",
        "basic",
      ),
    ).toBe(false);
    expect(await isUnlocked(fakeClient("throw").client, "u1", "basic")).toBe(false);
    const f = fakeClient({ data: { reading_id: "x" }, error: null });
    expect(await isUnlocked(f.client, "u1", null)).toBe(false);
    expect(f.seen).toHaveLength(0); // id 가 없으면 DB 를 부르지도 않는다
  });
});

describe("서버 함수 입력 검증", () => {
  const ok = { product: "basic", me };
  it("정상 입력은 통과", () => {
    expect(readingInputSchema.safeParse(ok).success).toBe(true);
    expect(readingInputSchema.safeParse({ product: "compat", me, partner }).success).toBe(true);
  });
  it("이상한 입력은 거부(상품·형식·길이·성별)", () => {
    for (const bad of [
      null,
      {},
      { ...ok, product: "deep" },
      { ...ok, me: { ...me, gender: "x" } },
      { ...ok, me: { ...me, date: "1990-4-19" } },
      { ...ok, me: { ...me, name: "a".repeat(65) } },
      { ...ok, me: { ...me, calendar: "weird" } },
      { ...ok, me: { ...me, time: 5 } },
      { product: "basic" },
    ]) {
      expect(readingInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});
