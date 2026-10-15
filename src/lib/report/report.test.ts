import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { calculator } from '../saju/sampleCalculator';
import type { BirthInput } from '../saju/types';
import { AnthropicLlm } from './anthropicClient';
import { buildCompatInterpretation, buildInterpretation } from './interpretation';
import { estimateCostUsd, LlmError, ScriptedLlm } from './llm';
import { runReportPipeline } from './pipeline';
import { buildPlan } from './plan';
import { buildFactsBlock, buildSectionPrompt, buildSystemPrompt } from './prompt';
import { checkReport, checkSection, countChars } from './qa';
import type { InterpretationFacts, ReportPlan, SectionPlan } from './types';

const input: BirthInput = { calendar: 'solar', leapMonth: false, year: 1995, month: 5, day: 17, hour: 14, minute: 0, timeUnknown: false, country: 'KR', alias: '나영' };
const facts = calculator.calculate(input);
const years = [2026, 2027, 2028, 2029, 2030];
const basicF = buildInterpretation('basic', facts);
const loveF = buildInterpretation('love_deep', facts, { gender: 'F', years, yearPillar: (y) => calculator.yearPillar(y) });
const basicPlan = buildPlan('basic', basicF);
const lovePlan = buildPlan('love_deep', loveF);

/** QA 를 통과하는 "좋은 작가" 흉내: 섹션의 우선 사실 줄을 풀어 쓰고, 부족분은 서로 겹치지 않는 문장으로 채운다 */
const WORDS = '바람 구름 호수 마당 아침 저녁 계절 골목 시냇물 나무 등불 지붕 대문 언덕 노을 새벽 이슬 햇살 달빛 들판 돌담 장독 우물 다리 오솔길 처마 기와 솥뚜껑 풍경 버드나무 감나무 매화 국화 난초 대나무 소나무 연못 징검다리 서까래 마루 아궁이 부뚜막 항아리 베개 이불 창호지 문고리 댓돌'.split(' ');
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246289909) >>> 0) / 4294967296); }
function goodBody(f: InterpretationFacts, plan: ReportPlan, section: SectionPlan, extra = ''): { body: string; evidence_ids: string[]; used_fact_ids: string[] } {
  // 실제 모델은 풀어 쓰지만, 가짜 작가는 같은 줄을 여러 섹션에 복사하지 않도록 "처음 맡은 섹션"에서만 쓴다
  const owner = (l: { tags: string[] }) => plan.sections.findIndex((p) => p.focusTags.some((t) => l.tags.includes(t)));
  const idx = plan.sections.findIndex((p) => p.id === section.id);
  const primary = f.lines.filter((l) => l.tags.some((t) => section.focusTags.includes(t)));
  const owned = primary.filter((l) => owner(l) === idx);
  const anchors = [...new Set(primary.flatMap((l) => l.anchors))].slice(0, 4);
  const r = rng(plan.product + section.id);
  const trim = (t: string) => { const ss = t.split(/(?<=[.!?])\s+/); while (ss.length > 1 && countChars(ss.join(' ')) > section.maxChars * 0.9) ss.pop(); return ss.join(' '); };
  let body = trim(owned.map((l) => l.text).join(' ')) + ` ${section.title}을(를) 풀 때는 ${anchors.join(', ')}을(를) 먼저 떠올려 보면 쉬워요. ` + extra;
  if (plan.years && section.focusTags.includes('yearly')) body += plan.years.map((y) => `${y}년 이야기예요.`).join(' ');
  while (countChars(body) < section.targetChars) body += ` ${Array.from({ length: 6 }, () => WORDS[Math.floor(r() * WORDS.length)]).join(' ')} 같은 장면으로 떠올려 보면 쉬워요.`;
  // 같은 문장은 한 번만
  const seenSen = new Set<string>();
  body = body.split(/(?<=[.!?])\s+/).filter((x) => { const k = x.replace(/\s/g, ''); if (seenSen.has(k)) return false; seenSen.add(k); return true; }).join(' ');
  const used = primary.length ? primary : f.lines.slice(0, 2);
  return { body, evidence_ids: [...new Set(used.flatMap((l) => l.evidenceIds))], used_fact_ids: used.map((l) => l.id) };
}
const sectionOf = (req: { user: string }, plan: ReportPlan) => plan.sections.find((s) => req.user.includes(`지금 쓸 섹션: ${s.title}`))!;
const good = (f = basicF, plan = basicPlan) => (req: { user: string }) => JSON.stringify(goodBody(f, plan, sectionOf(req, plan)));
const opts = (llm: ScriptedLlm) => ({ llm, model: 'claude-opus-5-5', sleep: async () => {} });

