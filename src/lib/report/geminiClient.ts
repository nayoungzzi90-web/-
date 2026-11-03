import { LlmClient, LlmError, LlmRequest, LlmResponse } from './llm';

/**
 * Gemini 구현 — 독립 감수용. 서버에서만 사용한다. 브라우저 번들에 포함하지 않는다.
 * - generateContent + 구조화 출력(responseMimeType=application/json, responseSchema). SDK 없이 fetch 만 쓴다.
 * - 모델명은 코드에 박지 않는다. REVIEW_MODEL 로 지정(공식 모델 목록에서 확인).
 * - 키는 x-goog-api-key 헤더로만 보낸다(주소에 넣지 않아 로그에 남지 않게).
 */
export interface GeminiLlmOptions { apiKey: string; model: string; baseUrl?: string; fetchImpl?: typeof fetch; temperature?: number }

interface GenerateResponse {
  modelVersion?: string;
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string };
}

/** Gemini responseSchema 는 OpenAPI 부분집합이라 additionalProperties·strict 같은 키를 받지 않는다 */
export function toGeminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== 'object') return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (k === 'additionalProperties' || k === '$schema' || k === 'strict') continue;
    out[k] = toGeminiSchema(v);
  }
  return out;
}

export class GeminiLlm implements LlmClient {
  readonly model: string;
  constructor(private opts: GeminiLlmOptions) {
    if (!opts.model) throw new Error('GeminiLlm: model 이 필요해요(REVIEW_MODEL).');
    this.model = opts.model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const f = this.opts.fetchImpl ?? fetch;
    const body = {
      systemInstruction: { parts: [{ text: req.system }, { text: req.factsBlock }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        maxOutputTokens: req.maxTokens,
        temperature: this.opts.temperature ?? 0,
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(req.schema),
      },
    };
    let res: Response;
    try {
      res = await f(`${this.opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'}/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.opts.apiKey },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new LlmError('connection', 'API 연결에 실패했어요.', true, String(e));
    }
    const json = (await res.json().catch(() => ({}))) as GenerateResponse;
    if (!res.ok) {
      const msg = json.error?.message ?? '';
      if (res.status === 401 || res.status === 403) throw new LlmError('auth', 'API 인증에 실패했어요.', false);
      if (res.status === 429) throw new LlmError('rate_limit', '요청 한도에 걸렸어요.', true);
      if (res.status === 400 && /API key/i.test(msg)) throw new LlmError('auth', 'API 키가 올바르지 않아요.', false);
      if (res.status === 400 || res.status === 404) throw new LlmError('bad_request', `요청이 거부됐어요: ${msg}`, false);
      throw new LlmError('server', `API 오류 ${res.status}`, res.status >= 500);
    }
    if (json.promptFeedback?.blockReason) throw new LlmError('refusal', '모델이 요청을 처리하지 않았어요.', false, json.promptFeedback.blockReason);
    const c = json.candidates?.[0];
    if (!c) throw new LlmError('unknown', '응답에 candidates 가 없어요.', false);
    if (c.finishReason === 'SAFETY' || c.finishReason === 'RECITATION' || c.finishReason === 'PROHIBITED_CONTENT') throw new LlmError('refusal', '모델이 요청을 처리하지 않았어요.', false, c.finishReason);
    if (c.finishReason === 'MAX_TOKENS') throw new LlmError('truncated', '출력이 maxOutputTokens 에서 잘렸어요.', true);
    const u = json.usageMetadata ?? {};
    const cached = u.cachedContentTokenCount ?? 0;
    return {
      text: (c.content?.parts ?? []).map((p) => p.text ?? '').join(''),
      model: json.modelVersion ?? this.model,
      stopReason: c.finishReason ?? 'unknown',
      // 생각(thinking) 토큰은 출력 요금으로 청구되므로 출력에 더한다
      usage: { inputTokens: Math.max(0, (u.promptTokenCount ?? 0) - cached), outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0), cacheReadTokens: cached, cacheWriteTokens: 0 },
    };
  }
}
