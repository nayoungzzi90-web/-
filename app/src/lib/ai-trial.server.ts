// AI 풀이 "소유자 전용 시범" — 서버 전용, 기본 꺼짐.
// 옛 앱(lovable-app/src/lib/ai-reading.server.ts)의 작성→자동검수→독립감수 흐름을 쓰되, DB·로그인이 없는 새 앱을 위해
// 저장 없이(stateless) 한 번 만들어 돌려준다. 그래서 아래 안전장치를 모두 요구한다(하나라도 없으면 AI 를 부르지 않는다).
//   1) AI_READING_MODE=trial       (기본 off)
//   2) AI_TRIAL_TOKEN (16자 이상)   — 소유자만 아는 비밀 토큰. 모르면 어떤 호출도 거절한다.
//   3) AI_MODEL, OPENAI_API_KEY, 원가 설정(LLM_PRICE_IN_PER_M 등) — 보고서 1건 원가 상한을 BudgetedLlm 이 강제한다.
// 모델에는 이름·생년월일을 보내지 않는다(본문은 {{이름}} 자리표시). 고민 글은 사용자가 동의했을 때만 보낸다.
// 하루 총원가·사용자별 횟수 한도는 DB 가 있어야 강제할 수 있다 → 공개 서비스로 켜기 전에 DB 판이 필요하다.
import {
  BudgetedLlm,
  costFromUsage,
  readBudgetConfig,
  type BudgetConfig,
} from "./reading-core/src/lib/report/budget";
import { GeminiLlm } from "./reading-core/src/lib/report/geminiClient";
import { buildInterpretation } from "./reading-core/src/lib/report/interpretation";
import type { LlmClient } from "./reading-core/src/lib/report/llm";
import { OpenAiLlm } from "./reading-core/src/lib/report/openaiClient";
import {
  fillName,
  runReportPipeline,
} from "./reading-core/src/lib/report/pipeline";
import { buildPlan } from "./reading-core/src/lib/report/plan";
import {
  applyReview,
  reviewReport,
  type ReviewResult,
} from "./reading-core/src/lib/report/review";
import {
  analyzeR002toR005,
  fromManse,
} from "./reading-core/engine/saju-rules/src";
import { chartOf } from "./chart.server";
import { kstToday } from "./saju";

export interface TrialConfig {
  model: string;
  openaiKey: string;
  token: string;
  budget: BudgetConfig;
  review: { model: string; key: string; budget: BudgetConfig } | null;
}
export type TrialConfigResult =
  { ok: true; config: TrialConfig } | { ok: false; reason: string };

/** 환경변수 → 설정. 키·토큰 값은 반환·로그에 남기지 않는다. */
export function readTrialConfig(
  env: Record<string, string | undefined>,
): TrialConfigResult {
  if ((env["AI_READING_MODE"] ?? "off").trim() !== "trial")
    return { ok: false, reason: "OFF" };
  const token = env["AI_TRIAL_TOKEN"]?.trim() ?? "";
  if (token.length < 16)
    return { ok: false, reason: "CONFIG: AI_TRIAL_TOKEN(16자 이상)" };
  const model = env["AI_MODEL"]?.trim();
  const openaiKey = env["OPENAI_API_KEY"]?.trim();
  if (!model) return { ok: false, reason: "CONFIG: AI_MODEL" };
  if (!openaiKey) return { ok: false, reason: "CONFIG: OPENAI_API_KEY" };
  const b = readBudgetConfig(env, "basic");
  if (!b.ok)
    return {
      ok: false,
      reason:
        b.error.split(":")[0] === "LLM_DISABLED"
          ? "KILL_SWITCH"
          : `CONFIG: ${b.error}`,
    };
  let review: TrialConfig["review"] = null;
  const rModel = env["AI_REVIEW_MODEL"]?.trim();
  const rKey = env["GEMINI_API_KEY"]?.trim();
  if (rModel && rKey) {
    const rb = readBudgetConfig(
      {
        LLM_PRICE_IN_PER_M: env["AI_REVIEW_PRICE_IN_PER_M"],
        LLM_PRICE_OUT_PER_M: env["AI_REVIEW_PRICE_OUT_PER_M"],
        LLM_REPORT_BUDGET_USD: env["AI_REVIEW_BUDGET_USD"] ?? "0.05",
        LLM_DAILY_BUDGET_USD: env["LLM_DAILY_BUDGET_USD"],
        LLM_MAX_OUTPUT_TOKENS: "4000",
      },
      undefined,
    );
    if (!rb.ok) return { ok: false, reason: `CONFIG: 감수 ${rb.error}` };
    review = { model: rModel, key: rKey, budget: rb.config };
  }
  return {
    ok: true,
    config: { model, openaiKey, token, budget: b.config, review },
  };
}