describe('해석 규칙 엔진', () => {
  it('같은 입력이면 같은 사실 줄(결정론)', () => {
    expect(buildInterpretation('basic', facts)).toEqual(buildInterpretation('basic', calculator.calculate(input)));
  });
  it('기본사주: 핵심 사실 줄과 근거가 모두 존재', () => {
    const ids = basicF.lines.map((l) => l.id);
    for (const id of ['core', 'balance', 'gods', 'month_stem', 'power', 'season', 'relations']) expect(ids).toContain(id);
    // 모든 줄의 evidence_ids 는 실제 존재하는 근거
    const ev = new Set(basicF.evidence.map((e) => e.id));
    basicF.lines.forEach((l) => l.evidenceIds.forEach((e) => expect(ev.has(e)).toBe(true)));
    expect(basicF.allowedGanji).toEqual(expect.arrayContaining([facts.pillars.year, facts.pillars.month, facts.pillars.day, facts.pillars.hour]));
  });
  it('연애운: 연속 5개 연도 세운 줄과 허용 간지', () => {
    for (const y of years) expect(loveF.lines.some((l) => l.id === `year_${y}`)).toBe(true);
    expect(loveF.allowedGanji).toContain(calculator.yearPillar(2028));
    expect(loveF.lines.some((l) => l.id === 'luck_missing')).toBe(true); // 대운 미제공을 지어내지 않도록 명시
    expect(loveF.lines.find((l) => l.id === 'love_palace')!.text).toContain('일지');
  });
  it('시간 미상이면 시주 없음이 사실 줄에 명시', () => {
    const f2 = buildInterpretation('basic', calculator.calculate({ ...input, timeUnknown: true, hour: undefined }));
    expect(f2.lines[0].text).toContain('시주는 없어요');
    expect(f2.subjects[0].hourKnown).toBe(false);
  });
  it('궁합: 두 사람 관계 사실 줄', () => {
    const b = calculator.calculate({ ...input, year: 1993, month: 3, day: 9 });
    const cf = buildCompatInterpretation(facts, b);
    for (const id of ['dm_rel', 'branch_rel', 'month_rel', 'complement', 'a_love', 'b_love']) expect(cf.lines.map((l) => l.id)).toContain(id);
    expect(cf.subjects.map((s) => s.key)).toEqual(['A', 'B']);
  });
});

describe('프롬프트', () => {
  it('규칙 포함, 개인 식별 정보(별칭·생년월일)는 미포함', () => {
    const all = buildSystemPrompt(basicPlan) + buildFactsBlock(basicF) + buildSectionPrompt(basicPlan, basicPlan.sections[0], basicF, []);
    expect(all).toContain('반드시');
    expect(all).toContain('시주');
    expect(all).not.toMatch(/나영|1995|0517|출생일/);
  });
  it('섹션 호출 간 system·사실 블록이 동일(캐시 가능)', async () => {
    const llm = new ScriptedLlm(good());
    await runReportPipeline(basicPlan, basicF, opts(llm));
    expect(new Set(llm.calls.map((c) => c.system)).size).toBe(1);
    expect(new Set(llm.calls.map((c) => c.factsBlock)).size).toBe(1);
  });
});

