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

export type ClaimStance = 'HIGH' | 'LOW' | 'MIXED' | 'CONTEXTUAL' | 'NONE';
export type ClaimStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';
export type ReportStatus = 'READY' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';

/**
 * 해석 명제: 사실 줄(factIds)을 근거로 한 해석 한 줄. 상담사가 승인(APPROVED)한 것만 서비스 결과에 쓸 수 있다.
 * salience 는 예언 확률이 아니라 콘텐츠에서의 해석 우선순위(1~5)다.
 */
export interface Claim {
  id: string;
  domain: string;
  /** 같은 의미 축(예: autonomy). 같은 키에 상반된 stance 가 동시에 승인되면 충돌 후보 */
  semanticKey: string;
  stance: ClaimStance;
  thesis: string;
  factIds: string[];
  counterFactIds: string[];
  ruleId: string;
  /** 해석이 드러나는 상황 */
  condition: string;
  /** 적용 범위의 한계 */
  limitation: string;
  salience: 1 | 2 | 3 | 4 | 5;
  status: ClaimStatus;
  /** 섹션 선택용 */
  tags: string[];
  /** 본문에 실제로 등장해야 "이 명제를 썼다"고 볼 수 있는 고유 표지 */
  anchors: string[];
}
export interface ClaimConflict { semanticKey: string; claimIds: string[]; reason: string }

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
  /** 사실 줄(계산값을 문장으로 옮긴 것) */
  lines: FactLine[];
  claims: Claim[];
  conflicts: ClaimConflict[];
  evidence: EvidenceItem[];
  /** 계산 엔진 정보: 검증되지 않은 엔진이면 결과는 READY 가 될 수 없다 */
  calculation: { engine: string; rules: string; timezonePolicy: string; verified: boolean };
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
  tone: 'haeyo' | 'hamnida';
  /** 상품별 추가 지시문 */
  addendum: string;
}

export interface LlmUsage { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
export interface QaIssue { code: string; severity: 'fail' | 'warn'; message: string; sectionId?: string }
