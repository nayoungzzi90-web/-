import { LlmClient, LlmError, zeroUsage } from './llm';
import type { DoneSection, PipelineResult } from './pipeline';
import type { InterpretationFacts, LlmUsage } from './types';

/**
 * 독립 감수(두 번째 모델, 예: Gemini). 쓴 모델(GPT)과 다른 모델이 풀이 문장을 근거와 대조해 문제를 찾는다.
 * - 감수 모델은 "문제 목록"만 낸다. 통과/검토/차단(PASS/REVIEW/BLOCK)은 아래 decideVerdict 코드가 정한다.
 * - 감수 모델은 사주를 다시 계산하지 않는다. 계산 사실은 결정론 엔진의 값이 정답이다.
 * - 고객 이름과 고민 글은 보내지 않는다(이름은 {{이름}} 으로 되돌려 보낸다).
 * - 두 모델이 같은 말을 해도 정확성 보증이 아니다. 감수 실패·오류는 PASS 가 아니라 REVIEW 로 둔다.
 */
export const REVIEW_VERSION = 'review-1.0';

export const FINDING_KINDS = ['CONTRADICTS_FACT', 'UNSUPPORTED', 'OVERSTATED', 'MISSING_LIMIT', 'PREDICTION', 'SENSITIVE', 'UNCLEAR'] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];
export type ReviewVerdict = 'PASS' | 'REVIEW' | 'BLOCK';

export interface ReviewFinding { sectionId: string; quote: string; kind: FindingKind; severity: 'minor' | 'major'; reason: string }
export interface ReviewResult {
  version: string;
  verdict: ReviewVerdict;
  /** 판정 이유(코드가 만든 쉬운 말) */
  reasons: string[];
  /** 본문에서 실제로 찾은 문장만(인용이 본문에 없으면 ignored 로) */
  findings: ReviewFinding[];
  ignored: ReviewFinding[];
  usage: LlmUsage;
  model: string | null;
  error?: string;
}

export const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section_id: { type: 'string', description: '문제가 있는 섹션 id' },
          quote: { type: 'string', description: '문제 문장을 본문에서 글자 그대로 옮김(한 문장)' },
          kind: { type: 'string', enum: [...FINDING_KINDS] },
          severity: { type: 'string', enum: ['minor', 'major'] },
          reason: { type: 'string', description: '왜 문제인지 한두 문장(한국어)' },
        },
        required: ['section_id', 'quote', 'kind', 'severity', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
} as const;

const SYSTEM = [
  '너는 사주 풀이 원고의 독립 감수자다. 다른 모델이 쓴 원고를, 함께 주는 "계산 사실"과 "해석 명제"에 비춰 문장 단위로 검사한다.',
  '원고를 고쳐 쓰지 않는다. 통과·불통과를 판정하지 않는다. 문제 문장만 찾아 목록으로 낸다. 문제가 없으면 빈 목록을 낸다.',
  '계산 사실은 검증된 계산 엔진의 값이므로 정답으로 본다. 너의 명리 지식으로 사주를 다시 계산하거나 사실을 바꾸지 않는다.',
  '문제 종류:',
  '- CONTRADICTS_FACT: 계산 사실과 어긋난다(예: 없는 기운을 있다고 함, 계절·자리를 틀리게 말함).',
  '- UNSUPPORTED: 사실이나 명제 어디에도 근거가 없는 해석을 덧붙였다.',
  '- OVERSTATED: 명제보다 세게 말했다(예: "~할 여지"를 "~한다"로, 뿌리·계절 도움을 "힘이 강하다/약하다"로, 후보를 확정처럼).',
  '- MISSING_LIMIT: 명제가 단 한계(잠정, 판단하지 않음 등)를 빼서 뜻이 달라졌다.',
  '- PREDICTION: 사건을 예언하거나 보장한다(결혼·이별·합격·돈벌이 등).',
  '- SENSITIVE: 건강·질병·심리 진단, 투자·대출 같은 돈 결정, 법적 판단을 권하거나 단정한다.',
  '- UNCLEAR: 사주를 모르는 사람이 오해하기 쉽게 썼다.',
  'severity: 고객이 잘못 믿게 될 내용이면 major, 표현만 다듬으면 되는 정도면 minor.',
  'quote 는 원고에서 글자 그대로 한 문장만 옮긴다. 원고에 없는 문장을 만들지 않는다.',
  '문체(담백함, 길이, 말투)는 평가하지 않는다. {{이름}} 은 고객 이름 자리표시이므로 문제로 보지 않는다.',
].join('\n');