describe('QA 검사기', () => {
  const sec = basicPlan.sections[1];
  const ctx = { facts: basicF, plan: basicPlan };
  const base = goodBody(basicF, basicPlan, sec);
  const codes = (body: string, ev = base.evidence_ids) => checkSection(body, ev, sec, ctx).map((i) => i.code);
  it('정상 본문은 통과', () => expect(checkSection(base.body, base.evidence_ids, sec, ctx).filter((i) => i.severity === 'fail')).toEqual([]));
  it('제공되지 않은 간지', () => expect(codes(base.body + ' 갑자가 들어오는 해라고 해요 甲子.')).toContain('GANJI_MISMATCH'));
  it('단정 예언 / 의학 / 점수', () => {
    expect(codes(base.body + ' 반드시 결혼하게 됩니다.')).toContain('PROPHECY');
    expect(codes(base.body + ' 우울증 진단이 필요해요.')).toContain('MEDICAL');
    expect(codes(base.body + ' 궁합 점수는 92점이에요.')).toContain('SCORE');
    expect(codes(base.body + ' 성공 확률 100% 예요.')).toEqual(expect.arrayContaining(['PROPHECY', 'SCORE']));
  });
  it('분량 부족·초과, 근거 없음, 알 수 없는 근거', () => {
    expect(codes('짧아요.')).toContain('LENGTH_SHORT');
    expect(codes(base.body + base.body)).toContain('LENGTH_LONG');
    expect(codes(base.body, [])).toContain('EVIDENCE_EMPTY');
    expect(codes(base.body, ['nope'])).toContain('EVIDENCE_UNKNOWN');
  });
  it('일반론(사실 표지 없음)', () => {
    const generic = '사람은 누구나 장점과 단점이 있어요. 매일 조금씩 노력하면 좋아져요. 주변 사람과 대화를 많이 해 보세요. '.repeat(12);
    expect(codes(generic)).toContain('TOO_GENERIC');
  });
  it('시주: 모르는데 단정하면 반려, 모른다고 말하면 통과', () => {
    const nf = buildInterpretation('basic', calculator.calculate({ ...input, timeUnknown: true, hour: undefined }));
    const np = buildPlan('basic', nf);
    const c = { facts: nf, plan: np };
    const nb = goodBody(nf, np, np.sections[1]);
    expect(checkSection(nb.body + ' 시주는 甲子라서 말년이 좋아요.', nb.evidence_ids, np.sections[1], c).map((i) => i.code)).toContain('HOUR_PILLAR');
    expect(checkSection(nb.body + ' 출생 시간을 몰라 시주는 해석하지 않았어요.', nb.evidence_ids, np.sections[1], c).map((i) => i.code)).not.toContain('HOUR_PILLAR');
  });
  it('연애운: 5개 연도 모두 필요, 범위 밖 연도 반려', () => {
    const ys = lovePlan.sections.find((s) => s.focusTags.includes('yearly'))!;
    const c = { facts: loveF, plan: lovePlan };
    const g = goodBody(loveF, lovePlan, ys);
    expect(checkSection(g.body, g.evidence_ids, ys, c).filter((i) => i.severity === 'fail')).toEqual([]);
    expect(checkSection(g.body.replace(/2029년/g, ''), g.evidence_ids, ys, c).map((i) => i.code)).toContain('YEAR_MISSING');
    expect(checkSection(g.body + ' 2035년도 좋아요.', g.evidence_ids, ys, c).map((i) => i.code)).toContain('YEAR_OUT_OF_RANGE');
  });
  it('섹션 간 같은 문장·거의 같은 내용', () => {
    const s = basicPlan.sections.map((p) => ({ id: p.id, title: p.title, body: goodBody(basicF, basicPlan, p).body }));
    expect(checkReport(s, basicPlan).filter((i) => i.severity === 'fail')).toEqual([]);
    const dup = s.map((x, i) => (i === 3 ? { ...x, body: s[2].body } : x));
    expect(checkReport(dup, basicPlan).map((i) => i.code)).toEqual(expect.arrayContaining(['DUP_SENTENCE', 'DUP_SECTION']));
  });
  it('목차 누락', () => expect(checkReport([], basicPlan).map((i) => i.code)).toContain('TOC'));
});

