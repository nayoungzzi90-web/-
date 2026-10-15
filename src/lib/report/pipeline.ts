import { reportCacheKey } from './cache';
import { usableClaims, validateClaimReferences } from './claims';
import { addUsage, estimateCostUsd, LlmClient, LlmError, zeroUsage } from './llm';
import { buildFactsBlock, buildSectionPrompt, buildSystemPrompt, gistOf, PROMPT_VERSION, SECTION_SCHEMA } from './prompt';
import { checkReport, checkSection, QA_VERSION } from './qa';
import type { InterpretationFacts, LlmUsage, QaIssue, ReportPlan, ReportStatus, SectionPlan } from './types';

export interface DoneSection { id: string; title: string; body: string; claimIds: string[]; evidenceIds: string[]; attempts: number }
export interface PipelineResult {
  /** ok: 완료 / failed: 시도 한도·검수 실패 / blocked: 근거 부족 등으로 호출 자체를 하지 않음 */
  status: 'ok' | 'failed' | 'blocked';
  /** 서비스 노출 판정: READY 만 사용자에게 보여 줄 수 있다(검증된 엔진 + 승인된 명제 + 검수 통과) */
  reportStatus: ReportStatus;
  reviewReasons: string[];
  sections: DoneSection[];
  issues: QaIssue[];
  usage: LlmUsage;
  calls: number;
  costUsd: number | null;
  model: string;
  cacheKey: string;
  versions: { prompt: string; qa: string; interpretation: string };
  failure?: { code: string; message: string; sectionId?: string };
}
export interface PipelineOptions {
  llm: LlmClient;
  model: string;
  /** 승인 전(DRAFT) 명제 허용 — 샌드박스/검수 화면 전용. 운영 기본값은 false(승인된 명제만) */
  allowDraftClaims?: boolean;
  /** 섹션당 시도 횟수(최초 + 재시도). PRD 기본안: 최초 + 최대 2회 */
  maxAttemptsPerSection?: number;
  /** 한 리포트의 총 호출 상한(원가 폭주 방지) */
  maxCalls?: number;
  maxTokensPerCall?: number;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Parsed { status: string; body: string; claimIds: string[] }
function parseSection(text: string): Parsed | null {
  try {
    const j = JSON.parse(text);
    if (typeof j?.status !== 'string' || typeof j?.body !== 'string' || !Array.isArray(j.claim_ids)) return null;
    return { status: j.status, body: j.body.trim(), claimIds: j.claim_ids.map(String) };
  } catch { return null; }
}

/**
 * 생성 전 검증 → 섹션별 생성 → 섹션 QA(반려 시 사유 전달 후 재생성) → 전체 QA(문제 섹션만 1회 재생성) → 노출 판정.
 * 최종 실패하면 status 'failed' 로 끝나며, 호출 측은 주문·결제·권한을 보존하고 복구/환불 동선으로 보낸다.
 */
export async function runReportPipeline(plan: ReportPlan, facts: InterpretationFacts, opts: PipelineOptions): Promise<PipelineResult> {
  const allowDraft = opts.allowDraftClaims ?? false;
  const maxAttempts = opts.maxAttemptsPerSection ?? 3;
  const maxCalls = opts.maxCalls ?? plan.sections.length * maxAttempts + 3;
  const sleep = opts.sleep ?? wait;
  const usable = usableClaims(facts.claims, allowDraft);
  const ctx = { facts, plan, allowDraft };
  let usage = zeroUsage();
  let calls = 0;
  const done: DoneSection[] = [];
  const allIssues: QaIssue[] = [];
  const cacheKey = reportCacheKey(facts, { model: opts.model, allowDraft, tone: plan.tone });

  const finish = (status: PipelineResult['status'], reportStatus: ReportStatus, failure?: PipelineResult['failure'], reviewReasons: string[] = []): PipelineResult => ({
    status, reportStatus, reviewReasons, sections: done, issues: allIssues, usage, calls, costUsd: estimateCostUsd(usage, opts.model), model: opts.model, cacheKey,
    versions: { prompt: PROMPT_VERSION, qa: QA_VERSION, interpretation: facts.version }, failure,
  });

  // ── 0) 생성 전 검증: 근거가 없거나 참조가 깨져 있으면 LLM 을 호출하지 않는다 ──
  if (!usable.length) return finish('blocked', 'INSUFFICIENT_EVIDENCE', { code: 'NO_APPROVED_CLAIMS', message: '사용할 수 있는(승인된) 해석 명제가 없어요. 상담사 승인 후 생성할 수 있어요.' });
  const refErrors = validateClaimReferences(facts.lines.map((l) => l.id), usable);
  if (refErrors.length) return finish('blocked', 'NEEDS_REVIEW', { code: 'CLAIM_REFERENCE_ERROR', message: refErrors.slice(0, 3).join(' / ') });
  const emptySection = plan.sections.find((s) => !usable.some((c) => c.tags.some((t) => s.focusTags.includes(t))));
  if (emptySection) return finish('blocked', 'INSUFFICIENT_EVIDENCE', { code: 'SECTION_WITHOUT_CLAIMS', message: `"${emptySection.title}" 섹션에 쓸 명제가 없어요.`, sectionId: emptySection.id });

  const system = buildSystemPrompt(plan);
  const factsBlock = buildFactsBlock(facts, plan, allowDraft);
  const claimFacts = new Map(facts.claims.map((c) => [c.id, c]));
  const factEvidence = new Map(facts.lines.map((l) => [l.id, l.evidenceIds]));
  const evidenceOf = (claimIds: string[]) => [...new Set(claimIds.flatMap((id) => (claimFacts.get(id)?.factIds ?? []).flatMap((f) => factEvidence.get(f) ?? [])))];

  async function writeSection(section: SectionPlan, prior: { title: string; gist: string }[], seedIssues: QaIssue[] = []): Promise<{ ok: true; sec: DoneSection } | { ok: false; failure: NonNullable<PipelineResult['failure']> }> {
    let issues = seedIssues;
    let lastModelStatus = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (calls >= maxCalls) return { ok: false, failure: { code: 'CALL_BUDGET', message: `호출 상한(${maxCalls}회)에 도달했어요.`, sectionId: section.id } };
      calls++;
      let res;
      try {
        res = await opts.llm.complete({ system, factsBlock, user: buildSectionPrompt(plan, section, facts, prior, issues, allowDraft), maxTokens: opts.maxTokensPerCall ?? 8000, schema: SECTION_SCHEMA });
      } catch (e) {
        const err = e instanceof LlmError ? e : new LlmError('unknown', String(e), false);
        if (err.kind === 'truncated') { issues = [{ code: 'TRUNCATED', severity: 'fail', message: '출력이 길어서 잘렸어요. 목표 분량 안으로 더 간결하게 써요.', sectionId: section.id }]; continue; }
        if (!err.retryable) return { ok: false, failure: { code: err.kind.toUpperCase(), message: err.message, sectionId: section.id } };
        if (attempt < maxAttempts) { await sleep(500 * 2 ** (attempt - 1)); continue; }
        return { ok: false, failure: { code: err.kind.toUpperCase(), message: err.message, sectionId: section.id } };
      }
      usage = addUsage(usage, res.usage);
      const parsed = parseSection(res.text);
      if (!parsed) { issues = [{ code: 'BAD_JSON', severity: 'fail', message: '지정한 JSON 형식(status, body, claim_ids)으로만 답해요.', sectionId: section.id }]; continue; }
      lastModelStatus = parsed.status;
      if (parsed.status !== 'READY') {
        // 모델이 스스로 "근거 부족/검수 필요"라고 한 경우: 지어내지 못하게 하고 재시도 한도 안에서만 다시 묻는다
        issues = [{ code: 'MODEL_STATUS', severity: 'fail', message: `모델이 ${parsed.status} 로 응답했어요. 제공된 명제만으로 쓸 수 있는 범위를 다시 판단해요.`, sectionId: section.id }];
        allIssues.push({ ...issues[0], message: `[시도 ${attempt}] ${issues[0].message}` });
        continue;
      }
      issues = checkSection(parsed.body, parsed.claimIds, section, ctx);
      const fails = issues.filter((i) => i.severity === 'fail');
      allIssues.push(...issues.map((i) => ({ ...i, message: `[시도 ${attempt}] ${i.message}` })));
      if (!fails.length) return { ok: true, sec: { id: section.id, title: section.title, body: parsed.body, claimIds: parsed.claimIds, evidenceIds: evidenceOf(parsed.claimIds), attempts: attempt } };
      issues = fails;
    }
    if (lastModelStatus === 'INSUFFICIENT_EVIDENCE') return { ok: false, failure: { code: 'INSUFFICIENT_EVIDENCE', message: `"${section.title}" 섹션은 제공된 근거만으로 쓸 수 없다고 모델이 판단했어요.`, sectionId: section.id } };
    return { ok: false, failure: { code: 'QA_FAILED', message: `"${section.title}" 섹션이 자동 검수를 통과하지 못했어요: ${issues.map((i) => i.code).join(', ')}`, sectionId: section.id } };
  }

