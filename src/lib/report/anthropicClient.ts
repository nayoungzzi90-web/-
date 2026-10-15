import Anthropic from '@anthropic-ai/sdk';
import { LlmClient, LlmError, LlmRequest, LlmResponse } from './llm';

/**
 * Claude 구현 — 서버(Edge Function)에서만 사용한다. 브라우저 번들에 포함하지 않는다.
 * - 모델 기본값 claude-opus-5-5. temperature 등 샘플링 파라미터는 보내지 않는다(이 모델은 400).
 * - thinking 은 생략(항상 켜짐). 깊이는 output_config.effort 로 조절(기본 medium).
 * - 사실 블록에 cache_control 을 걸어 섹션 호출 사이에 입력 토큰을 재사용한다.
 * - 안전 분류기 거절(stop_reason: refusal)은 서버 측 fallbacks("default")로 한 번 더 시도한다.
 */
export interface AnthropicLlmOptions { client: Anthropic; model?: string; effort?: 'low' | 'medium' | 'high'; fallbacks?: boolean }

export class AnthropicLlm implements LlmClient {
  readonly model: string;
  constructor(private opts: AnthropicLlmOptions) { this.model = opts.model ?? 'claude-opus-5-5'; }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const params = {
      model: this.model,
      max_tokens: req.maxTokens,
      system: [
        { type: 'text', text: req.system },
        { type: 'text', text: req.factsBlock, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: req.user }],
      output_config: { effort: this.opts.effort ?? 'medium', format: { type: 'json_schema', schema: req.schema } },
    };
    try {
      const res = (this.opts.fallbacks !== false
        ? await this.opts.client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)
        : await this.opts.client.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming)) as Anthropic.Message;

      if (res.stop_reason === 'refusal') {
        const cat = (res as unknown as { stop_details?: { category?: string | null } }).stop_details?.category ?? null;
        throw new LlmError('refusal', '모델이 요청을 처리하지 않았어요.', false, String(cat));
      }
      if (res.stop_reason === 'max_tokens') throw new LlmError('truncated', '출력이 max_tokens 에서 잘렸어요.', true);
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const u = res.usage;
      return {
        text, model: res.model, stopReason: res.stop_reason ?? 'unknown',
        usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: u.cache_read_input_tokens ?? 0, cacheWriteTokens: u.cache_creation_input_tokens ?? 0 },
      };
    } catch (e) {
      if (e instanceof LlmError) throw e;
      // 가장 구체적인 것부터: 재시도 가능(429/5xx/연결)과 불가(400/401/404)를 구분
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new LlmError('auth', 'API 인증에 실패했어요.', false);
      if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.NotFoundError) throw new LlmError('bad_request', `요청이 거부됐어요: ${e.message}`, false);
      if (e instanceof Anthropic.RateLimitError) throw new LlmError('rate_limit', '요청 한도에 걸렸어요.', true);
      if (e instanceof Anthropic.APIConnectionError) throw new LlmError('connection', 'API 연결에 실패했어요.', true);
      if (e instanceof Anthropic.APIError) throw new LlmError('server', `API 오류 ${e.status}`, (e.status ?? 500) >= 500);
      throw new LlmError('unknown', String(e), false);
    }
  }
}
