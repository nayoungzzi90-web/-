import { describe, expect, it } from 'vitest';
import { calculate } from '../../../engine/manse/src/engine';
import { toSajuFacts } from '../../../engine/manse/src/adapter';
import { analyzeR002toR005, fromManse } from '../../../engine/saju-rules/src';
import { GeminiLlm, toGeminiSchema } from './geminiClient';
import { buildInterpretation } from './interpretation';
import { LlmClient, LlmError, LlmRequest } from './llm';
import type { DoneSection, PipelineResult } from './pipeline';
import { applyReview, decideVerdict, REVIEW_SCHEMA, reviewReport, type ReviewFinding } from './review';

const r = calculate({ calendar: 'solar', year: 1995, month: 5, day: 17, hour: 14, minute: 0, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
if (!r.ok) throw new Error('engine');
const { chart, monthTerm, birth } = fromManse(r.value);
const facts = buildInterpretation('basic', toSajuFacts(r.value), { rules: analyzeR002toR005(chart, { monthTerm, birth }) });
const claimId = facts.claims.find((c) => c.ruleId === 'SJ-R004-ROOT')!.id;
const sections: DoneSection[] = [
  { id: 's1', title: '나의 큰 그림', headline: '흙 기운이 중심이에요', body: '나영님은 흙 기운이 중심이에요. 같은 흙 기운이 땅 쪽에도 있어 바탕을 받쳐 주는 편이에요. 그래서 버티는 힘이 아주 강해요.', claimIds: [claimId], evidenceIds: [], attempts: 1 },
];

class FakeLlm implements LlmClient {
  seen: LlmRequest[] = [];
  constructor(private reply: string | Error) {}
  async complete(req: LlmRequest) {
    this.seen.push(req);
    if (this.reply instanceof Error) throw this.reply;
    return { text: this.reply, model: 'fake-review', stopReason: 'STOP', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } };
  }
}
const f = (o: Partial<ReviewFinding>): ReviewFinding => ({ sectionId: 's1', quote: 'x', kind: 'UNCLEAR', severity: 'minor', reason: '', ...o });

describe('독립 감수: 판정은 코드가 정한다', () => {
  it('문제 없음 → PASS, 사실과 어긋남·예언·민감(major) → BLOCK, 그 밖의 major 나 가벼운 지적 3개 이상 → REVIEW', () => {
    expect(decideVerdict([]).verdict).toBe('PASS');
    expect(decideVerdict([f({ kind: 'CONTRADICTS_FACT', severity: 'major' })]).verdict).toBe('BLOCK');
    expect(decideVerdict([f({ kind: 'PREDICTION', severity: 'major' })]).verdict).toBe('BLOCK');
    expect(decideVerdict([f({ kind: 'SENSITIVE', severity: 'major' })]).verdict).toBe('BLOCK');
    expect(decideVerdict([f({ kind: 'OVERSTATED', severity: 'major' })]).verdict).toBe('REVIEW');
    expect(decideVerdict([f({ kind: 'CONTRADICTS_FACT', severity: 'minor' })]).verdict).toBe('PASS');
    expect(decideVerdict([f({}), f({}), f({})]).verdict).toBe('REVIEW');
    expect(decideVerdict([], 'auth').verdict).toBe('REVIEW');
  });

  it('감수 모델에는 이름을 보내지 않고, 사실·인용 명제만 보낸다', async () => {
    const llm = new FakeLlm('{"findings":[]}');
    const res = await reviewReport(llm, facts, sections, { displayName: '나영', model: 'fake' });
    expect(res.verdict).toBe('PASS');
    const sent = JSON.stringify(llm.seen[0]);
    expect(sent).not.toContain('나영');
    expect(sent).toContain('{{이름}}');
    expect(llm.seen[0]!.factsBlock).toContain(claimId);
  });

  it('본문에 실제로 있는 문장만 판정에 쓴다(지어낸 인용은 무시)', async () => {
    const reply = JSON.stringify({ findings: [
      { section_id: 's1', quote: '그래서 버티는 힘이 아주 강해요.', kind: 'OVERSTATED', severity: 'major', reason: '뿌리를 힘의 세기로 단정' },
      { section_id: 's1', quote: '반드시 부자가 됩니다.', kind: 'PREDICTION', severity: 'major', reason: '예언' },
    ] });
    const res = await reviewReport(new FakeLlm(reply), facts, sections, { displayName: '나영' });
    expect(res.findings.map((x) => x.kind)).toEqual(['OVERSTATED']);
    expect(res.ignored.map((x) => x.kind)).toEqual(['PREDICTION']);
    expect(res.verdict).toBe('REVIEW');
  });

  it('제목을 "제목: " 접두어째 인용해도 본문 인용으로 인정한다(사실 모순 지적이 버려지지 않게)', async () => {
    const reply = JSON.stringify({ findings: [
      { section_id: 's1', quote: '제목: 흙 기운이 중심이에요', kind: 'CONTRADICTS_FACT', severity: 'major', reason: '사실과 어긋남' },
    ] });
    const res = await reviewReport(new FakeLlm(reply), facts, sections, { displayName: '나영' });
    expect(res.ignored).toEqual([]);
    expect(res.verdict).toBe('BLOCK');
  });

  it('감수 실패·형식 오류는 PASS 가 아니라 REVIEW', async () => {
    expect((await reviewReport(new FakeLlm(new LlmError('auth', 'x', false)), facts, sections)).verdict).toBe('REVIEW');
    expect((await reviewReport(new FakeLlm('형식 아님'), facts, sections)).verdict).toBe('REVIEW');
  });

  it('감수가 PASS 가 아니면 READY 를 NEEDS_REVIEW 로 내리고, 더 올리지는 않는다', () => {
    const base = { reportStatus: 'READY', reviewReasons: [] } as unknown as PipelineResult;
    const review = { verdict: 'BLOCK', reasons: ['r'] } as never;
    expect(applyReview(base, review).reportStatus).toBe('NEEDS_REVIEW');
    expect(applyReview({ ...base, reportStatus: 'NEEDS_REVIEW' }, { verdict: 'PASS', reasons: [] } as never).reportStatus).toBe('NEEDS_REVIEW');
  });
});

describe('Gemini 클라이언트', () => {
  it('키는 헤더로만 보내고, 스키마에서 Gemini 가 받지 않는 키를 뺀다', async () => {
    let url = ''; let init: RequestInit = {};
    const fetchImpl = (async (u: string, i: RequestInit) => {
      url = u; init = i;
      return new Response(JSON.stringify({ modelVersion: 'g-test', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"findings":[]}' }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 5 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const llm = new GeminiLlm({ apiKey: 'KEY', model: 'g-test', fetchImpl });
    const res = await llm.complete({ system: 's', factsBlock: 'f', user: 'u', maxTokens: 100, schema: REVIEW_SCHEMA });
    expect(url).not.toContain('KEY');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY');
    expect(JSON.stringify(JSON.parse(String(init.body)).generationConfig.responseSchema)).not.toContain('additionalProperties');
    expect(res.usage.outputTokens).toBe(15);
    expect(JSON.stringify(toGeminiSchema(REVIEW_SCHEMA))).not.toContain('additionalProperties');
  });
  it('키 오류·안전 차단을 오류 종류로 바꾼다', async () => {
    const mk = (status: number, body: object) => new GeminiLlm({ apiKey: 'k', model: 'm', fetchImpl: (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch });
    await expect(mk(400, { error: { message: 'API key not valid.' } }).complete({ system: '', factsBlock: '', user: '', maxTokens: 1, schema: {} })).rejects.toMatchObject({ kind: 'auth' });
    await expect(mk(200, { candidates: [{ finishReason: 'SAFETY' }] }).complete({ system: '', factsBlock: '', user: '', maxTokens: 1, schema: {} })).rejects.toMatchObject({ kind: 'refusal' });
    await expect(mk(429, {}).complete({ system: '', factsBlock: '', user: '', maxTokens: 1, schema: {} })).rejects.toMatchObject({ kind: 'rate_limit', retryable: true });
  });
});