  const failStatus = (f: NonNullable<PipelineResult['failure']>): ReportStatus => (f.code === 'INSUFFICIENT_EVIDENCE' ? 'INSUFFICIENT_EVIDENCE' : 'NEEDS_REVIEW');
  const prior: { title: string; gist: string }[] = [];
  for (const section of plan.sections) {
    const r = await writeSection(section, prior);
    if (!r.ok) return finish('failed', failStatus(r.failure), r.failure);
    done.push(r.sec);
    prior.push({ title: section.title, gist: gistOf(r.sec.body) });
  }

  const global = checkReport(done, plan).filter((i) => i.severity === 'fail');
  if (global.length) {
    allIssues.push(...global.map((i) => ({ ...i, message: `[전체 검수] ${i.message}` })));
    const targets = [...new Set(global.map((i) => i.sectionId).filter((x): x is string => !!x))];
    for (const id of targets) {
      const idx = done.findIndex((d) => d.id === id);
      const section = plan.sections.find((s) => s.id === id);
      if (idx < 0 || !section) continue;
      const r = await writeSection(section, done.filter((d) => d.id !== id).map((d) => ({ title: d.title, gist: gistOf(d.body) })), global.filter((i) => i.sectionId === id));
      if (!r.ok) return finish('failed', failStatus(r.failure), r.failure);
      done[idx] = r.sec;
    }
    const after = checkReport(done, plan).filter((i) => i.severity === 'fail');
    if (after.length) { allIssues.push(...after.map((i) => ({ ...i, message: `[재검수] ${i.message}` }))); return finish('failed', 'NEEDS_REVIEW', { code: 'REPORT_QA_FAILED', message: `전체 검수를 통과하지 못했어요: ${[...new Set(after.map((i) => i.code))].join(', ')}` }); }
  }

  // ── 노출 판정: 검증된 계산 엔진 + 승인된 명제 + 충돌 없음일 때만 READY ──
  const used = new Set(done.flatMap((d) => d.claimIds));
  const reasons: string[] = [];
  if (!facts.calculation.verified) reasons.push('ENGINE_UNVERIFIED: 만세력 계산 엔진이 검증 전이에요.');
  if ([...used].some((id) => claimFacts.get(id)?.status !== 'APPROVED')) reasons.push('CLAIMS_NOT_APPROVED: 승인 전(DRAFT) 명제를 사용했어요.');
  if (facts.conflicts.some((c) => c.claimIds.some((id) => used.has(id)))) reasons.push('CLAIM_CONFLICT: 사용한 명제에 충돌 후보가 있어요.');
  return finish('ok', reasons.length ? 'NEEDS_REVIEW' : 'READY', undefined, reasons);
}
