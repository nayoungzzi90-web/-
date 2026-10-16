import { LlmClient, LlmError, LlmRequest, LlmResponse } from './llm';

/**
 * OpenAI 구현 — 서버(Edge Function)에서만 사용한다. 브라우저 번들에 포함하지 않는다.
 * - Chat Completions + 구조화 출력(json_schema, strict). SDK 없이 fetch 만 쓴다(Deno 호환, 테스트에서 fetch 주입).
 * - 모델명은 코드에 박지 않는다. LLM_MODEL 로 반드시 지정(공식 모델 목록에서 확인).
 * - 시스템 프롬프트 + 사실 블록은 앞쪽에 고정해 OpenAI 자동 프롬프트 캐싱이 먹도록 순서를 지킨다.
 */
export interface OpenAiLlmOptions { apiKey: string; model: string; baseUrl?: string; fetchImpl?: typeof fetch }

interface ChatResponse {
  model?: string;
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
  error?: { message?: string };
}

export class OpenAiLlm implements LlmClient {
  readonly model: string;
  constructor(private opts: OpenAiLlmOptions) {
    if (!opts.model) throw new Error('OpenAiLlm: model 이 필요해요(LLM_MODEL).');
    this.model = opts.model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const f = this.opts.fetchImpl ?? fetch;
    const body = {
      model: this.model,
      max_completion_tokens: req.maxTokens,
      messages: [
        { role: 'system', content: req.system },
        { role: 'system', content: req.factsBlock },
        { role: 'user', content: req.user },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'section', strict: true, schema: req.schema } },
    };
    let res: Response;
    try {
      res = await f(`${this.opts.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.opts.apiKey}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new LlmError('connection', 'API 연결에 실패했어요.', true, String(e));
    }
    const json = (await res.json().catch(() => ({}))) as ChatResponse;
    if (!res.ok) {
      const msg = json.error?.message ?? '';
      if (res.status === 401 || res.status === 403) throw new LlmError('auth', 'API 인증에 실패했어요.', false);
      if (res.status === 429) throw new LlmError('rate_limit', '요청 한도에 걸렸어요.', true);
      if (res.status === 400 || res.status === 404) throw new LlmError('bad_request', `요청이 거부됐어요: ${msg}`, false);
      throw new LlmError('server', `API 오류 ${res.status}`, res.status >= 500);
    }
    const choice = json.choices?.[0];
    if (!choice) throw new LlmError('unknown', '응답에 choices 가 없어요.', false);
    if (choice.message?.refusal || choice.finish_reason === 'content_filter') throw new LlmError('refusal', '모델이 요청을 처리하지 않았어요.', false, choice.message?.refusal ?? 'content_filter');
    if (choice.finish_reason === 'length') throw new LlmError('truncated', '출력이 max_completion_tokens 에서 잘렸어요.', true);
    const u = json.usage ?? {};
    const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      text: choice.message?.content ?? '',
      model: json.model ?? this.model,
      stopReason: choice.finish_reason ?? 'unknown',
      // OpenAI 의 prompt_tokens 는 캐시 적중분을 포함하므로 분리해서 기록한다
      usage: { inputTokens: Math.max(0, (u.prompt_tokens ?? 0) - cached), outputTokens: u.completion_tokens ?? 0, cacheReadTokens: cached, cacheWriteTokens: 0 },
    };
  }
}