describe('생성 파이프라인 (가짜 LLM)', () => {
  it('기본사주: 섹션 6회 호출로 성공, 분량 범위 충족, 사용량·원가 집계', async () => {
    const llm = new ScriptedLlm(good());
    const r = await runReportPipeline(basicPlan, basicF, opts(llm));
    expect(r.status).toBe('ok');
    expect(r.calls).toBe(6);
    const total = r.sections.reduce((n, s) => n + countChars(s.body), 0);
    expect(total).toBeGreaterThanOrEqual(basicPlan.totalRange[0]);
    expect(total).toBeLessThanOrEqual(basicPlan.totalRange[1]);
    expect(r.usage.inputTokens).toBe(6000);
    expect(r.costUsd).toBeGreaterThan(0);
  });
  it('심층 연애운: 4,000~5,000자, 5개 연도 포함', async () => {
    const llm = new ScriptedLlm(good(loveF, lovePlan));
    const r = await runReportPipeline(lovePlan, loveF, opts(llm));
    expect(r.status).toBe('ok');
    const total = r.sections.reduce((n, s) => n + countChars(s.body), 0);
    expect(total).toBeGreaterThanOrEqual(4000);
    expect(total).toBeLessThanOrEqual(5000);
    const yearly = r.sections.find((s) => s.title.includes('세운'))!;
    years.forEach((y) => expect(yearly.body).toContain(`${y}년`));
  });
  it('반려되면 사유를 프롬프트에 담아 같은 섹션만 재시도', async () => {
    const llm = new ScriptedLlm((req, i) => (i === 1 ? JSON.stringify({ body: '짧아요.', evidence_ids: ['pillars'], used_fact_ids: [] }) : good()(req)));
    const r = await runReportPipeline(basicPlan, basicF, opts(llm));
    expect(r.status).toBe('ok');
    expect(r.calls).toBe(7);
    expect(llm.calls[2].user).toContain('직전 시도가 자동 검수에서 반려');
    expect(llm.calls[2].user).toContain('분량이 부족');
    expect(r.sections[1].attempts).toBe(2);
  });
  it('모델이 시주를 지어내면 반려 후 고쳐 쓴다', async () => {
    const noHourFacts = buildInterpretation('basic', calculator.calculate({ ...input, timeUnknown: true, hour: undefined }));
    const plan = buildPlan('basic', noHourFacts);
    const llm = new ScriptedLlm((req, i) => {
      const b = goodBody(noHourFacts, plan, sectionOf(req, plan), i === 0 ? ' 시주는 甲子라서 말년이 든든해요.' : '');
      return JSON.stringify(b);
    });
    const r = await runReportPipeline(plan, noHourFacts, opts(llm));
    expect(r.status).toBe('ok');
    expect(r.issues.some((i) => i.code === 'HOUR_PILLAR')).toBe(true);
    expect(r.sections.every((s) => !/시주는 甲子/.test(s.body))).toBe(true);
  });
  it('계속 잘못된 JSON 이면 시도 횟수 후 실패(무한 재시도 없음)', async () => {
    const llm = new ScriptedLlm(() => '이건 JSON 이 아니에요');
    const r = await runReportPipeline(basicPlan, basicF, opts(llm));
    expect(r.status).toBe('failed');
    expect(r.failure?.code).toBe('QA_FAILED');
    expect(r.calls).toBe(3);
  });
  it('인증 오류·거절은 재시도하지 않고 즉시 실패', async () => {
    const a = await runReportPipeline(basicPlan, basicF, opts(new ScriptedLlm(() => new LlmError('auth', 'x', false))));
    expect(a.failure?.code).toBe('AUTH'); expect(a.calls).toBe(1);
    const b = await runReportPipeline(basicPlan, basicF, opts(new ScriptedLlm(() => new LlmError('refusal', 'x', false))));
    expect(b.failure?.code).toBe('REFUSAL'); expect(b.calls).toBe(1);
  });
  it('일시 오류(429)는 백오프 후 재시도해 성공', async () => {
    let waited = 0;
    const llm = new ScriptedLlm((req, i) => (i < 2 ? new LlmError('rate_limit', 'x', true) : good()(req)));
    const r = await runReportPipeline(basicPlan, basicF, { llm, model: 'claude-opus-5-5', sleep: async (ms) => { waited += ms; } });
    expect(r.status).toBe('ok');
    expect(waited).toBe(500 + 1000);
  });
  it('호출 상한(원가 폭주 방지)', async () => {
    const llm = new ScriptedLlm(() => '{}');
    const r = await runReportPipeline(basicPlan, basicF, { ...opts(llm), maxCalls: 2 });
    expect(r.failure?.code).toBe('CALL_BUDGET');
    expect(r.calls).toBe(2);
  });
  it('섹션 간 중복은 전체 검수에서 잡아 해당 섹션만 재생성', async () => {
    const s3 = basicPlan.sections[2], s4 = basicPlan.sections[3];
    const seen: Record<string, number> = {};
    const llm = new ScriptedLlm((req) => {
      const s = sectionOf(req, basicPlan); seen[s.id] = (seen[s.id] ?? 0) + 1;
      const own = goodBody(basicF, basicPlan, s);
      // s4 첫 시도: 섹션 QA 는 통과하지만 s3 문장을 그대로 복사한 본문
      if (s.id === s4.id && seen[s.id] === 1) return JSON.stringify({ ...own, body: goodBody(basicF, basicPlan, s3).body + ' ' + own.body.split(/(?<=[.!?])\s+/)[0] });
      return JSON.stringify(own);
    });
    const r = await runReportPipeline(basicPlan, basicF, opts(llm));
    expect(r.status).toBe('ok');
    expect(r.issues.some((i) => i.message.includes('[전체 검수]') && i.code === 'DUP_SENTENCE')).toBe(true);
    expect(seen[s4.id]).toBe(2); // 문제 섹션만 다시 호출
    expect(seen[s3.id]).toBe(1);
    expect(r.calls).toBe(7);
  });
});

