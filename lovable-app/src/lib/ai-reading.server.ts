// AI 풀이 — 서버 전용. 판단 카드(R-002~R-005) → GPT 작성 → 코드 자동 검수 → Gemini 독립 감수 → 저장.
// 기본은 꺼져 있다(AI_READING_MODE=off). 켜는 것은 사용자 승인 사항이다.
//   · off   : AI 를 부르지 않는다(기본).
//   · trial : 전문가 승인 전 초안 명제로 쓴다. 감수 차단(BLOCK)만 막고 "시범(검수 전)" 표시와 함께 보여 준다.
//   · live  : 승인된 명제만 쓰고, 자동 검수·독립 감수를 모두 통과한(READY) 풀이만 보여 준다. 감수 설정이 없으면 시작하지 않는다.
// 원칙
//   · 사주 계산(4주·카드)은 결정론 엔진이 한다. AI 는 쓰기만 한다.
//   · 열람 권한·생성 중복·재시도·하루 한도·하루 원가는 서버가 DB 에서 확인한다(ai_reading_begin, service_role).
//   · 모델에는 고객 이름·출생정보 원문을 보내지 않는다. 본문은 {{이름}} 자리표시로 저장하고 응답할 때만 이름을 넣는다.
//   · 설정값(키·가격·상한)이 하나라도 없으면 시작하지 않는다(fail-closed).
import {
  BudgetedLlm,
  costFromUsage,
  readBudgetConfig,
  type BudgetConfig,
} from "./reading-core/src/lib/report/budget";
import { CARDS_VERSION } from "./reading-core/src/lib/report/cards";
import { GeminiLlm } from "./reading-core/src/lib/report/geminiClient";
import { buildInterpretation } from "./reading-core/src/lib/report/interpretation";
import type { LlmClient } from "./reading-core/src/lib/report/llm";
import { OpenAiLlm } from "./reading-core/src/lib/report/openaiClient";
import { fillName, runReportPipeline } from "./reading-core/src/lib/report/pipeline";
import { buildPlan, PLAN_VERSION } from "./reading-core/src/lib/report/plan";
import { PROMPT_VERSION } from "./reading-core/src/lib/report/prompt";
import { QA_VERSION } from "./reading-core/src/lib/report/qa";
import {
  applyReview,
  REVIEW_VERSION,
  reviewReport,
  type ReviewResult,
} from "./reading-core/src/lib/report/review";
import { analyzeR002toR005, fromManse } from "./reading-core/engine/saju-rules/src";
import {
  chartOf,
  isUnlocked,
  unlockIdFor,
  type ReadingProduct,
  type UnlockClient,
} from "./reading.server";
import { kstToday } from "./saju";

export type AiMode = "off" | "trial" | "live";

export interface AiConfig {
  mode: Exclude<AiMode, "off">;
  model: string;
  openaiKey: string;
  budget: BudgetConfig;
  review: { model: string; key: string; budget: BudgetConfig } | null;
  userDaily: number;
  /** 진행 중 작업 1건이 쓸 수 있는 최대 원가(쓰기 + 감수) — 하루 원가 계산에서 미리 뺀다 */
  reserveUsd: number;
  staleSeconds: number;
}
export type AiConfigResult =
  { ok: true; config: AiConfig } | { ok: false; mode: AiMode; reason: string };

