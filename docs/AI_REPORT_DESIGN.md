# AI 리포트 생성 설계 (v1)

> **상태**: 코드와 테스트는 있으나 **실제 AI API로는 한 번도 호출해 보지 못했습니다**(이 개발 환경에 API 키가 없음). 아래 "검증되지 않은 것"을 읽고 출시 전 측정하세요.

## 1. 구조

```
SajuFacts(만세력 계산, 불변)
  └─ buildInterpretation()  규칙 엔진: 오행 균형·십성 분포·월지 계절·자기힘/바깥힘·원국 합충·배우자궁·세운 → "사실 줄"(근거 ID 포함)
      └─ buildPlan()        PRD 목차·글자 수를 섹션 단위로 (기본 6 / 궁합 6 / 연애운 7)
          └─ runReportPipeline()   섹션별 LLM 호출 → 섹션 QA → (반려 시 사유 전달 후 재생성) → 전체 QA → (문제 섹션만 1회 재생성)
              └─ reports 저장(본문·근거·QA·버전) / generation_jobs 에 토큰·원가·시도 기록
```

- **사실 판단은 코드, 문장은 AI.** AI는 사실 줄을 읽는 사람이 이해하기 쉬운 말로 풀어 쓸 뿐, 원국·간지·십성을 만들거나 바꾸지 않습니다.
- **섹션별 호출**: 분량(4,000~5,000자)을 안정적으로 맞추고, 실패한 섹션만 다시 써서 비용을 줄입니다. 이미 쓴 섹션의 요지를 다음 호출에 전달해 중복을 줄입니다.
- **캐시**: 시스템 프롬프트 + 사실 블록을 모든 섹션 호출에서 동일하게 유지하고 사실 블록에 `cache_control` 을 겁니다(입력 토큰 재사용). 실제 적중은 `usage.cache_read_input_tokens` 로 측정해야 합니다.
- **재열람 시 AI 재호출 없음**: `reports.status='ready'` 이면 함수가 즉시 반환합니다(AC-08).
- **재시도 한도**: 섹션당 3회, 한 리포트 총 호출 상한(섹션 수×3+3), 작업(job) 단위 3회(`generation_jobs.attempt_count` CHECK). 모두 실패하면 주문·결제·권한을 보존한 채 `failed` → 복구/환불 요청 동선(AC-07).

## 2. 파일

| 위치 | 역할 |
|---|---|
| `src/lib/report/interpretation.ts` | 해석 규칙 엔진 (규칙 버전 `interp-2.0`) |
| `src/lib/report/plan.ts` | 목차·분량·공통 규칙 |
| `src/lib/report/prompt.ts` | 시스템/사실/섹션 프롬프트, 출력 JSON 스키마 |
| `src/lib/report/qa.ts` | 자동 품질 검수 |
| `src/lib/report/llm.ts` | `LlmClient` 인터페이스, 가격표, 원가 계산, 테스트용 `ScriptedLlm` |
| `src/lib/report/anthropicClient.ts` | Claude 구현(**서버 전용**) |
| `src/lib/report/pipeline.ts` | 생성·재시도·검수 오케스트레이션 |
| `src/lib/report/remote.ts` | 브라우저 → Edge Function 호출(토큰만 전송) |
| `supabase/functions/generate-report/` | Edge Function (권한 확인 → 생성 → 저장) |
| `supabase/migrations/0003_report_pipeline.sql` | `qa_json`, `plan_json`, 원가 컬럼, 작업 조회 정책 |
| `src/pages/Lab.tsx` (`/lab`, 개발 모드만) | 프롬프트 복사 + 결과 붙여넣기 자동 채점 |

## 3. 자동 품질 검수 (PRD 6.1-4)

| 검사 | 코드 | 비고 |
|---|---|---|
| JSON 구조 | `BAD_JSON` | 지정 스키마(`body`, `evidence_ids`, `used_fact_ids`) |
| 필수 목차 | `TOC` | 섹션 id·순서 |
| 분량 | `LENGTH_SHORT/LONG`, `TOTAL_SHORT/LONG` | 섹션은 목표의 70~150%, 전체는 상품 범위(공백 제외) |
| 숫자/간지 불일치 | `GANJI_MISMATCH` | 제공된 원국·세운 외의 간지 |
| 지원하지 않는 시주 | `HOUR_PILLAR` | 시간 미상인데 시주를 단정하면 반려 |
| 단정적 예언 | `PROPHECY` | 반드시/무조건/100%/확정 예언 패턴 |
| 의학·심리 진단 | `MEDICAL` | 우울증·진단·치료 등 |
| 점수·확률 | `SCORE` | 궁합 점수 금지 |
| 5개 연도 | `YEAR_MISSING`, `YEAR_OUT_OF_RANGE` | 연애운 |
| 근거 ID | `EVIDENCE_EMPTY/UNKNOWN` | 존재하는 근거만 |
| 중복 | `DUP_SENTENCE`, `DUP_SECTION` | 같은 문장·3-gram 유사도 40% 초과 |
| 의미 없는 일반론 | `TOO_GENERIC` | 사실 줄의 고유 표지 2개 이상 언급 |
| 말투 | `TONE`(경고) | 해요체 60% 미만 |

