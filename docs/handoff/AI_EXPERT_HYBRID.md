# 오행 친구들 B안: GPT + Gemini 전문가형 하이브리드 해석 설계

**상태: 구현 지시용 아키텍처 설계. 실제 GPT/Gemini 운영 연결·품질 검증·명리 승인 완료가 아님.**

## 1. 책임 분리

1. `R001 AlmanacEngine`: 입력 검증, 절입, 4주, 음력 변환, KST 법정시, 시간 미상 처리; 모델 생성 불허.
2. `R002-R014 RuleEngine`: 승인된 명리 분석 근거 후보, 전문가 검토 상태, 충돌, 규칙 버전, `claim_id`·`evidence_id`.
3. `ClaimGate/R015`: 상품의 requiredRules 및 G0~G6 기준 검사. 허용 claim만 `ReportPlan`에 발행. 미검증 신강·격국·용신 주장은 `REVIEW`/`BLOCK`, 사용자에게 임의 확정 표현 금지.
4. `GPT Writer`: `SajuFacts`, `InterpretationFacts`, `ReportPlan`과 승인된 문장 규칙으로 한국어 상담 초안 생성. 부드럽지만 과장하지 않는 상담사 어투, 상품별 분량·목차 준수. 모델은 사실 수정을 할 수 없음.
5. `Gemini Reviewer`: 원본 사실 + claim 목록 + 초안을 독립적으로 비교·평가. 간지/절입/대운/세운 불일치, 시주 임의 생성, 일반론, 상품 목차, 위험한 미래 단정, 근거 누락, 규칙 위반을 JSON으로 지적. 모델은 승인권자 아님.
6. `Deterministic Validator`: JSON Schema, claim/evidence membership, forbidden claims, 권한/상품, 재시도 횟수, PII 검출, 리포트 버전 저장; `PASS/REVIEW/BLOCK` 판정. 반복 불일치면 자동 결제 후 즉시 제공 강행 금지(복구/환불 정책).

## 2. 데이터 계약 예시 (구현 시 Zod/JSON Schema 정의)

```ts
interface SajuFacts {
  inputHash: string;
  pillars: { year: string; month: string; day: string; hour: string | null };
  source: string;
  engineVersion: string;
  timezone: string;
  warnings: string[];
  finalApproved: boolean;
}
interface Evidence {
  id: string;
  ruleId: `R${string}`;
  sourceId: string;
  status: 'source_checked' | 'implemented' | 'unit_verified' | 'expert_reviewed' | 'release_approved' | 'review_required';
  facts: string[];
}
interface Claim {
  id: string;
  type: string;
  text: string;
  evidenceIds: string[];
  status: 'approved' | 'review_required' | 'blocked';
}
interface ReportPlan {
  productId: string;
  factVersion: string;
  requiredRuleIds: string[];
  allowedClaimIds: string[];
  sections: Array<{ sectionId: string; minChars?: number; maxChars?: number }>;
}
interface ModelAudit {
  modelProvider: 'openai' | 'google';
  modelVersion: string;
  promptVersion: string;
  issues: Array<{ type: string; severity: 'review' | 'block'; claimId?: string; detail: string }>;
}
```

이 스키마는 **개념 예시**이고 현재 앱/원본 R015의 정확한 API 타입과 충돌하면 원본을 분석하고 조정한다. `Evidence.status`의 승인 단계는 원본 R015 정책에 맞춰 더 엄격히 분리한다.

## 3. 품질 게이트

- `PASS`: 계산 확정/상품별 requiredRules 승인 + claim whitelist + 문단별 근거 + GPT 초안/Gemini 감수/결정론 검사 모두 문제 없음. 출시 승인과 별개로 각 기능 gate를 통과해야 발행.
- `REVIEW`: 일부 문장이 부정확/모호하거나 모델 불일치. 유한 횟수 수정 후 관리자/전문가 검수.
- `BLOCK`: 미확정 시주·격국·용신 단정, 원국 변조, 인증/상품 권한/비밀키 오류, 중대한 근거 누락, 반복 실패. 유료 권한/환불/고객지원 워크플로우 분리.
- **검증 모델은 계산을 대체하지 않는다.** GPT↔Gemini 합의율은 품질 모니터링 지표일 뿐 정확성/예측력 증명 아님.

## 4. 검증 테스트 계획

1. 테스트 케이스: 법정시·절기 ±120초·자시·윤달·시간미상·성별·결측·경계 날짜.
2. R001의 입력을 임의로 바꾼 GPT 출력은 무조건 BLOCK.
3. 명식 A/B, 상품 P0/P1, 출생시간 미상에서 허용/금지 claim을 검증.
4. GPT가 `辛酉`를 `庚申`로 변형하거나 승인되지 않은 `용신=금`을 단정하면 BLOCK.
5. Gemini가 허용 근거를 오판하면 자체 검사로 균형 유지, 사람 검증 요청. 감수자 모델을 무오류라고 가정하지 않음.
6. 샘플당 토큰 비용, 응답 시간, 재검토율, 결제당 원가, 운영 로그 익명화 지표 실측 후 모델 선택.
7. PG 연동 전 합성 입력만; 실제 생년월일/관계 정보를 모델 제공업체에 전송할 때 데이터처리·보관·동의/약관 검토.

## 5. Claude Code에서의 구현 순서

A. 현재 코드의 `SajuPreview`/`finalApproved` 타입 확인 → B. `InterpretationFacts`와 규칙 상태 ledger → C. `ReportPlan`/claim whitelist (처음에는 모든 미승인 claim 차단) → D. 모델 mock adapter/스키마 및 dry-run → E. provider 실제 SDK를 비밀 env와 서버 함수로 교체 → F. GPT/Gemini 품질 평가 및 제한 재시도 → G. 상품별 R015 게이트와 운영 승인.

각 단계는 구현 전 계획·테스트 기준을 제시하고, 승인 없는 결제/개인정보/운영 배포를 하지 않는다.
