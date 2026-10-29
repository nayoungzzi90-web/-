import { LlmClient, LlmError, LlmRequest, LlmResponse } from './llm';
import type { LlmUsage } from './types';

/**
 * AI 비용 안전장치. 실제 호출 전에 "최악의 경우 비용"을 계산해 상한을 넘으면 호출하지 않는다(fail-closed).
 *  - 가격과 상한은 환경변수로 **반드시** 지정해야 한다(없으면 생성을 시작하지 않는다). 코드에 모델 가격을 박지 않는다.
 *  - 상한: 리포트 1건 / 하루 합계 / 호출 1회의 입력·출력 토큰 / 킬 스위치.
 *  - 한글 토큰 수는 모델마다 다르고 이 환경에서 측정하지 못했으므로, 글자당 토큰 수(tokensPerChar)를 보수적으로(기본 1.5) 잡는다.
 */
export interface Pricing { inPerM: number; outPerM: number; cachedInPerM?: number }
export interface BudgetConfig {
  pricing: Pricing;
  /** 리포트 1건의 최대 원가(USD) */
  maxReportUsd: number;
  /** 하루(한국 시간) 전체 최대 원가(USD) */
  dailyBudgetUsd: number;
  maxInputTokensPerCall: number;
  maxOutputTokensPerCall: number;
  tokensPerChar: number;
}
export type BudgetConfigResult = { ok: true; config: BudgetConfig } | { ok: false; error: string };

const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? NaN : Number(v));
const pos = (n: number) => Number.isFinite(n) && n > 0;

/**
 * 환경변수에서 설정을 읽는다. 필수: LLM_PRICE_IN_PER_M, LLM_PRICE_OUT_PER_M (USD/100만 토큰), LLM_REPORT_BUDGET_USD(또는 상품별 _BASIC/_LOVE_DEEP), LLM_DAILY_BUDGET_USD.
 * 선택: LLM_PRICE_CACHED_IN_PER_M, LLM_MAX_INPUT_TOKENS(기본 40000), LLM_MAX_OUTPUT_TOKENS(기본 4000), LLM_TOKENS_PER_CHAR(기본 1.5), LLM_KILL_SWITCH=true(모든 생성 중단).
 */
export function readBudgetConfig(env: Record<string, string | undefined>, product?: 'basic' | 'love_deep'): BudgetConfigResult {
  if (env['LLM_KILL_SWITCH'] === 'true') return { ok: false, error: 'LLM_DISABLED: AI 생성이 일시 중단돼 있어요(킬 스위치).' };
  const inP = num(env['LLM_PRICE_IN_PER_M']), outP = num(env['LLM_PRICE_OUT_PER_M']);
  if (!pos(inP) || !pos(outP)) return { ok: false, error: 'CONFIG: LLM_PRICE_IN_PER_M / LLM_PRICE_OUT_PER_M 이 필요해요(모델 공식 가격, USD/100만 토큰).' };
  const cachedRaw = num(env['LLM_PRICE_CACHED_IN_PER_M']);
  if (env['LLM_PRICE_CACHED_IN_PER_M'] !== undefined && env['LLM_PRICE_CACHED_IN_PER_M'].trim() !== '' && !pos(cachedRaw)) return { ok: false, error: 'CONFIG: LLM_PRICE_CACHED_IN_PER_M 값이 올바르지 않아요.' };
  const productKey = product === 'basic' ? 'LLM_REPORT_BUDGET_USD_BASIC' : product === 'love_deep' ? 'LLM_REPORT_BUDGET_USD_LOVE_DEEP' : undefined;
  const report = num((productKey ? env[productKey] : undefined) ?? env['LLM_REPORT_BUDGET_USD']);
  const daily = num(env['LLM_DAILY_BUDGET_USD']);
  if (!pos(report)) return { ok: false, error: 'CONFIG: LLM_REPORT_BUDGET_USD 가 필요해요(리포트 1건 원가 상한, USD).' };
  if (!pos(daily)) return { ok: false, error: 'CONFIG: LLM_DAILY_BUDGET_USD 가 필요해요(하루 원가 상한, USD).' };
  if (report > daily) return { ok: false, error: 'CONFIG: 리포트 1건 상한이 하루 상한보다 클 수 없어요.' };
  const maxIn = env['LLM_MAX_INPUT_TOKENS'] ? num(env['LLM_MAX_INPUT_TOKENS']) : 40000;
  const maxOut = env['LLM_MAX_OUTPUT_TOKENS'] ? num(env['LLM_MAX_OUTPUT_TOKENS']) : 4000;
  const tpc = env['LLM_TOKENS_PER_CHAR'] ? num(env['LLM_TOKENS_PER_CHAR']) : 1.5;
  if (!pos(maxIn) || !pos(maxOut) || !pos(tpc)) return { ok: false, error: 'CONFIG: 토큰 상한/글자당 토큰 설정값이 올바르지 않아요.' };
  return { ok: true, config: { pricing: { inPerM: inP, outPerM: outP, ...(pos(cachedRaw) ? { cachedInPerM: cachedRaw } : {}) }, maxReportUsd: report, dailyBudgetUsd: daily, maxInputTokensPerCall: Math.floor(maxIn), maxOutputTokensPerCall: Math.floor(maxOut), tokensPerChar: tpc } };
}