⚠️ 패턴 기반이라 **놓치는 표현이 있습니다**(예: 돌려 쓴 단정). 코드로 못 보는 "자연스러움·공감·적용 가능성"은 사람이 5축(사실 정합성·근거·차별성·읽기 편함·적용 가능성)으로 검수해야 합니다.

## 4. 개인정보
- 모델에 보내는 것: **원국 간지에서 파생한 사실 줄**뿐입니다. 생년월일·출생 시각·별칭·이메일·상대방 정보는 프롬프트에 없습니다(테스트로 확인).
- 그래도 파생 정보는 개인정보일 수 있으니, 선택한 AI 제공업체의 **데이터 보관·학습 사용·해외 이전 정책**을 확인하고 개인정보처리방침에 반영해야 합니다(PRD 16-5). 일부 모델은 최소 보관 기간 요건이 있습니다 — 모델별로 확인하세요.
- API 키는 Edge Function 환경변수에만 둡니다(`supabase secrets set ANTHROPIC_API_KEY=...`). 브라우저·저장소에 넣지 않습니다.

## 5. 모델 선택과 원가
- 기본값: `claude-opus-5-5`(`LLM_MODEL` 환경변수로 교체), 깊이 `LLM_EFFORT=medium`. 이 모델은 `temperature` 등 샘플링 파라미터를 받지 않고 thinking 이 항상 켜져 있어 보내지 않습니다.
- 후보 비교 대상: `claude-sonnet-5-5`, `claude-haiku-5-5` 등. **비용 때문에 낮추는 결정은 품질 비교 후 창업자가 합니다.**
- 가격표(`llm.ts` PRICING)는 2026-10-06 공식 표 기준 값이며 **운영 전 최신 가격으로 다시 확인**하세요. 원가 = 입력/1M×입력단가 + 출력/1M×출력단가 + 캐시 읽기/쓰기. 실제 건당 원가는 `generation_jobs.estimated_cost`(USD)에 쌓이며, 출시 전 샘플로 측정해야 합니다.
- 안전 분류기가 요청을 거절하면 서버 측 fallback(`fallbacks: "default"`)으로 한 번 더 시도합니다. 끄려면 `AnthropicLlm({ fallbacks: false })`.

## 6. 모델 비교 방법 (API 키 없이 먼저)
1. `npm run dev` → `/lab` 접속, 샘플 사주를 넣고 상품을 고릅니다.
2. "전체 프롬프트 복사"를 후보 AI(Claude, GPT, Gemini 등) 대화창에 붙여넣습니다.
3. 결과를 `## 섹션 제목` 형식으로 `/lab` 4번 칸에 붙여넣으면 서비스와 같은 자동 검수 결과가 나옵니다.
4. 사주 샘플 30건 이상(경계값·시간 미상 포함)에 대해 **자동 통과율, 재시도율, 토큰, 사람 5축 점수**를 모델별로 표로 비교합니다(합격선은 출시 전 창업자가 정함).

## 7. 배포 순서 (사람의 작업)
```bash
npm run check:functions                       # 공유 코드를 Deno 형식으로 동기화 + 타입 검사
supabase secrets set ANTHROPIC_API_KEY=... LLM_MODEL=claude-opus-5-5 LLM_EFFORT=medium ALLOWED_ORIGIN=https://내도메인
supabase functions deploy generate-report
```
그다음 앱의 구매/엽전 교환 직후 `invokeGenerateReport()`(src/lib/report/remote.ts)를 호출하고 `generation_jobs` 상태를 polling 하도록 `lib/mock/service.ts` 의 `runJob` 자리를 교체합니다.

## 8. 검증되지 않은 것 (출시 전 확인)
- 실제 API 호출·응답 형태(구조화 출력 + fallback 베타 헤더 조합), 응답 시간, 캐시 적중률
- 프롬프트 품질: 문체·공감·"쉬운 설명" 수준, 목표 분량 달성률
- 해석 규칙의 전문가 검수(신강/신약 근사, 지장간 미반영, 합충 범위, 세운 입춘 경계)
- Edge Function 실행 시간 제한(백그라운드 `EdgeRuntime.waitUntil` 사용) 및 동시 실행
- **궁합**: 상대방 입력의 암호화 저장·복호화·30일 삭제 설계가 없어 함수가 501 을 반환합니다(법률 검토 후 설계).
- 대운은 만세력 라이브러리 연동 전이라 "계산 전"으로만 안내합니다(AI가 지어내지 않도록 사실 줄에 명시).
- 성별은 `birth_profiles` 스키마에 없어 이성 인연 별은 재성·관성을 함께 봅니다(대운 계산에도 성별이 필요하니 스키마 결정 필요).
