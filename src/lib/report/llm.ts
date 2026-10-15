import type { LlmUsage } from './types';

export interface LlmRequest { system: string; factsBlock: string; user: string; maxTokens: number; schema: object }
export interface LlmResponse { text: string; usage: LlmUsage; model: string; stopReason: string }

export type LlmErrorKind = 'rate_limit' | 'auth' | 'bad_request' | 'server' | 'connection' | 'refusal' | 'truncated' | 'unknown';
export class LlmError extends Error {
  constructor(public kind: LlmErrorKind, message: string, public retryable: boolean, public detail?: string) { super(message); }
}

/** 공급자에 독립적인 인터페이스. 파이프라인과 QA 는 이 인터페이스만 안다. */
export interface LlmClient { complete(req: LlmRequest): Promise<LlmResponse> }

export const zeroUsage = (): LlmUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
export const addUsage = (a: LlmUsage, b: LlmUsage): LlmUsage => ({
  inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens, cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

/** 가격표(USD / 100만 토큰). 공식 가격표(2026-10-06 캐시 기준)에서 옮긴 값이며 운영 전 반드시 최신 가격으로 다시 확인한다. */
export const PRICING_VERIFIED_AT = '2026-10-06';
export const PRICING: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

/** 건당 원가 = 입력/1M×입력단가 + 출력/1M×출력단가 + 캐시 읽기/쓰기. 모르는 모델은 null(원가 미상으로 기록). */
export function estimateCostUsd(u: LlmUsage, model: string): number | null {
  const p = PRICING[model];
  if (!p) return null;
  return (u.inputTokens * p.in + u.outputTokens * p.out + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) / 1_000_000;
}

/** 테스트·샌드박스용: 호출 순서대로 미리 정한 응답(또는 오류)을 돌려준다 */
export class ScriptedLlm implements LlmClient {
  calls: LlmRequest[] = [];
  constructor(private script: (req: LlmRequest, index: number) => string | Error | { text: string; usage?: Partial<LlmUsage>; stopReason?: string }, public model = 'scripted') {}
  async complete(req: LlmRequest): Promise<LlmResponse> {
    const i = this.calls.push(req) - 1;
    const r = this.script(req, i);
    if (r instanceof Error) throw r;
    const text = typeof r === 'string' ? r : r.text;
    const usage = { ...zeroUsage(), inputTokens: 1000, outputTokens: Math.ceil(text.length / 1.5), ...(typeof r === 'string' ? {} : r.usage) };
    return { text, usage, model: this.model, stopReason: typeof r === 'string' ? 'end_turn' : r.stopReason ?? 'end_turn' };
  }
}
