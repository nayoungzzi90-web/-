import { describe, expect, it } from 'vitest';
import { calculator } from '../saju/sampleCalculator';
import type { BirthInput } from '../saju/types';
import { BudgetedLlm, costFromUsage, estimateInputTokens, readBudgetConfig, worstCaseCallUsd, type BudgetConfig } from './budget';
import { buildInterpretation } from './interpretation';
import { LlmError, ScriptedLlm } from './llm';
import { runReportPipeline } from './pipeline';
import { buildPlan } from './plan';
import { usableClaims } from './claims';
import type { Claim, InterpretationFacts, ReportPlan, SectionPlan } from './types';
import { countChars, JARGON } from './qa';

const ENV = { LLM_PRICE_IN_PER_M: '2', LLM_PRICE_OUT_PER_M: '10', LLM_REPORT_BUDGET_USD: '0.5', LLM_DAILY_BUDGET_USD: '5' };
const cfg = (over: Partial<BudgetConfig> = {}): BudgetConfig => ({ pricing: { inPerM: 2, outPerM: 10 }, maxReportUsd: 0.5, dailyBudgetUsd: 5, maxInputTokensPerCall: 40000, maxOutputTokensPerCall: 4000, tokensPerChar: 1.5, ...over });
const req = (n = 100, maxTokens = 8000) => ({ system: 'S'.repeat(n), factsBlock: 'F'.repeat(n), user: 'U'.repeat(n), maxTokens, schema: {} });

describe('readBudgetConfig (환경변수, 없으면 생성 시작 금지)', () => {
  it('필수값이 모두 있으면 읽는다(기본 토큰 상한 40000/4000, 글자당 1.5)', () => {
    const r = readBudgetConfig(ENV);
    expect(r).toEqual({ ok: true, config: { pricing: { inPerM: 2, outPerM: 10 }, maxReportUsd: 0.5, dailyBudgetUsd: 5, maxInputTokensPerCall: 40000, maxOutputTokensPerCall: 4000, tokensPerChar: 1.5 } });
  });
  it('가격·상한이 하나라도 없거나 이상하면 실패(fail-closed)', () => {
    for (const k of Object.keys(ENV)) {
      const e: Record<string, string | undefined> = { ...ENV };
      delete e[k];
      expect(readBudgetConfig(e).ok, `${k} 없음`).toBe(false);
    }
    for (const bad of ['0', '-1', 'abc', '', 'NaN', 'Infinity']) expect(readBudgetConfig({ ...ENV, LLM_PRICE_IN_PER_M: bad }).ok, `가격 ${bad}`).toBe(false);
    expect(readBudgetConfig({ ...ENV, LLM_REPORT_BUDGET_USD: '9' }).ok).toBe(false); // 리포트 상한 > 하루 상한
    expect(readBudgetConfig({ ...ENV, LLM_PRICE_CACHED_IN_PER_M: 'x' }).ok).toBe(false);
    expect(readBudgetConfig({ ...ENV, LLM_MAX_OUTPUT_TOKENS: '0' }).ok).toBe(false);
  });
  it('킬 스위치가 켜지면 다른 설정이 완벽해도 중단', () => {
    const r = readBudgetConfig({ ...ENV, LLM_KILL_SWITCH: 'true' });
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain('LLM_DISABLED');
    expect(readBudgetConfig({ ...ENV, LLM_KILL_SWITCH: 'false' }).ok).toBe(true);
  });
  it('상품별 리포트 상한이 공통 값보다 우선', () => {
    const e = { ...ENV, LLM_REPORT_BUDGET_USD_LOVE_DEEP: '1.2', LLM_DAILY_BUDGET_USD: '10' };
    expect((readBudgetConfig(e, 'love_deep') as { config: BudgetConfig }).config.maxReportUsd).toBe(1.2);
    expect((readBudgetConfig(e, 'basic') as { config: BudgetConfig }).config.maxReportUsd).toBe(0.5);
  });
});

describe('원가 계산', () => {
  it('사용량 → USD (캐시 읽기는 캐시 단가, 캐시 쓰기는 일반 입력 단가)', () => {
    const u = { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 500_000, cacheWriteTokens: 100_000 };
    expect(costFromUsage(u, { inPerM: 2, outPerM: 10, cachedInPerM: 0.2 })).toBeCloseTo(2 + 0.2 + 0.1 + 1, 6); // 입력 2 + 캐시쓰기 0.2 + 캐시읽기 0.1 + 출력 1
    expect(costFromUsage(u, { inPerM: 2, outPerM: 10 })).toBeCloseTo(2 + 0.2 + 1 + 1, 6); // 캐시 단가 미지정 → 일반 입력 단가(보수적)
  });
  it('입력 토큰 추정 = 글자 수 × 글자당 토큰(올림), 최악 호출 원가', () => {
    expect(estimateInputTokens(req(100), 1.5)).toBe(450);
    expect(worstCaseCallUsd(450, 4000, { inPerM: 2, outPerM: 10 })).toBeCloseTo(0.0009 + 0.04, 6);
  });
});