const norm = (s: string) => s.replace(/[\s.,!?'"“”‘’()·\-~]/g, '');

/** 감수 모델이 낸 문제 목록 → 판정. 모델의 의견이 아니라 이 규칙이 결정한다. */
export function decideVerdict(findings: ReviewFinding[], error?: string): { verdict: ReviewVerdict; reasons: string[] } {
  const reasons: string[] = [];
  if (error) return { verdict: 'REVIEW', reasons: [`감수를 마치지 못했어요(${error}). 사람이 확인해야 해요.`] };
  const major = findings.filter((f) => f.severity === 'major');
  const blockers = major.filter((f) => f.kind === 'CONTRADICTS_FACT' || f.kind === 'PREDICTION' || f.kind === 'SENSITIVE');
  if (blockers.length) {
    reasons.push(...blockers.map((f) => `[${f.sectionId}] ${f.kind}: "${f.quote}" — ${f.reason}`));
    return { verdict: 'BLOCK', reasons };
  }
  const minor = findings.length - major.length;
  if (major.length) reasons.push(...major.map((f) => `[${f.sectionId}] ${f.kind}: "${f.quote}" — ${f.reason}`));
  if (minor >= 3) reasons.push(`가벼운 지적이 ${minor}개 있어요.`);
  return reasons.length ? { verdict: 'REVIEW', reasons } : { verdict: 'PASS', reasons: [] };
}

function parseFindings(text: string): ReviewFinding[] | null {
  try {
    const j = JSON.parse(text);
    if (!Array.isArray(j?.findings)) return null;
    return j.findings
      .filter((f: Record<string, unknown>) => f && typeof f.quote === 'string' && FINDING_KINDS.includes(f.kind as FindingKind))
      .map((f: Record<string, unknown>) => ({ sectionId: String(f.section_id ?? ''), quote: String(f.quote).trim(), kind: f.kind as FindingKind, severity: f.severity === 'major' ? 'major' : 'minor', reason: String(f.reason ?? '') }));
  } catch {
    return null;
  }
}

export interface ReviewOptions {
  model?: string;
  /** 섹션 본문에 들어간 표시 이름. 감수 모델에 보내기 전에 {{이름}} 으로 되돌린다 */
  displayName?: string;
  maxTokens?: number;
}

/** 완성된 섹션들을 한 번의 호출로 감수한다. */
export async function reviewReport(llm: LlmClient, facts: InterpretationFacts, sections: DoneSection[], opts: ReviewOptions = {}): Promise<ReviewResult> {
  const unName = (s: string) => (opts.displayName ? s.split(opts.displayName).join('{{이름}}') : s);
  const cited = new Set(sections.flatMap((s) => s.claimIds));
  const claims = facts.claims.filter((c) => cited.has(c.id)).map((c) => ({ id: c.id, status: c.status, thesis: c.thesis, condition: c.condition, limitation: c.limitation }));
  const factsBlock = `## 계산 사실(정답)\n${facts.lines.map((l) => `- [${l.id}] ${l.text}`).join('\n')}\n\n## 원고가 인용한 해석 명제\n${JSON.stringify(claims, null, 1)}\n\n## 계산 한계\n${facts.limits.join(', ') || '없음'}`;
  const user = `## 감수할 원고\n${sections.map((s) => `### [${s.id}] ${s.title}\n제목: ${unName(s.headline)}\n${unName(s.body)}`).join('\n\n')}`;
  const base = { version: REVIEW_VERSION, model: opts.model ?? null };
  let text: string;
  let usage = zeroUsage();
  try {
    const res = await llm.complete({ system: SYSTEM, factsBlock, user, maxTokens: opts.maxTokens ?? 4000, schema: REVIEW_SCHEMA });
    text = res.text; usage = res.usage;
    base.model = res.model;
  } catch (e) {
    const msg = e instanceof LlmError ? e.kind : 'unknown';
    return { ...base, ...decideVerdict([], msg), findings: [], ignored: [], usage, error: msg };
  }
  const parsed = parseFindings(text);
  if (!parsed) return { ...base, ...decideVerdict([], 'bad_json'), findings: [], ignored: [], usage, error: 'bad_json' };
  // 본문에 실제로 있는 문장만 인정한다(감수 모델이 지어낸 인용은 판정에 쓰지 않음)
  const bodyOf = new Map(sections.map((s) => [s.id, norm(unName(`${s.headline}\n${s.body}`))]));
  const all = norm(sections.map((s) => unName(`${s.headline}\n${s.body}`)).join('\n'));
  const findings: ReviewFinding[] = [];
  const ignored: ReviewFinding[] = [];
  for (const f of parsed) {
    const q = norm(f.quote);
    const ok = q.length >= 4 && ((bodyOf.get(f.sectionId) ?? '').includes(q) || all.includes(q));
    (ok ? findings : ignored).push(f);
  }
  return { ...base, ...decideVerdict(findings), findings, ignored, usage };
}

/** 감수 결과를 풀이 결과에 반영: PASS 가 아니면 READY 를 NEEDS_REVIEW 로 내린다(더 올리지는 않는다). */
export function applyReview(result: PipelineResult, review: ReviewResult): PipelineResult {
  if (review.verdict === 'PASS') return result;
  const reportStatus = result.reportStatus === 'READY' ? 'NEEDS_REVIEW' : result.reportStatus;
  return { ...result, reportStatus, reviewReasons: [...result.reviewReasons, `독립 감수 ${review.verdict}`, ...review.reasons] };
}
