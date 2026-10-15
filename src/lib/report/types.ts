import type { Element, Stem } from '../saju/types';

export type ProductKey = 'basic' | 'love_deep' | 'compatibility';

export interface EvidenceItem { id: string; label: string; detail: string; ruleId: string }

/** LLM 에게 주는 "근거가 있는 사실 한 줄". 문장 생성은 LLM, 사실 판단은 규칙 엔진. */
export interface FactLine {
  id: string;
  text: string;
  evidenceIds: string[];
  tags: string[];
  /** 본문에 실제로 등장해야 "이 근거를 썼다"고 볼 수 있는 고유 표지(십성명, 간지, 연도 등) */
  anchors: string[];
}

export interface Subject {
  key: 'ME' | 'A' | 'B';
  dayMaster: Stem;
  dayMasterKo: string;
  element: Element;
  pillars: { year: string; month: string; day: string; hour: string | null };
  hourKnown: boolean;
}

export interface InterpretationFacts {
  version: string;
  product: ProductKey;
  subjects: Subject[];
  lines: FactLine[];
  evidence: EvidenceItem[];
  /** 본문에 등장해도 되는 간지(사주 원국 + 세운). 이 밖의 간지는 "숫자/간지 불일치"로 검출한다. */
  allowedGanji: string[];
  years?: number[];
  /** 계산 한계(예: luck_cycles_unavailable) — 모델이 지어내지 않도록 그대로 전달 */
  limits: string[];
}

export interface SectionPlan {
  id: string;
  title: string;
  purpose: string;
  targetChars: number;
  minChars: number;
  maxChars: number;
  focusTags: string[];
}

export interface ReportPlan {
  product: ProductKey;
  productName: string;
  sections: SectionPlan[];
  totalRange: [number, number];
  years?: number[];
  hourKnown: boolean;
  /** 모든 문단이 지켜야 할 규칙(프롬프트·QA 공통) */
  rules: string[];
}

export interface LlmUsage { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
export interface QaIssue { code: string; severity: 'fail' | 'warn'; message: string; sectionId?: string }
