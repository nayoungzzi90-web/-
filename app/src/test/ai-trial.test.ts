import { describe, expect, it } from "vitest";
import {
  readTrialConfig,
  runAiTrial,
  tokenMatches,
} from "@/lib/ai-trial.server";

const GOOD_ENV = {
  AI_READING_MODE: "trial",
  AI_TRIAL_TOKEN: "x".repeat(20),
  AI_MODEL: "model-a",
  OPENAI_API_KEY: "sk-test-not-real",
  LLM_PRICE_IN_PER_M: "1",
  LLM_PRICE_OUT_PER_M: "4",
  LLM_REPORT_BUDGET_USD: "0.5",
  LLM_DAILY_BUDGET_USD: "5",
  LLM_MAX_OUTPUT_TOKENS: "4000",
};
const me = {
  name: "나영",
  calendar: "solar",
  leap: false,
  date: "1990-05-15",
  time: "14:30",
  gender: "f",
};

describe("AI 시범 설정(fail-closed)", () => {
  it("기본(설정 없음)은 꺼짐", () => {
    expect(readTrialConfig({})).toEqual({ ok: false, reason: "OFF" });
    expect(readTrialConfig({ AI_READING_MODE: "live" })).toEqual({
      ok: false,
      reason: "OFF",
    });
  });
  it("토큰·모델·키·원가 중 하나라도 없으면 시작하지 않는다", () => {
    for (const k of [
      "AI_TRIAL_TOKEN",
      "AI_MODEL",
      "OPENAI_API_KEY",
      "LLM_PRICE_IN_PER_M",
      "LLM_REPORT_BUDGET_USD",
    ]) {
      const env: Record<string, string | undefined> = { ...GOOD_ENV };
      delete env[k];
      expect(readTrialConfig(env).ok, k).toBe(false);
    }
    expect(readTrialConfig({ ...GOOD_ENV, AI_TRIAL_TOKEN: "짧음" }).ok).toBe(
      false,
    );
  });
  it("모두 있으면 켜진다", () => {
    expect(readTrialConfig(GOOD_ENV).ok).toBe(true);
  });
  it("실패 사유에 키·토큰 값이 들어가지 않는다", () => {
    const r = readTrialConfig({ ...GOOD_ENV, AI_MODEL: undefined });
    expect(JSON.stringify(r)).not.toContain("sk-test-not-real");
    expect(JSON.stringify(r)).not.toContain("xxxxxxxx");
  });
});

describe("토큰 비교", () => {
  it("같은 값만 통과", () => {
    expect(tokenMatches("abc", "abc")).toBe(true);
    expect(tokenMatches("abc", "abd")).toBe(false);
    expect(tokenMatches("abc", "abcd")).toBe(false);
    expect(tokenMatches("", "abc")).toBe(false);
  });
});

describe("AI 시범 실행", () => {
  const cfg = readTrialConfig(GOOD_ENV);
  it("꺼져 있으면 AI 를 부르지 않는다", async () => {
    let called = false;
    const r = await runAiTrial(
      { me, token: "x".repeat(20) },
      {
        config: { ok: false, reason: "OFF" },
        writer: () => {
          called = true;
          throw new Error("x");
        },
      },
    );
    expect(r).toMatchObject({ ok: true, state: "unavailable" });
    expect(called).toBe(false);
  });
  it("토큰이 틀리면 거절하고 AI 를 부르지 않는다", async () => {
    let called = false;
    const r = await runAiTrial(
      { me, token: "wrong-token-wrong-token" },
      {
        config: cfg,
        writer: () => {
          called = true;
          throw new Error("x");
        },
      },
    );
    expect(r).toEqual({ ok: false, error: "사용할 수 없어요." });
    expect(called).toBe(false);
  });
  it("잘못된 출생 입력은 AI 를 부르기 전에 거절한다", async () => {
    let called = false;
    const r = await runAiTrial(
      { me: { ...me, date: "2999-01-01" }, token: "x".repeat(20) },
      {
        config: cfg,
        writer: () => {
          called = true;
          throw new Error("x");
        },
      },
    );
    expect(r.ok).toBe(false);
    expect(called).toBe(false);
  });
  it("파이프라인 결과를 받아 이름을 넣고, 이름·생년월일이 모델 입력에 없다", async () => {
    let seen = "";
    const r = await runAiTrial(
      { me, token: "x".repeat(20), concern: "이직 고민", sendConcern: false },
      {
        config: cfg,
        writer: () =>
          ({
            complete: async () => {
              throw new Error("run 으로 대체됨");
            },
          }) as never,
        run: async (_plan, interp, opts) => {
          seen = JSON.stringify({ interp, opts: { ...opts, llm: undefined } });
          return {
            status: "ok",
            usage: { inputTokens: 100, outputTokens: 100 },
            sections: [
              {
                id: "s1",
                title: "한마디로",
                headline: "{{이름}}님의 사주",
                body: "{{이름}}님은 ...",
                claimIds: [],
                evidenceIds: [],
                attempts: 1,
              },
            ],
          } as never;
        },
      },
    );
    expect(r).toMatchObject({ ok: true, state: "ready", reviewed: false });
    if (r.ok && r.state === "ready")
      expect(r.sections[0]!.headline).toBe("나영님의 사주");
    expect(seen).not.toContain("1990-05-15");
    expect(seen).not.toContain("나영");
    expect(seen).not.toContain("이직 고민"); // 동의 안 하면 고민 글을 보내지 않는다
  });
  it("동의하면 고민 글만 파이프라인으로 넘어간다", async () => {
    let concern: string | undefined;
    await runAiTrial(
      { me, token: "x".repeat(20), concern: "이직 고민", sendConcern: true },
      {
        config: cfg,
        run: async (_p, _i, opts) => {
          concern = opts.concern;
          return {
            status: "ok",
            usage: { inputTokens: 1, outputTokens: 1 },
            sections: [],
          } as never;
        },
      },
    );
    expect(concern).toBe("이직 고민");
  });
});
