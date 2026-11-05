import { describe, expect, it } from "vitest";
import {
  getAiReading,
  readAiConfig,
  supabaseAiStore,
  versionKey,
  type AiConfig,
  type AiDeps,
  type AiSection,
  type AiStore,
} from "@/lib/ai-reading.server";
import type { LlmClient, LlmRequest } from "@/lib/reading-core/src/lib/report/llm";
import type { PipelineResult } from "@/lib/reading-core/src/lib/report/pipeline";
import type { UnlockClient } from "@/lib/reading.server";
import { unlockId } from "@/lib/unlock-id";

const me = {
  name: "나영",
  calendar: "solar" as const,
  leap: false,
  date: "1995-05-17",
  time: "14:00",
  gender: "f" as const,
};
const TODAY = "2026-11-05";
const RID = unlockId("basic", me, undefined)!;

const ENV = {
  AI_READING_MODE: "trial",
  AI_MODEL: "gpt-test",
  OPENAI_API_KEY: "sk-test",
  LLM_PRICE_IN_PER_M: "0.75",
  LLM_PRICE_OUT_PER_M: "4.5",
  LLM_REPORT_BUDGET_USD: "0.3",
  LLM_DAILY_BUDGET_USD: "5",
};
const REVIEW_ENV = {
  AI_REVIEW_MODEL: "gemini-test",
  GEMINI_API_KEY: "g-test",
  AI_REVIEW_PRICE_IN_PER_M: "0.3",
  AI_REVIEW_PRICE_OUT_PER_M: "2.5",
};