const posNum = (v: string | undefined, d: number) => {
  const n = v === undefined || v.trim() === "" ? d : Number(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

/** 환경변수 → 설정. 키 값은 반환·로그에 남기지 않는다. */
export function readAiConfig(env: Record<string, string | undefined>): AiConfigResult {
  const raw = (env["AI_READING_MODE"] ?? "off").trim();
  const mode: AiMode = raw === "trial" || raw === "live" ? raw : "off";
  if (mode === "off") return { ok: false, mode, reason: "OFF" };
  const fail = (reason: string): AiConfigResult => ({ ok: false, mode, reason });
  const model = env["AI_MODEL"]?.trim();
  const openaiKey = env["OPENAI_API_KEY"]?.trim();
  if (!model) return fail("CONFIG: AI_MODEL");
  if (!openaiKey) return fail("CONFIG: OPENAI_API_KEY");
  const b = readBudgetConfig(env, "basic");
  if (!b.ok)
    return fail(b.error.split(":")[0] === "LLM_DISABLED" ? "KILL_SWITCH" : `CONFIG: ${b.error}`);

  let review: AiConfig["review"] = null;
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
    if (!rb.ok) return fail(`CONFIG: 감수 ${rb.error}`);
    review = { model: rModel, key: rKey, budget: rb.config };
  }
  if (mode === "live" && !review)
    return fail("CONFIG: live 모드는 독립 감수(AI_REVIEW_MODEL, GEMINI_API_KEY)가 필요해요");

  const userDaily = posNum(env["AI_USER_DAILY_MAX"], 3);
  const staleSeconds = posNum(env["AI_STALE_SECONDS"], 300);
  if (!Number.isFinite(userDaily) || !Number.isFinite(staleSeconds) || staleSeconds < 60)
    return fail("CONFIG: AI_USER_DAILY_MAX / AI_STALE_SECONDS");
  return {
    ok: true,
    config: {
      mode,
      model,
      openaiKey,
      budget: b.config,
      review,
      userDaily: Math.floor(userDaily),
      reserveUsd: b.config.maxReportUsd + (review?.budget.maxReportUsd ?? 0),
      staleSeconds: Math.floor(staleSeconds),
    },
  };
}

/** 같은 열람 id 라도 이 값이 바뀌면(카드·프롬프트·검수·모델 변경) 새로 만든다 */
export const versionKey = (c: AiConfig) =>
  [
    CARDS_VERSION,
    PROMPT_VERSION,
    PLAN_VERSION,
    QA_VERSION,
    REVIEW_VERSION,
    c.model,
    c.review?.model ?? "-",
    c.mode,
  ]
    .join("|")
    .slice(0, 200);

export interface AiSection {
  id: string;
  title: string;
  headline: string;
  body: string;
}
export type AiReadingResponse =
  | { ok: true; state: "ready"; trial: boolean; reviewed: boolean; sections: AiSection[] }
  | { ok: true; state: "running" }
  | { ok: true; state: "unavailable"; message: string }
  | { ok: false; error: string };

type StoredStatus = "ready" | "needs_review" | "blocked" | "failed";

/** DB 중 이 기능이 쓰는 부분(service_role). 시험에서 가짜를 넣는다. */
export interface AiStore {
  begin(a: {
    userId: string;
    readingId: string;
    version: string;
    userDaily: number;
    dailyUsd: number;
    reserveUsd: number;
    staleSeconds: number;
  }): Promise<{ state: string; id?: string; attempt?: number }>;
  finish(a: {
    id: string;
    attempt: number;
    status: StoredStatus;
    sections: AiSection[] | null;
    review: unknown;
    model: string;
    costUsd: number;
    error: string | null;
  }): Promise<boolean>;
  read(id: string): Promise<{
    status: string;
    sections: AiSection[] | null;
    review: { verdict?: string } | null;
  } | null>;
}

export interface AiDeps {
  config: AiConfigResult;
  store: AiStore;
  /** 열람 기록 조회(로그인 사용자 권한, RLS) */
  unlockClient: UnlockClient;
  writer?: (c: AiConfig) => LlmClient;
  reviewer?: (c: AiConfig) => LlmClient | null;
  /** 시험용: 작성 파이프라인 바꿔치기(실제 파이프라인은 상위 저장소 시험에서 검증) */
  run?: typeof runReportPipeline;
  today?: string;
}

const MSG = {
  OFF: "AI 풀이는 아직 준비 중이에요. 지금은 기본 풀이를 보여 드려요.",
  PRODUCT: "이 상품의 AI 풀이는 아직 준비 중이에요.",
  LOCKED: "풀이를 연 뒤에 AI 풀이를 볼 수 있어요.",
  USER_LIMIT: "오늘 만들 수 있는 AI 풀이 수를 다 썼어요. 내일 다시 시도해 주세요.",
  BUDGET: "오늘은 AI 풀이 요청이 많아 잠시 멈췄어요. 내일 다시 시도해 주세요.",
  EXHAUSTED: "AI 풀이를 만들지 못했어요. 기본 풀이를 봐 주세요.",
  HELD: "AI 풀이가 검수에서 보류돼 기본 풀이를 보여 드려요.",
  FAILED: "AI 풀이를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
} as const;
const unavailable = (message: string): AiReadingResponse => ({
  ok: true,
  state: "unavailable",
  message,
});
/** 꺼져 있거나 설정이 모자랄 때의 응답(AI·DB 를 부르지 않음) */
export const aiOffResponse = (): AiReadingResponse => unavailable(MSG.OFF);

/** 저장된 상태 → 보여 줄지. live 는 READY 만, trial 은 차단·실패만 숨긴다. */
function visible(mode: AiConfig["mode"], status: string) {
  return status === "ready" || (mode === "trial" && status === "needs_review");
}
function shape(
  mode: AiConfig["mode"],
  status: string,
  sections: AiSection[],
  review: { verdict?: string } | null,
  name: string | undefined,
): AiReadingResponse {
  if (!visible(mode, status)) return unavailable(MSG.HELD);
  const nm = name?.trim() || undefined;
  return {
    ok: true,
    state: "ready",
    trial: mode === "trial" || status !== "ready",
    reviewed: review?.verdict === "PASS",
    sections: sections.map((s) => ({
      ...s,
      headline: fillName(s.headline, nm),
      body: fillName(s.body, nm),
    })),
  };
}

export async function getAiReading(
  input: { product: ReadingProduct; me: unknown; partner?: unknown },
  userId: string,
  deps: AiDeps,
): Promise<AiReadingResponse> {
  if (!deps.config.ok) return unavailable(MSG.OFF);
  const c = deps.config.config;
  if (input.product !== "basic") return unavailable(MSG.PRODUCT);

  const readingId = unlockIdFor(input.product, input.me, input.partner);
  if (!readingId || !(await isUnlocked(deps.unlockClient, userId, readingId)))
    return unavailable(MSG.LOCKED);

  const ch = chartOf(input.me, deps.today ?? kstToday(), "me", {});
  if (!ch.ok) return { ok: false, error: ch.error };
  const name =
    typeof input.me === "object" && input.me !== null
      ? (input.me as { name?: string }).name
      : undefined;

  const b = await deps.store.begin({
    userId,
    readingId,
    version: versionKey(c),
    userDaily: c.userDaily,
    dailyUsd: c.budget.dailyBudgetUsd,
    reserveUsd: c.reserveUsd,
    staleSeconds: c.staleSeconds,
  });
  if (b.state === "running") return { ok: true, state: "running" };
  if (b.state === "user_limit") return unavailable(MSG.USER_LIMIT);
  if (b.state === "budget") return unavailable(MSG.BUDGET);
  if (b.state === "exhausted") return unavailable(MSG.EXHAUSTED);
  if (b.state === "done" && b.id) {
    const row = await deps.store.read(b.id);
    if (!row?.sections) return unavailable(MSG.HELD);
    return shape(c.mode, row.status, row.sections, row.review, name);
  }
  if (b.state !== "start" || !b.id || !b.attempt) return unavailable(MSG.FAILED);

  // ── 생성 ──
  const { chart, monthTerm, birth } = fromManse(ch.chart.manse);
  const rules = analyzeR002toR005(chart, { monthTerm, birth });
  const interp = buildInterpretation("basic", ch.chart.facts, { rules });
  const plan = buildPlan("basic", interp);
  const writer = new BudgetedLlm(
    deps.writer ? deps.writer(c) : new OpenAiLlm({ apiKey: c.openaiKey, model: c.model }),
    c.budget,
  );
  let cost = 0;
  const done = (
    status: StoredStatus,
    sections: AiSection[] | null,
    review: unknown,
    error: string | null,
  ) =>
    deps.store.finish({
      id: b.id!,
      attempt: b.attempt!,
      status,
      sections,
      review,
      model: c.model,
      costUsd: Math.round(cost * 1e5) / 1e5,
      error,
    });
  try {
    // 이름은 자리표시 그대로 두고(모델·DB 에 이름 없음) 응답할 때만 넣는다
    const r = await (deps.run ?? runReportPipeline)(plan, interp, {
      llm: writer,
      model: c.model,
      allowDraftClaims: c.mode === "trial",
      displayName: "{{이름}}",
    });
    cost += costFromUsage(r.usage, c.budget.pricing);
    if (r.status !== "ok") {
      await done("failed", null, null, r.failure?.code ?? r.status);
      return unavailable(MSG.FAILED);
    }
    let review: ReviewResult | null = null;
    let result = r;
    const reviewer = c.review
      ? deps.reviewer
        ? deps.reviewer(c)
        : new GeminiLlm({ apiKey: c.review.key, model: c.review.model })
      : null;
    if (c.review && reviewer) {
      review = await reviewReport(new BudgetedLlm(reviewer, c.review.budget), interp, r.sections, {
        model: c.review.model,
      });
      cost += costFromUsage(review.usage, c.review.budget.pricing);
      result = applyReview(r, review);
    }
    const status: StoredStatus =
      review?.verdict === "BLOCK"
        ? "blocked"
        : result.reportStatus === "READY"
          ? "ready"
          : "needs_review";
    const sections = r.sections.map((s) => ({
      id: s.id,
      title: s.title,
      headline: s.headline,
      body: s.body,
    }));
    const reviewSummary = review
      ? {
          verdict: review.verdict,
          reasons: review.reasons.slice(0, 10),
          findings: review.findings.slice(0, 20),
          error: review.error ?? null,
        }
      : null;
    await done(status, sections, reviewSummary, null);
    return shape(c.mode, status, sections, reviewSummary, name);
  } catch (e) {
    await done("failed", null, null, (e as { kind?: string })?.kind ?? "UNEXPECTED").catch(
      () => false,
    );
    return unavailable(MSG.FAILED);
  }
}

/** supabase-js(service_role) 로 만든 저장소. 반드시 admin.rpc(...) 메서드 호출 형태를 지킨다(this 소실 방지). */
export interface AiAdminLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  from(table: string): {
    select(cols: string): {
      eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
}
export function supabaseAiStore(admin: AiAdminLike): AiStore {
  return {
    async begin(a) {
      const { data, error } = await admin.rpc("ai_reading_begin", {
        p_user: a.userId,
        p_reading: a.readingId,
        p_version: a.version,
        p_user_daily: a.userDaily,
        p_daily_usd: a.dailyUsd,
        p_reserve_usd: a.reserveUsd,
        p_stale_seconds: a.staleSeconds,
      });
      // 표·함수가 아직 없거나 오류면 시작하지 않는다(fail-closed)
      if (error || !data || typeof data !== "object") return { state: "error" };
      return data as { state: string; id?: string; attempt?: number };
    },
    async finish(a) {
      const { data, error } = await admin.rpc("ai_reading_finish", {
        p_id: a.id,
        p_attempt: a.attempt,
        p_status: a.status,
        p_sections: a.sections,
        p_review: a.review,
        p_model: a.model,
        p_cost_usd: a.costUsd,
        p_error: a.error,
      });
      return !error && data === true;
    },
    async read(id) {
      const { data, error } = await admin
        .from("ai_readings")
        .select("status, sections, review")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return data as {
        status: string;
        sections: AiSection[] | null;
        review: { verdict?: string } | null;
      };
    },
  };
}
