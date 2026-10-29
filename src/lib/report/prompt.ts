import { usableClaims } from './claims';
import { RULE_GROUPS, STYLE } from './plan';
import type { Claim, InterpretationFacts, QaIssue, ReportPlan, SectionPlan } from './types';

export const PROMPT_VERSION = 'prompt-2.0';
export const PACKET_SCHEMA_VERSION = '1.0.0';

/** 모델이 반환해야 하는 JSON (output_config.format 에 그대로 사용). status 로 "근거 부족"을 정직하게 알릴 수 있다. */
export const SECTION_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['READY', 'NEEDS_REVIEW', 'INSUFFICIENT_EVIDENCE'], description: 'READY: 검증 가능한 본문 완성 / NEEDS_REVIEW: 해석 검수 필요 / INSUFFICIENT_EVIDENCE: 근거 부족(본문을 지어내지 말 것)' },
    body: { type: 'string', description: '섹션 본문. 마크다운 제목·목록·이모지 없이 문단만.' },
    claim_ids: { type: 'array', items: { type: 'string' }, description: '본문에 실제로 사용한 명제 ID(제공된 approvedClaims 의 id 만).' },
  },
  required: ['status', 'body', 'claim_ids'],
  additionalProperties: false,
} as const;

const numbered = (a: readonly string[], from = 1) => a.map((r, i) => `${from + i}. ${r}`).join('\n');

/** 변하지 않는 시스템 프롬프트(모든 섹션·상품 공통 + 상품별 지시문). 섹션 호출 사이에 캐시된다. */
export function buildSystemPrompt(plan: ReportPlan, mode: 'api' | 'manual' = 'api'): string {
  return [
    '너는 한국 전통 사주명리학 해석 콘텐츠를 쉬운 상담 문장으로 바꿔 쓰는 상담 문장화 엔진이다.',
    '',
    '[최우선 목적]',
    '검증된 만세력 데이터와 승인된 해석 명제를 바탕으로 고객 개인에게 적합한 사주 결과를 쓴다. 너의 임무는 사주를 새로 계산하거나 용신·격국을 독자적으로 확정하는 것이 아니다. 제공된 해석의 근거를 유지하면서 정확하고 구체적이며 자연스러운 상담 문장으로 바꾸는 것이다.',
    '',
    '[1. 근거 사용 원칙]', numbered(RULE_GROUPS.evidence),
    '',
    '[2. 명리 해석 원칙]', numbered(RULE_GROUPS.saju),
    '',
    '[3. 개인화·일관성]', numbered(RULE_GROUPS.personalize),
    '',
    '[4. 문체]', STYLE[plan.tone],
    '명리학은 상징적 해석 체계라는 한계를 존중하며 사건을 예언하거나 보장하지 않는다. 금지 표현: "무조건 성공합니다", "반드시 이혼합니다", "올해 운명이 바뀝니다", "이 사주라서 부자가 됩니다", "100% 이런 사람입니다". 권장 표현: "~로 나타날 수 있어요", "강점으로 작용하기 쉬운 부분은 ~예요", "다만 ~한 조건에서는 다른 모습이 나타날 수 있어요".',
    '',
    '[5. 안전·자료 취급]', numbered(RULE_GROUPS.safety),
    '',
    `[6. 이번 상품: ${plan.productName}]`, plan.addendum,
    plan.hourKnown ? '' : '※ 이 고객은 출생 시간을 몰라요. 시주는 존재하지 않아요.',
    plan.years ? `※ 이 리포트가 다루는 연도는 ${plan.years.join(', ')}년뿐이에요. 다른 연도를 만들지 않아요.` : '',
    '',
    '[7. 출력]',
    mode === 'api'
      ? '서버가 지정한 JSON 스키마만 반환한다. status 는 READY / NEEDS_REVIEW / INSUFFICIENT_EVIDENCE 중 하나다. 근거 부족이나 해석 충돌이 있으면 완성된 척 쓰지 말고 INSUFFICIENT_EVIDENCE 또는 NEEDS_REVIEW 로 반환한다. body 는 문단으로만 쓰고(제목·번호·글머리표·이모지 없음) 목표 글자 수(공백 제외)를 지킨다. claim_ids 에는 실제로 쓴 명제 ID 만 적는다.'
      : '아래 "작성할 섹션" 순서대로, 각 섹션을 "## 섹션 제목" 한 줄 + 본문 문단 + 마지막 줄에 "[claims: C-xxx, C-yyy]"(실제로 쓴 명제 ID)로 쓴다. 본문은 목록·번호·이모지 없이 문단만. 각 섹션의 목표 글자 수(공백 제외)를 지킨다. 설명이나 머리말 없이 섹션만 출력한다.',
  ].filter((l) => l !== '').join('\n');
}

const claimView = (c: Claim) => ({ id: c.id, domain: c.domain, semanticKey: c.semanticKey, stance: c.stance, thesis: c.thesis, factIds: c.factIds, counterFactIds: c.counterFactIds, ruleId: c.ruleId, condition: c.condition, limitation: c.limitation, salience: c.salience, status: c.status });