/** 길이가 달라도 같은 시간에 비교한다(타이밍 추측 방지). */
export function tokenMatches(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export interface TrialSection {
  id: string;
  title: string;
  headline: string;
  body: string;
}
export type TrialResponse =
  | {
      ok: true;
      state: "ready";
      reviewed: boolean;
      verdict: string | null;
      sections: TrialSection[];
      costUsd: number;
    }
  | { ok: true; state: "unavailable"; message: string }
  | { ok: false; error: string };

const OFF_MSG = "AI 풀이는 아직 준비 중이에요.";
const DENIED = "사용할 수 없어요.";

export interface TrialDeps {
  config: TrialConfigResult;
  today?: string;
  writer?: (c: TrialConfig) => LlmClient;
  reviewer?: (c: TrialConfig) => LlmClient | null;
  /** 시험용: 작성 파이프라인 바꿔치기(실제 파이프라인은 상위 저장소 시험에서 검증) */
  run?: typeof runReportPipeline;
}

export async function runAiTrial(
  input: {
    me: unknown;
    token: string;
    concern?: string;
    sendConcern?: boolean;
  },
  deps: TrialDeps,
): Promise<TrialResponse> {
  if (!deps.config.ok)
    return { ok: true, state: "unavailable", message: OFF_MSG };
  const c = deps.config.config;
  // 토큰이 틀리면 설정 여부도 알려주지 않는다(같은 응답).
  if (!tokenMatches(input.token, c.token)) return { ok: false, error: DENIED };

  const today = deps.today ?? kstToday();
  const ch = chartOf(input.me, today, "me", {});
  if (!ch.ok) return { ok: false, error: ch.error };
  const name =
    typeof input.me === "object" && input.me !== null
      ? (input.me as { name?: string }).name
      : undefined;

  const fm = fromManse(ch.chart.manse);
  const rules = analyzeR002toR005(fm.chart, {
    monthTerm: fm.monthTerm,
    birth: fm.birth,
  });
  const interp = buildInterpretation("basic", ch.chart.facts, { rules });
  const plan = buildPlan("basic", interp);
  const writer = new BudgetedLlm(
    deps.writer
      ? deps.writer(c)
      : new OpenAiLlm({ apiKey: c.openaiKey, model: c.model }),
    c.budget,
  );
  let cost = 0;
  try {
    const r = await (deps.run ?? runReportPipeline)(plan, interp, {
      llm: writer,
      model: c.model,
      allowDraftClaims: true, // 시범: 전문가 승인 전 초안 명제 허용(화면에 '시범·검수 전' 표시)
      displayName: "{{이름}}",
      ...(input.sendConcern && input.concern ? { concern: input.concern } : {}),
    });
    cost += costFromUsage(r.usage, c.budget.pricing);
    if (r.status !== "ok")
      return {
        ok: true,
        state: "unavailable",
        message: "AI 풀이를 만들지 못했어요.",
      };
    let review: ReviewResult | null = null;
    let result = r;
    const reviewer = c.review
      ? deps.reviewer
        ? deps.reviewer(c)
        : new GeminiLlm({ apiKey: c.review.key, model: c.review.model })
      : null;
    if (c.review && reviewer) {
      review = await reviewReport(
        new BudgetedLlm(reviewer, c.review.budget),
        interp,
        r.sections,
        { model: c.review.model },
      );
      cost += costFromUsage(review.usage, c.review.budget.pricing);
      result = applyReview(r, review);
    }
    // 독립 감수가 차단(BLOCK)하면 보여주지 않는다. 그 외(검수 전 포함)는 시범 표시와 함께 보여준다.
    if (review?.verdict === "BLOCK")
      return {
        ok: true,
        state: "unavailable",
        message: "AI 풀이가 검수에서 보류됐어요.",
      };
    void result;
    const nm = name?.trim() || undefined;
    return {
      ok: true,
      state: "ready",
      reviewed: review?.verdict === "PASS",
      verdict: review?.verdict ?? null,
      costUsd: Math.round(cost * 1e5) / 1e5,
      sections: r.sections.map((s) => ({
        id: s.id,
        title: s.title,
        headline: fillName(s.headline, nm),
        body: fillName(s.body, nm),
      })),
    };
  } catch {
    return {
      ok: true,
      state: "unavailable",
      message: "AI 풀이를 만드는 중 문제가 생겼어요.",
    };
  }
}