describe('BudgetedLlm', () => {
  const ok = (text = '{}', usage = {}) => ({ text, usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0, ...usage } });

  it('출력 토큰은 상한으로 clamp 해서 보낸다', async () => {
    const inner = new ScriptedLlm(() => ok());
    await new BudgetedLlm(inner, cfg()).complete(req(10, 8000));
    expect(inner.calls[0]!.maxTokens).toBe(4000);
    await new BudgetedLlm(new ScriptedLlm(() => ok()), cfg()).complete(req(10, 1200));
  });

  it('입력이 상한을 넘으면 호출하지 않는다', async () => {
    const inner = new ScriptedLlm(() => ok());
    const e = await new BudgetedLlm(inner, cfg({ maxInputTokensPerCall: 100 })).complete(req(100)).catch((x) => x);
    expect(e).toBeInstanceOf(LlmError);
    expect(e).toMatchObject({ kind: 'budget', retryable: false });
    expect(e.message).toContain('INPUT_TOO_LARGE');
    expect(inner.calls).toHaveLength(0);
  });

  it('리포트 1건 상한: 누적 실제 원가 + 다음 호출 최악 원가가 상한을 넘으면 호출하지 않는다', async () => {
    const inner = new ScriptedLlm(() => ok('{}', { inputTokens: 100_000, outputTokens: 10_000 })); // 실제 0.2+0.1=$0.30
    const b = new BudgetedLlm(inner, cfg({ maxReportUsd: 0.5, maxOutputTokensPerCall: 4000 }));
    await b.complete(req(10, 4000));
    expect(b.spentUsd).toBeCloseTo(0.3, 6);
    const e = await b.complete(req(10, 4000)).catch((x) => x); // 0.3 + 최악(0.04+) > 0.5? 0.34 < 0.5 → 통과
    expect(e).not.toBeInstanceOf(Error);
    expect(b.spentUsd).toBeCloseTo(0.6, 6);
    const e2 = await b.complete(req(10, 4000)).catch((x) => x);
    expect(e2).toMatchObject({ kind: 'budget' });
    expect(e2.message).toContain('REPORT_BUDGET');
    expect(inner.calls).toHaveLength(2);
  });

  it('하루 상한: 오늘 이미 쓴 금액을 합쳐 판단한다', async () => {
    const inner = new ScriptedLlm(() => ok());
    const e = await new BudgetedLlm(inner, cfg({ dailyBudgetUsd: 5 }), 4.99).complete(req(10, 4000)).catch((x) => x);
    expect(e).toMatchObject({ kind: 'budget' });
    expect(e.message).toContain('DAILY_BUDGET');
    expect(inner.calls).toHaveLength(0);
    const fine = new ScriptedLlm(() => ok());
    await new BudgetedLlm(fine, cfg({ dailyBudgetUsd: 5 }), 1).complete(req(10, 4000));
    expect(fine.calls).toHaveLength(1);
  });

  it('잘린(truncated) 호출은 최악 원가를 누적한다 / 인증·한도 오류는 누적하지 않는다', async () => {
    const t = new BudgetedLlm(new ScriptedLlm(() => new LlmError('truncated', 'cut', true)), cfg());
    await t.complete(req(10, 4000)).catch(() => {});
    expect(t.spentUsd).toBeGreaterThan(0.039); // 출력 4000토큰 × $10/M
    const a = new BudgetedLlm(new ScriptedLlm(() => new LlmError('auth', 'no', false)), cfg());
    await a.complete(req(10, 4000)).catch(() => {});
    expect(a.spentUsd).toBe(0);
  });
});