/** 사용량으로 실제 원가(USD). 캐시 기록(쓰기) 토큰은 보수적으로 일반 입력 단가로 센다. */
export function costFromUsage(u: LlmUsage, p: Pricing): number {
  return (u.inputTokens * p.inPerM + u.cacheWriteTokens * p.inPerM + u.cacheReadTokens * (p.cachedInPerM ?? p.inPerM) + u.outputTokens * p.outPerM) / 1_000_000;
}

export const estimateInputTokens = (req: Pick<LlmRequest, 'system' | 'factsBlock' | 'user'>, tokensPerChar: number) =>
  Math.ceil((req.system.length + req.factsBlock.length + req.user.length) * tokensPerChar);

/** 호출 1회의 최악 원가: 입력 전부 비캐시 + 출력 전부 상한까지 */
export const worstCaseCallUsd = (inTokens: number, outTokens: number, p: Pricing) => (inTokens * p.inPerM + outTokens * p.outPerM) / 1_000_000;

/**
 * 어떤 LlmClient 든 감싸서 상한을 강제한다. 호출 전: 입력 크기·리포트 상한·하루 상한 확인, 출력 토큰 상한으로 clamp.
 * 호출 후: 실제 사용량 누적. 출력이 잘린(truncated) 호출은 사용량을 못 받으므로 최악 원가를 누적한다.
 */
export class BudgetedLlm implements LlmClient {
  private spent = 0;
  constructor(private inner: LlmClient, private cfg: BudgetConfig, private spentTodayUsd = 0) {}
  /** 이 리포트에서 지금까지 쓴 원가(USD) */
  get spentUsd() { return this.spent; }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const estIn = estimateInputTokens(req, this.cfg.tokensPerChar);
    if (estIn > this.cfg.maxInputTokensPerCall) throw new LlmError('budget', `INPUT_TOO_LARGE: 입력이 상한(${this.cfg.maxInputTokensPerCall}토큰)을 넘을 것 같아 호출하지 않았어요.`, false);
    const maxTokens = Math.min(req.maxTokens, this.cfg.maxOutputTokensPerCall);
    const worst = worstCaseCallUsd(estIn, maxTokens, this.cfg.pricing);
    if (this.spent + worst > this.cfg.maxReportUsd) throw new LlmError('budget', `REPORT_BUDGET: 리포트 1건 원가 상한($${this.cfg.maxReportUsd})을 넘을 수 있어 호출하지 않았어요.`, false);
    if (this.spentTodayUsd + this.spent + worst > this.cfg.dailyBudgetUsd) throw new LlmError('budget', `DAILY_BUDGET: 오늘 원가 상한($${this.cfg.dailyBudgetUsd})을 넘을 수 있어 호출하지 않았어요.`, false);
    try {
      const res = await this.inner.complete({ ...req, maxTokens });
      this.spent += costFromUsage(res.usage, this.cfg.pricing);
      return res;
    } catch (e) {
      if (e instanceof LlmError && e.kind === 'truncated') this.spent += worst; // 잘린 호출도 출력 상한까지 과금됐을 수 있다
      throw e;
    }
  }
}