function unlock(yes: boolean): UnlockClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({
              data: yes && v === RID ? { reading_id: v } : null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
}

function fakeStore(
  beginState: { state: string; id?: string; attempt?: number } = {
    state: "start",
    id: "r1",
    attempt: 1,
  },
) {
  const calls: { begin: unknown[]; finish: Parameters<AiStore["finish"]>[0][] } = {
    begin: [],
    finish: [],
  };
  let row: {
    status: string;
    sections: AiSection[] | null;
    review: { verdict?: string } | null;
  } | null = null;
  const store: AiStore = {
    async begin(a) {
      calls.begin.push(a);
      return beginState;
    },
    async finish(a) {
      calls.finish.push(a);
      row = {
        status: a.status,
        sections: a.sections,
        review: a.review as { verdict?: string } | null,
      };
      return true;
    },
    async read() {
      return row;
    },
  };
  return { store, calls, setRow: (r: typeof row) => (row = r) };
}

/** 가짜 작성 파이프라인: 이름 자리표시를 쓴 섹션 2개를 돌려준다 */
function fakeRun(reportStatus: "READY" | "NEEDS_REVIEW" = "NEEDS_REVIEW", seen: unknown[] = []) {
  return (async (_plan: unknown, _f: unknown, opts: unknown) => {
    seen.push(opts);
    return {
      status: "ok",
      reportStatus,
      reviewReasons: [],
      sections: [
        {
          id: "s1",
          title: "나의 큰 그림",
          headline: "흙 기운이 중심이에요",
          body: "{{이름}}님은 흙 기운이 중심이에요.\n계절의 도움을 받는 쪽이에요.",
          claimIds: [],
          evidenceIds: [],
          attempts: 1,
        },
        {
          id: "s2",
          title: "타고난 성격",
          headline: "기준을 의식해요",
          body: "규칙과 책임을 의식하는 편이에요.",
          claimIds: [],
          evidenceIds: [],
          attempts: 1,
        },
      ],
      issues: [],
      usage: { inputTokens: 10000, outputTokens: 3000, cacheReadTokens: 0, cacheWriteTokens: 0 },
      calls: 6,
      costUsd: 0,
      model: "gpt-test",
      cacheKey: "k",
      versions: { prompt: "p", qa: "q", interpretation: "i" },
    } as unknown as PipelineResult;
  }) as unknown as NonNullable<AiDeps["run"]>;
}

class Reviewer implements LlmClient {
  seen: LlmRequest[] = [];
  constructor(private findings: object[]) {}
  async complete(req: LlmRequest) {
    this.seen.push(req);
    return {
      text: JSON.stringify({ findings: this.findings }),
      model: "gemini-test",
      stopReason: "STOP",
      usage: { inputTokens: 5000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }
}

const deps = (over: Partial<AiDeps> & { env?: Record<string, string> } = {}): AiDeps => ({
  config: readAiConfig(over.env ?? ENV),
  store: fakeStore().store,
  unlockClient: unlock(true),
  run: fakeRun(),
  today: TODAY,
  ...over,
});

describe("AI 풀이 설정(기본 꺼짐, 빠진 설정이면 시작하지 않음)", () => {
  it("설정이 없으면 off, 키·모델·가격·상한이 하나라도 없으면 시작하지 않는다", () => {
    expect(readAiConfig({})).toMatchObject({ ok: false, mode: "off" });
    for (const k of ["AI_MODEL", "OPENAI_API_KEY", "LLM_PRICE_IN_PER_M", "LLM_DAILY_BUDGET_USD"]) {
      const env: Record<string, string | undefined> = { ...ENV, [k]: undefined };
      expect(readAiConfig(env).ok, k).toBe(false);
    }
    expect(readAiConfig({ ...ENV, LLM_KILL_SWITCH: "true" })).toMatchObject({
      ok: false,
      reason: "KILL_SWITCH",
    });
  });
  it("live 는 독립 감수 설정이 있어야 한다. 하루 원가 예약은 쓰기+감수 상한의 합", () => {
    expect(readAiConfig({ ...ENV, AI_READING_MODE: "live" }).ok).toBe(false);
    const c = readAiConfig({ ...ENV, ...REVIEW_ENV, AI_READING_MODE: "live" });
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.config.reserveUsd).toBeCloseTo(0.35);
      expect(versionKey(c.config)).toContain("gemini-test");
      expect(JSON.stringify(c)).toContain("sk-test"); // 설정 객체 안에만 있고
      expect(versionKey(c.config)).not.toContain("sk-test"); // DB 에 저장되는 버전 키에는 키가 없다
    }
  });
});

describe("AI 풀이 생성 흐름", () => {
  it("꺼져 있으면 DB·AI 를 부르지 않는다", async () => {
    const s = fakeStore();
    const r = await getAiReading({ product: "basic", me }, "u1", deps({ env: {}, store: s.store }));
    expect(r).toMatchObject({ ok: true, state: "unavailable" });
    expect(s.calls.begin.length).toBe(0);
  });
  it("열람하지 않았거나 궁합(아직 미지원)이면 시작하지 않는다", async () => {
    const s = fakeStore();
    expect(
      await getAiReading(
        { product: "basic", me },
        "u1",
        deps({ store: s.store, unlockClient: unlock(false) }),
      ),
    ).toMatchObject({ state: "unavailable", message: expect.stringContaining("풀이를 연 뒤") });
    expect(
      await getAiReading({ product: "compat", me, partner: me }, "u1", deps({ store: s.store })),
    ).toMatchObject({ state: "unavailable" });
    expect(s.calls.begin.length).toBe(0);
  });
  it("심층 연애운: 열람 id 는 love, 판단 카드 기반 계획(연도 5개, 10년 흐름 섹션 없음)으로 쓴다", async () => {
    const loveRid = unlockId("love", me, undefined)!;
    const lu: UnlockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: (_c: string, v: string) => ({
              maybeSingle: async () => ({
                data: v === loveRid ? { reading_id: v } : null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const s = fakeStore();
    const plans: { sections: { title: string }[]; years?: number[] }[] = [];
    const run = (async (plan: never, f: never, o: never) => {
      plans.push(plan);
      return fakeRun()(plan, f, o);
    }) as unknown as NonNullable<AiDeps["run"]>;
    const r = await getAiReading(
      { product: "love", me },
      "u1",
      deps({ store: s.store, unlockClient: lu, run }),
    );
    expect(r).toMatchObject({ ok: true, state: "ready" });
    expect(s.calls.begin[0]).toMatchObject({ readingId: loveRid });
    expect(plans[0]!.years).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(plans[0]!.sections.map((x) => x.title)).not.toContain("10년 단위 큰 흐름");
  });
  it("trial: 만들어 저장하고(이름 없이), 응답할 때만 이름을 넣어 시범 표시와 함께 보여 준다", async () => {
    const s = fakeStore();
    const seen: unknown[] = [];
    const r = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ store: s.store, run: fakeRun("NEEDS_REVIEW", seen) }),
    );
    expect(r).toMatchObject({ ok: true, state: "ready", trial: true, reviewed: false });
    if (r.ok && r.state === "ready") expect(r.sections[0]!.body).toContain("나영님은");
    // 모델에는 이름 자리표시만, 초안 명제 허용(trial)
    expect(seen[0]).toMatchObject({ displayName: "{{이름}}", allowDraftClaims: true });
    // DB 에는 이름이 없다
    const f = s.calls.finish[0]!;
    expect(f.status).toBe("needs_review");
    expect(JSON.stringify(f.sections)).not.toContain("나영");
    expect(JSON.stringify(f.sections)).toContain("{{이름}}");
    expect(f.costUsd).toBeGreaterThan(0);
    expect(s.calls.begin[0]).toMatchObject({ userId: "u1", readingId: RID });
  });
  it("live: 감수 통과(PASS)·자동 검수 통과(READY)일 때만 보여 주고, 감수 모델에 이름을 보내지 않는다", async () => {
    const env = { ...ENV, ...REVIEW_ENV, AI_READING_MODE: "live" };
    const rv = new Reviewer([]);
    const s = fakeStore();
    const r = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ env, store: s.store, run: fakeRun("READY"), reviewer: () => rv }),
    );
    expect(r).toMatchObject({ state: "ready", trial: false, reviewed: true });
    expect(JSON.stringify(rv.seen)).not.toContain("나영");
    expect(s.calls.finish[0]!.status).toBe("ready");
    // 자동 검수에서 READY 가 아니면 live 에서는 숨긴다
    const s2 = fakeStore();
    const r2 = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({
        env,
        store: s2.store,
        run: fakeRun("NEEDS_REVIEW"),
        reviewer: () => new Reviewer([]),
      }),
    );
    expect(r2).toMatchObject({ state: "unavailable" });
    expect(s2.calls.finish[0]!.status).toBe("needs_review");
  });
  it("감수 차단(BLOCK)이면 trial 에서도 보여 주지 않는다", async () => {
    const env = { ...ENV, ...REVIEW_ENV };
    const rv = new Reviewer([
      {
        section_id: "s1",
        quote: "계절의 도움을 받는 쪽이에요.",
        kind: "CONTRADICTS_FACT",
        severity: "major",
        reason: "계절 관계가 다름",
      },
    ]);
    const s = fakeStore();
    const r = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ env, store: s.store, reviewer: () => rv }),
    );
    expect(r).toMatchObject({ state: "unavailable", message: expect.stringContaining("보류") });
    expect(s.calls.finish[0]!.status).toBe("blocked");
  });
  it("이미 있으면 다시 만들지 않고 저장된 것을, 만드는 중이면 running 을 돌려준다", async () => {
    const seen: unknown[] = [];
    const done = fakeStore({ state: "done", id: "r1" });
    done.setRow({
      status: "needs_review",
      sections: [{ id: "s1", title: "t", headline: "h", body: "{{이름}}님 안녕" }],
      review: null,
    });
    const r = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ store: done.store, run: fakeRun("READY", seen) }),
    );
    expect(r).toMatchObject({ state: "ready", sections: [{ body: "나영님 안녕" }] });
    expect(seen.length).toBe(0);
    const running = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ store: fakeStore({ state: "running", id: "r1" }).store, run: fakeRun("READY", seen) }),
    );
    expect(running).toMatchObject({ state: "running" });
    for (const st of ["user_limit", "budget", "exhausted", "error"]) {
      expect(
        await getAiReading(
          { product: "basic", me },
          "u1",
          deps({ store: fakeStore({ state: st }).store, run: fakeRun("READY", seen) }),
        ),
      ).toMatchObject({ state: "unavailable" });
    }
    expect(seen.length).toBe(0);
  });
  it("작성 중 오류면 failed 로 기록하고 안내만 돌려준다", async () => {
    const s = fakeStore();
    const boom = (async () => {
      throw Object.assign(new Error("x"), { kind: "rate_limit" });
    }) as unknown as NonNullable<AiDeps["run"]>;
    const r = await getAiReading(
      { product: "basic", me },
      "u1",
      deps({ store: s.store, run: boom }),
    );
    expect(r).toMatchObject({ state: "unavailable" });
    expect(s.calls.finish[0]).toMatchObject({ status: "failed", error: "rate_limit" });
  });
});

describe("DB 저장소(service_role 함수 호출 모양)", () => {
  it("rpc 를 메서드 호출로 부르고, 오류면 시작하지 않는다", async () => {
    const seen: [string, Record<string, unknown>][] = [];
    const admin = {
      rpc(fn: string, args: Record<string, unknown>) {
        if (this !== admin) throw new Error("this 소실");
        seen.push([fn, args]);
        return Promise.resolve(
          fn === "ai_reading_begin"
            ? { data: null, error: { message: "relation does not exist" } }
            : { data: true, error: null },
        );
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    };
    const store = supabaseAiStore(admin);
    expect(
      await store.begin({
        userId: "u",
        readingId: RID,
        version: "v",
        userDaily: 3,
        dailyUsd: 5,
        reserveUsd: 0.3,
        staleSeconds: 300,
      }),
    ).toEqual({ state: "error" });
    expect(seen[0]![1]).toMatchObject({ p_user: "u", p_reading: RID, p_stale_seconds: 300 });
    expect(
      await store.finish({
        id: "i",
        attempt: 1,
        status: "ready",
        sections: [],
        review: null,
        model: "m",
        costUsd: 0.01,
        error: null,
      }),
    ).toBe(true);
  });
});

export type { AiConfig };