describe('원가 계산', () => {
  it('입력·출력·캐시 토큰별 단가로 계산, 모르는 모델은 null', () => {
    const u = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 };
    expect(estimateCostUsd(u, 'claude-opus-5-5')).toBeCloseTo(4 + 20 + 0.2);
    expect(estimateCostUsd(u, 'claude-sonnet-5-5')).toBeCloseTo(2 + 10 + 0.2);
    expect(estimateCostUsd(u, 'unknown')).toBeNull();
  });
});

describe('AnthropicLlm 요청 형태 (가짜 SDK)', () => {
  const mkRes = (over: Record<string, unknown> = {}) => ({ model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '{"body":"x"}' }], usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 }, ...over });
  const fake = (impl: (p: Record<string, unknown>) => unknown) => {
    const seen: Record<string, unknown>[] = [];
    const call = async (p: Record<string, unknown>) => { seen.push(p); return impl(p); };
    return { seen, client: { beta: { messages: { create: call } }, messages: { create: call } } as unknown as Anthropic };
  };
  const req = { system: 'S', factsBlock: 'F', user: 'U', maxTokens: 123, schema: { type: 'object' } };
  it('모델·effort·구조화 출력·캐시·fallbacks 를 보내고 sampling 파라미터는 보내지 않음', async () => {
    const f = fake(() => mkRes());
    const r = await new AnthropicLlm({ client: f.client }).complete(req);
    const p = f.seen[0] as Record<string, any>;
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.max_tokens).toBe(123);
    expect(p.temperature).toBeUndefined(); expect(p.top_p).toBeUndefined(); expect(p.thinking).toBeUndefined();
    expect(p.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: { type: 'object' } } });
    expect(p.system[1]).toEqual({ type: 'text', text: 'F', cache_control: { type: 'ephemeral' } });
    expect(p.fallbacks).toBe('default'); expect(p.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cacheReadTokens: 3, cacheWriteTokens: 2 });
  });
  it('fallbacks 끄면 일반 messages 경로', async () => {
    const f = fake(() => mkRes());
    await new AnthropicLlm({ client: f.client, fallbacks: false, model: 'claude-sonnet-5-5', effort: 'low' }).complete(req);
    expect((f.seen[0] as any).fallbacks).toBeUndefined();
    expect((f.seen[0] as any).model).toBe('claude-sonnet-5-5');
  });
  it('거절·잘림·HTTP 오류를 구분해 변환', async () => {
    const run = (impl: () => unknown) => new AnthropicLlm({ client: fake(impl as never).client }).complete(req).catch((e) => e as LlmError);
    expect(await run(() => mkRes({ stop_reason: 'refusal', stop_details: { category: 'cyber' } }))).toMatchObject({ kind: 'refusal', retryable: false });
    expect(await run(() => mkRes({ stop_reason: 'max_tokens' }))).toMatchObject({ kind: 'truncated', retryable: true });
    const gen = (s: number) => () => { throw Anthropic.APIError.generate(s, { error: { message: 'x' } }, 'x', new Headers()); };
    expect(await run(gen(429))).toMatchObject({ kind: 'rate_limit', retryable: true });
    expect(await run(gen(401))).toMatchObject({ kind: 'auth', retryable: false });
    expect(await run(gen(400))).toMatchObject({ kind: 'bad_request', retryable: false });
    expect(await run(gen(503))).toMatchObject({ kind: 'server', retryable: true });
  });
});