/** 구조화된 입력 패킷(생년월일 원문 없이 원국 간지·사실·명제만). 모든 섹션 호출에서 동일해야 캐시가 적중한다. */
export function buildInputPacket(plan: ReportPlan, facts: InterpretationFacts, allowDraft = false) {
  const claims = usableClaims(facts.claims, allowDraft);
  return {
    task: 'GENERATE_SAJU_REPORT',
    schemaVersion: PACKET_SCHEMA_VERSION,
    calculationPolicyVersion: `${facts.calculation.engine} / ${facts.calculation.rules}`,
    ruleVersion: facts.version,
    promptVersion: PROMPT_VERSION,
    subject: { subjectId: 'anonymous' },
    productSpec: {
      productKey: plan.product, language: 'ko-KR', tone: plan.tone,
      minCharacters: plan.totalRange[0], maxCharacters: plan.totalRange[1],
      sections: plan.sections.map((s) => ({ id: s.id, title: s.title, purpose: s.purpose, targetCharacters: s.targetChars, minCharacters: s.minChars, maxCharacters: s.maxChars })),
    },
    chartStatus: facts.calculation.verified ? 'READY' : 'NEEDS_REVIEW',
    interpretationFacts: {
      subjects: facts.subjects.map((s) => ({ key: s.key, dayMaster: s.dayMaster, pillars: s.pillars })),
      facts: facts.lines.map((l) => ({ id: l.id, text: l.text, evidenceIds: l.evidenceIds, origin: 'RULE_ENGINE' })),
      approvedClaims: claims.map(claimView),
      conflicts: facts.conflicts,
      calculationWarnings: facts.limits,
    },
    generationRules: { useOnlyApprovedClaims: true, requireClaimReferences: true, allowNewAstrologyFacts: false, allowUnsupportedPredictions: false },
  };
}
/** 시스템 프롬프트 뒤에 붙는 안정적인 컨텍스트(캐시 대상) */
export const buildFactsBlock = (facts: InterpretationFacts, plan: ReportPlan, allowDraft = false) =>
  `## 입력 패킷 (규칙 엔진 ${facts.version}. 수정 금지)\n${JSON.stringify(buildInputPacket(plan, facts, allowDraft), null, 1)}`;

export const primaryClaims = (facts: InterpretationFacts, section: SectionPlan, allowDraft = false) =>
  usableClaims(facts.claims, allowDraft).filter((c) => c.tags.some((t) => section.focusTags.includes(t)));

/** 섹션별 요청. 이전 섹션의 요지를 함께 줘서 중복을 피하게 한다. */
export function buildSectionPrompt(plan: ReportPlan, section: SectionPlan, facts: InterpretationFacts, prior: { title: string; gist: string }[], issues: QaIssue[] = [], allowDraft = false): string {
  const ids = primaryClaims(facts, section, allowDraft).map((c) => c.id);
  const parts = [
    `## 지금 쓸 섹션: ${section.title} (id: ${section.id})`,
    `목적: ${section.purpose}`,
    `분량: 공백 제외 약 ${section.targetChars}자 (${section.minChars}~${section.maxChars}자 사이). 최소 미달도, 최대 초과도 자동 반려돼요. 문단 약 ${Math.max(2, Math.round(section.targetChars / 200))}개로, 명제마다 (1) 어떤 모습으로 나타나는지 (2) 일상의 구체적인 장면 예 (3) 강점으로 쓰는 법 (4) 조심할 점을 풀어서 목표 글자 수의 105~110%를 노려 쓰면 안전해요(대체로 모델이 짧게 써요). '무조건·반드시·100%·틀림없이' 같은 단어는 부정문에서도 쓰지 않아요. 새 사실을 만들지 말고 같은 명제를 구체적으로 풀어 써요. 명제의 고유 표지(십성·오행 이름 등)를 2개 이상 직접 언급해요.`,
    `우선 사용할 명제: ${ids.join(', ') || '(없음 → INSUFFICIENT_EVIDENCE 로 반환)'}. 필요하면 다른 승인 명제도 쓸 수 있어요. 가능하면 2개 이상을 종합해요.`,
    prior.length ? `\n이미 쓴 섹션(내용을 반복하지 말고 새로운 관점만 더해요):\n${prior.map((p) => `- ${p.title}: ${p.gist}`).join('\n')}` : '',
  ];
  if (issues.length) parts.push(`\n⚠️ 직전 시도가 자동 검수에서 반려됐어요. 아래를 고쳐서 다시 써요:\n${issues.map((i) => `- ${i.message}`).join('\n')}`);
  parts.push(`\n전체 섹션 순서: ${plan.sections.map((s) => s.title).join(' → ')}`);
  return parts.filter(Boolean).join('\n');
}

/** 이전 섹션 요지(중복 방지용): 첫 문장 일부만 */
export const gistOf = (body: string) => (body.split(/(?<=[.!?요다])\s+/)[0] ?? body).slice(0, 80);

/** 수동 평가용 전체 프롬프트(아무 AI 대화창에 한 번에 붙여넣는 형태). /lab 과 문서 생성이 같은 함수를 쓴다. */
export function buildManualPrompt(plan: ReportPlan, facts: InterpretationFacts, allowDraft = true): string {
  return [
    buildSystemPrompt(plan, 'manual'), '', buildFactsBlock(facts, plan, allowDraft), '', '---', '## 작성할 섹션 (이 순서, 이 제목으로)',
    ...plan.sections.map((s, i) => `${i + 1}. ## ${s.title}\n   - 목적: ${s.purpose}\n   - 분량: 공백 제외 약 ${s.targetChars}자 (${s.minChars}~${s.maxChars}자)\n   - 우선 사용할 명제: ${primaryClaims(facts, s, allowDraft).map((c) => c.id).join(', ') || '(없음)'}`),
  ].join('\n');
}
