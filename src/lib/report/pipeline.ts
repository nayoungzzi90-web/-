import { addUsage, estimateCostUsd, LlmClient, LlmError, zeroUsage } from './llm';
import { buildFactsBlock, buildSectionPrompt, buildSystemPrompt, gistOf, PROMPT_VERSION, SECTION_SCHEMA } from './prompt';
import { checkReport, checkSection, QA_VERSION } from './qa';
import type { InterpretationFacts, LlmUsage, QaIssue, ReportPlan, SectionPlan } from './types';

export interface DoneSection { id: string; title: string; body: string; evidenceIds: string[]; usedFactIds: string[]; attempts: number }
export interface PipelineResult {
  status: 'ok' | 'failed';
  sections: DoneSection[];
  issues: QaIssue[];
  usage: LlmUsage;
  calls: number;
  costUsd: number | null;
  model: string;
  versions: { prompt: string; qa: string; interpretation: string };
  failure?: { code: string; message: string; sectionId?: string };
}
export interface PipelineOptions {
  llm: LlmClient;
  model: string;
  /** 섹션당 시도 횟수(최초 + 재시도). PRD 기본안: 최초 + 최대 2회 */
  maxAttemptsPerSection?: number;
  /** 한 리포트의 총 호출 상한(원가 폭주 방지) */
  maxCalls?: number;
  maxTokensPerCall?: number;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseSection(text: string): { body: string; evidenceIds: string[]; usedFactIds: string[] } | null {
  try {
    const j = JSON.parse(text);
    if (typeof j?.body !== 'string' || !Array.isArray(j.evidence_ids) || !Array.isArray(j.used_fact_ids)) return null;
    return { body: j.body.trim(), evidenceIds: j.evidence_ids.map(String), usedFactIds: j.used_fact_ids.map(String) };
  } catch { return null; }
}

/**
 * 섹션별 생성 → 섹션 QA → (실패 시 이유를 알려 주고 재생성) → 전체 QA → (중복/분량 문제 섹션만 1회 재생성).
 * 최종 실패하면 status 'failed' 로 끝나며, 호출 측은 주문·결제 이력을 보존하고 복구/환불 동선으로 보낸다.
 */
export async function runReportPipeline(plan: ReportPlan, facts: InterpretationFacts, opts: PipelineOptions): Promise<PipelineResult> {
  const maxAttempts = opts.maxAttemptsPerSection ?? 3;
  const maxCalls = opts.maxCalls ?? plan.sections.length * maxAttempts + 3;
  const sleep = opts.sleep ?? wait;
  const system = buildSystemPrompt(plan);
  const factsBlock = buildFactsBlock(facts);
  const ctx = { facts, plan };
  let usage = zeroUsage();
  let calls = 0;
  const done: DoneSection[] = [];
  const allIssues: QaIssue[] = [];

  const finish = (status: 'ok' | 'failed', failure?: PipelineResult['failure']): PipelineResult => ({
    status, sections: done, issues: allIssues, usage, calls, costUsd: estimateCostUsd(usage, opts.model), model: opts.model,
    versions: { prompt: PROMPT_VERSION, qa: QA_VERSION, interpretation: facts.version }, failure,
  });

  /** 한 섹션을 QA 통과할 때까지 시도. 성공하면 DoneSection, 실패하면 failure 정보를 돌려준다. */
  async function writeSection(section: SectionPlan, prior: { title: string; gist: string }[], seedIssues: QaIssue[] = []): Promise<{ ok: true; sec: DoneSection } | { ok: false; failure: NonNullable<PipelineResult['failure']> }> {
    let issues = seedIssues;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (calls >= maxCalls) return { ok: false, failure: { code: 'CALL_BUDGET', message: `호출 상한(${maxCalls}회)에 도달했어요.`, sectionId: section.id } };
      calls++;
      let res;
      try {
        res = await opts.llm.complete({ system, factsBlock, user: buildSectionPrompt(plan, section, facts, prior, issues), maxTokens: opts.maxTokensPerCall ?? 8000, schema: SECTION_SCHEMA });
      } catch (e) {
        const err = e instanceof LlmError ? e : new LlmError('unknown', String(e), false);
        if (err.kind === 'truncated') { issues = [{ code: 'TRUNCATED', severity: 'fail', message: '출력이 길어서 잘렸어요. 목표 분량 안으로 더 간결하게 써요.', sectionId: section.id }]; continue; }
        if (!err.retryable) return { ok: false, failure: { code: err.kind.toUpperCase(), message: err.message, sectionId: section.id } };
        if (attempt < maxAttempts) { await sleep(500 * 2 ** (attempt - 1)); continue; }
        return { ok: false, failure: { code: err.kind.toUpperCase(), message: err.message, sectionId: section.id } };
      }
      usage = addUsage(usage, res.usage);
      const parsed = parseSection(res.text);
      if (!parsed) { issues = [{ code: 'BAD_JSON', severity: 'fail', message: '지정한 JSON 형식(body, evidence_ids, used_fact_ids)으로만 답해요.', sectionId: section.id }]; continue; }
      issues = checkSection(parsed.body, parsed.evidenceIds, section, ctx);
      const fails = issues.filter((i) => i.severity === 'fail');
      allIssues.push(...issues.map((i) => ({ ...i, message: `[시도 ${attempt}] ${i.message}` })));
      if (!fails.length) return { ok: true, sec: { id: section.id, title: section.title, body: parsed.body, evidenceIds: parsed.evidenceIds, usedFactIds: parsed.usedFactIds, attempts: attempt } };
      issues = fails; // 다음 시도에는 반려 사유만 전달
    }
    return { ok: false, failure: { code: 'QA_FAILED', message: `"${section.title}" 섹션이 자동 검수를 통과하지 못했어요: ${issues.map((i) => i.code).join(', ')}`, sectionId: section.id } };
  }

  const prior: { title: string; gist: string }[] = [];
  for (const section of plan.sections) {
    const r = await writeSection(section, prior);
    if (!r.ok) return finish('failed', r.failure);
    done.push(r.sec);
    prior.push({ title: section.title, gist: gistOf(r.sec.body) });
  }

  // 전체 검수: 문제 섹션만 한 번 더
  const global = checkReport(done, plan).filter((i) => i.severity === 'fail');
  if (global.length) {
    allIssues.push(...global.map((i) => ({ ...i, message: `[전체 검수] ${i.message}` })));
    const targets = [...new Set(global.map((i) => i.sectionId).filter((x): x is string => !!x))];
    for (const id of targets) {
      const idx = done.findIndex((d) => d.id === id);
      const section = plan.sections.find((s) => s.id === id);
      if (idx < 0 || !section) continue;
      const r = await writeSection(section, done.filter((d) => d.id !== id).map((d) => ({ title: d.title, gist: gistOf(d.body) })), global.filter((i) => i.sectionId === id));
      if (!r.ok) return finish('failed', r.failure);
      done[idx] = r.sec;
    }
    const after = checkReport(done, plan).filter((i) => i.severity === 'fail');
    if (after.length) { allIssues.push(...after.map((i) => ({ ...i, message: `[재검수] ${i.message}` }))); return finish('failed', { code: 'REPORT_QA_FAILED', message: `전체 검수를 통과하지 못했어요: ${[...new Set(after.map((i) => i.code))].join(', ')}` }); }
  }
  return finish('ok');
}
