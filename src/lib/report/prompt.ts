import type { InterpretationFacts, QaIssue, ReportPlan, SectionPlan } from './types';

export const PROMPT_VERSION = 'prompt-1.0';

/** 모델이 반환해야 하는 JSON (output_config.format 에 그대로 사용) */
export const SECTION_SCHEMA = {
  type: 'object',
  properties: {
    body: { type: 'string', description: '섹션 본문(해요체). 마크다운 제목·목록 없이 문단만.' },
    evidence_ids: { type: 'array', items: { type: 'string' }, description: '본문에 실제로 쓴 근거 ID(사실 줄의 evidence_ids)만.' },
    used_fact_ids: { type: 'array', items: { type: 'string' }, description: '본문에 실제로 쓴 사실 줄 ID.' },
  },
  required: ['body', 'evidence_ids', 'used_fact_ids'],
  additionalProperties: false,
} as const;

/** 변하지 않는 시스템 프롬프트 — 섹션 호출 간 캐시 가능하도록 고정 */
export function buildSystemPrompt(plan: ReportPlan): string {
  return [
    '당신은 사주 풀이를 쉬운 말로 설명해 주는 따뜻한 상담사예요. 사주 계산과 해석 규칙은 이미 끝났고, 당신의 일은 주어진 "사실 줄"을 읽는 사람이 이해하기 쉬운 문장으로 풀어 쓰는 거예요.',
    `이번 리포트: ${plan.productName}.`,
    '',
    '## 반드시 지킬 규칙',
    ...plan.rules.map((r, i) => `${i + 1}. ${r}`),
    plan.hourKnown ? '' : '※ 이 사람은 출생 시간을 몰라요. 시주는 존재하지 않아요.',
    plan.years ? `※ 이 리포트가 다루는 연도는 ${plan.years.join(', ')}년뿐이에요. 다른 연도를 만들지 않아요.` : '',
    '',
    '## 출력',
    '지정한 JSON 스키마만 반환해요. body 는 문단으로만 쓰고(제목·번호·글머리표·이모지 없음), 목표 글자 수(공백 제외)를 지켜요.',
  ].filter((l) => l !== '').join('\n');
}

/** 사실 블록 — 시스템 프롬프트 뒤에 붙는 안정적인 컨텍스트(캐시 대상). 개인 식별 정보는 포함하지 않는다. */
export function buildFactsBlock(facts: InterpretationFacts): string {
  const subj = facts.subjects.map((s) => `- ${s.key}: 일간 ${s.dayMaster}(${s.dayMasterKo}), 원국 ${s.pillars.year} ${s.pillars.month} ${s.pillars.day} ${s.pillars.hour ?? '(시주 없음)'}`).join('\n');
  return [
    `## 사주 사실 (규칙 엔진 ${facts.version} 이 계산한 값. 수정 금지)`,
    subj,
    facts.limits.length ? `\n계산 한계: ${facts.limits.join(', ')}` : '',
    '\n## 사실 줄 (id | tags | 내용 | evidence_ids)',
    ...facts.lines.map((l) => `- [${l.id}] {${l.tags.join(',')}} ${l.text} | ${l.evidenceIds.join(',') || '-'}`),
  ].filter((l) => l !== '').join('\n');
}

/** 섹션별 요청. 이전 섹션의 요지를 함께 줘서 중복을 피하게 한다. */
export function buildSectionPrompt(plan: ReportPlan, section: SectionPlan, facts: InterpretationFacts, prior: { title: string; gist: string }[], issues: QaIssue[] = []): string {
  const primary = facts.lines.filter((l) => l.tags.some((t) => section.focusTags.includes(t)));
  const parts = [
    `## 지금 쓸 섹션: ${section.title}`,
    `목적: ${section.purpose}`,
    `분량: 공백 제외 약 ${section.targetChars}자 (${section.minChars}~${section.maxChars}자 사이).`,
    `우선 사용할 사실 줄: ${primary.map((l) => l.id).join(', ') || '(없음)'}. 필요하면 다른 줄도 근거로 쓸 수 있어요.`,
    prior.length ? `\n이미 쓴 섹션(내용을 반복하지 말고 새로운 관점만 더해요):\n${prior.map((p) => `- ${p.title}: ${p.gist}`).join('\n')}` : '',
  ];
  if (issues.length) {
    parts.push(`\n⚠️ 직전 시도가 자동 검수에서 반려됐어요. 아래를 고쳐서 다시 써요:\n${issues.map((i) => `- ${i.message}`).join('\n')}`);
  }
  parts.push(`\n전체 섹션 순서: ${plan.sections.map((s) => s.title).join(' → ')}`);
  return parts.filter(Boolean).join('\n');
}

/** 이전 섹션 요지(중복 방지용): 첫 문장 일부만 */
export const gistOf = (body: string) => (body.split(/(?<=[.!?요다])\s+/)[0] ?? body).slice(0, 80);