import { invokeGenerateReport, RemoteError } from './remote';
import { parsePasted } from '../../pages/Lab';
describe('원격 호출 클라이언트·실험실 파서', () => {
  const base = { baseUrl: 'https://x.supabase.co/', accessToken: 'jwt', anonKey: 'anon', entitlementId: 'e1' };
  it('토큰만 보내고 202/200 을 반환, 오류는 코드와 재시도 여부를 보존', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const ok = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ status: 'running', job_id: 'j1' }), { status: 202 }); }) as unknown as typeof fetch;
    expect(await invokeGenerateReport({ ...base, fetchImpl: ok })).toEqual({ status: 'running', job_id: 'j1' });
    expect(seen!.url).toBe('https://x.supabase.co/functions/v1/generate-report');
    expect(JSON.stringify(seen!.init.headers)).not.toMatch(/service_role|ANTHROPIC/i);
    const bad = (async () => new Response(JSON.stringify({ error_code: 'ATTEMPTS_EXHAUSTED', message: 'm', retryable: false }), { status: 409 })) as unknown as typeof fetch;
    await expect(invokeGenerateReport({ ...base, fetchImpl: bad })).rejects.toMatchObject({ code: 'ATTEMPTS_EXHAUSTED', retryable: false });
    await expect(invokeGenerateReport({ ...base, fetchImpl: (async () => new Response('', { status: 503 })) as unknown as typeof fetch })).rejects.toBeInstanceOf(RemoteError);
  });
  it('실험실: "## 제목" 형식 파싱(번호·공백 허용)', () => {
    const p = parsePasted('## 원국 핵심\n첫 본문\n\n## 2. 타고난 성격·기질\n둘째 본문\n### 강점·재능\n셋째');
    expect(Object.keys(p)).toEqual(['원국 핵심', '타고난 성격·기질', '강점·재능']);
    expect(p['원국 핵심'].trim()).toBe('첫 본문');
  });
});