// ── 파이프라인 통합: 상한이 작으면 도중에 멈추고, 충분하면 정상 완료 ──
const input: BirthInput = { calendar: 'solar', leapMonth: false, year: 1995, month: 5, day: 17, hour: 14, minute: 0, timeUnknown: false, country: 'KR', alias: '나영' };
const facts = calculator.calculate(input);
const basicF = buildInterpretation('basic', facts);
const basicPlan = buildPlan('basic', basicF);
/** QA 를 통과하는 "좋은 작가" 흉내: 섹션의 우선 사실 줄을 풀어 쓰고, 부족분은 서로 겹치지 않는 문장으로 채운다 */
const WORDS = '바람 구름 호수 마당 아침 저녁 계절 골목 시냇물 나무 등불 지붕 대문 언덕 노을 새벽 이슬 햇살 달빛 들판 돌담 장독 우물 다리 오솔길 처마 기와 솥뚜껑 풍경 버드나무 감나무 매화 국화 난초 대나무 소나무 연못 징검다리 서까래 마루 아궁이 부뚜막 항아리 베개 이불 창호지 문고리 댓돌'.split(' ');
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246289909) >>> 0) / 4294967296); }
function goodBody(f: InterpretationFacts, plan: ReportPlan, section: SectionPlan, extra = ''): { status: 'READY'; headline: string; body: string; claim_ids: string[] } {
  // 실제 모델은 풀어 쓰지만, 가짜 작가는 같은 명제를 여러 섹션에 복사하지 않도록 "처음 맡은 섹션"에서만 쓴다
  const usable = usableClaims(f.claims, true);
  const owner = (c: Claim) => plan.sections.findIndex((p) => p.focusTags.some((t) => c.tags.includes(t)));
  const idx = plan.sections.findIndex((p) => p.id === section.id);
  const primary = usable.filter((c) => c.tags.some((t) => section.focusTags.includes(t)));
  const owned = primary.filter((c) => owner(c) === idx);
  const anchors = [...new Set(primary.flatMap((c) => c.anchors))].slice(0, 4);
  const r = rng(plan.product + section.id);
  const trim = (t: string) => { const ss = t.split(/(?<=[.!?])\s+/); while (ss.length > 1 && countChars(ss.join(' ')) > section.maxChars * 0.9) ss.pop(); return ss.join(' '); };
  let body = trim(owned.map((c) => `${c.thesis}. ${c.condition}에 그런 모습이 드러나기 쉬워요.`).join(' ')) + ` ${section.title}을(를) 풀 때는 ${anchors.join(', ')}을(를) 먼저 떠올려 보면 쉬워요. ` + extra;
  if (plan.years && section.focusTags.includes('yearly')) body += plan.years.map((y) => `${y}년 이야기예요.`).join(' ');
  while (countChars(body) < section.targetChars) body += ` ${Array.from({ length: 6 }, () => WORDS[Math.floor(r() * WORDS.length)]).join(' ')} 같은 장면으로 떠올려 보면 쉬워요.`;
  const seenSen = new Set<string>();
  body = body.split(/(?<=[.!?])\s+/).filter((x) => { const k = x.replace(/\s/g, ''); if (seenSen.has(k)) return false; seenSen.add(k); return true; }).join(' ');
  if (!extra) body = body.replace(new RegExp(JARGON.source, 'g'), '기운');
  if (countChars(body) > section.maxChars) body = body.slice(0, Math.floor(section.maxChars * 0.7)).replace(/\s+\S*$/, '') + '.' + (plan.years && section.focusTags.includes('yearly') ? ' ' + plan.years.map((y) => `${y}년 이야기예요.`).join(' ') : ''); // 가짜 작가가 상한을 넘지 않게 자른다 // 가짜 작가의 문장에서 전문용어를 뺀다(제품 규칙)
  return { status: 'READY', headline: '푸른 나무가 바위틈에서 피어나는 이야기', body, claim_ids: primary.map((c) => c.id) };
}
const sectionOf = (r: { user: string }) => basicPlan.sections.find((s) => r.user.includes(`지금 쓸 섹션: ${s.title}`))!;
const mk = () => new ScriptedLlm((r) => ({ text: JSON.stringify(goodBody(basicF, basicPlan, sectionOf(r))), usage: { inputTokens: 12_000, outputTokens: 1_500 } }));
const base = { model: 'm', sleep: async () => {}, allowDraftClaims: true };

describe('파이프라인 + BudgetedLlm', () => {
  it('충분한 상한이면 완료되고 원가를 누적한다', async () => {
    const inner = mk();
    const b = new BudgetedLlm(inner, cfg({ maxReportUsd: 1, dailyBudgetUsd: 5 }));
    const r = await runReportPipeline(basicPlan, basicF, { ...base, llm: b });
    expect(r.status).toBe('ok');
    expect(b.spentUsd).toBeCloseTo(r.calls * (12_000 * 2 + 1_500 * 10) / 1e6, 6);
    // 모든 호출의 출력 토큰 요청이 상한(4000) 이하이고 섹션 분량 기반 기본값을 따른다
    for (const c of inner.calls) expect(c.maxTokens).toBeLessThanOrEqual(4000);
  });

  it('리포트 상한이 작으면 도중에 중단: BUDGET 실패 코드, 남은 섹션은 호출하지 않음, 하루 상한 초과도 마찬가지', async () => {
    const inner = mk();
    const b = new BudgetedLlm(inner, cfg({ maxReportUsd: 0.06, dailyBudgetUsd: 5 })); // 호출 1회 실제 $0.039, 최악 호출 ≥ $0.04
    const r = await runReportPipeline(basicPlan, basicF, { ...base, llm: b });
    expect(r.status).toBe('failed');
    expect(r.failure?.code).toBe('BUDGET');
    expect(r.failure?.message).toContain('REPORT_BUDGET');
    expect(inner.calls.length).toBeLessThan(basicPlan.sections.length);
    const inner2 = mk();
    const r2 = await runReportPipeline(basicPlan, basicF, { ...base, llm: new BudgetedLlm(inner2, cfg({ dailyBudgetUsd: 1 }), 0.99) });
    expect(r2.failure?.message).toContain('DAILY_BUDGET');
    expect(inner2.calls).toHaveLength(0);
  });
});
