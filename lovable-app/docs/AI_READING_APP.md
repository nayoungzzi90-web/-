# AI 풀이 앱 연결 (2026-11-05) — 기본 꺼짐

기본 사주를 **열람한 사람**에게 "AI 풀이 보기" 버튼이 보인다. 누르면 서버가 판단 카드(R-002~R-005) → GPT 작성 → 코드 자동 검수 → (설정 시) Gemini 독립 감수 → 저장 순서로 만든다.
**지금은 꺼져 있다(`AI_READING_MODE` 미설정 = off).** 꺼져 있으면 AI·DB 를 부르지 않고 "준비 중" 안내만 보인다.

## 구조
| 위치 | 역할 |
|---|---|
| `src/lib/ai-reading.server.ts` | 서버 전용. 설정 읽기(fail-closed), 열람 확인, 4주 이중 확인, 생성·감수·저장, 표시 여부 |
| `src/lib/reading-fns.ts` `getAiReadingFn` | 로그인 필수 서버 함수 |
| `src/components/AiReading.tsx` | 버튼 → 기다리는 화면 → 본문. 다른 요청이 만드는 중이면 8초마다 다시 확인(최대 약 3분) |
| `src/lib/reading-core/` | 상위 저장소 AI 파이프라인 복사본(직접 수정 금지, `sync-reading-core.mjs`) |
| `docs/migrations/REVIEW_ONLY/AI_READINGS_REVIEW_ONLY.sql` | 저장 표 `ai_readings` + service_role 전용 함수 2개. **운영 미적용** |

## 모드
| 모드 | 쓰는 명제 | 보여 주는 것 |
|---|---|---|
| off(기본) | — | "준비 중" 안내만 |
| trial | 전문가 승인 전 초안 포함 | 감수 차단(BLOCK)·실패만 숨기고, "시범 풀이(검수 전)" 표시와 함께 |
| live | 승인된 명제만 | 자동 검수 통과(READY) + Gemini 감수 통과(PASS)만. 감수 설정이 없으면 시작하지 않음 |

지금 모든 카드 문장이 초안이라 **live 로 켜면 풀이가 만들어지지 않는다**(승인된 명제가 없음). 켠다면 trial 부터다.

## 안전장치
- 열람 권한은 서버가 DB 에서 확인(`unlocked_readings`, 본인만). 4주는 두 엔진이 같을 때만.
- 같은 사람·같은 풀이·같은 버전은 한 번만 만든다. 재시도 3번, 5분 넘게 멈춘 작업만 다시 시작.
- 한 사람 하루 새 AI 풀이 3개(기본), 서비스 전체 하루 원가 상한(진행 중 작업은 예약 금액으로 미리 뺌), 풀이 1건 원가 상한, 킬 스위치.
- 모델·DB 에 고객 이름·출생정보 원문을 보내거나 저장하지 않는다(이름은 응답할 때만 넣음, 열람 id 는 해시).
- AI 코드·프롬프트·카드 문장은 서버 번들에만 있다(운영 빌드 검사 `reading-bundle.test.ts`).
- 설정이 하나라도 없거나 DB 함수가 없으면 시작하지 않는다.

## 실측 (개발 환경, 실제 GPT, DB 는 가짜)
- 1995-05-17 14시: 12초, 약 51원(gpt-5.4-mini, 가격 0.75/4.5 USD 가정 — 공식 가격 확인 필요), 이름 DB 미저장 확인.

## 켜는 순서 (각각 사용자 승인 필요)
1. staging 에서 `AI_READINGS_REVIEW_ONLY.sql` 적용·검증(동시 요청은 PGlite 로 검증 못 함) → 운영 적용.
2. 서버 비밀값(배포 환경 변수):
   - `AI_READING_MODE=trial`
   - `AI_MODEL`, `OPENAI_API_KEY`
   - `LLM_PRICE_IN_PER_M`, `LLM_PRICE_OUT_PER_M`(공식 가격), `LLM_REPORT_BUDGET_USD`(예: 0.3), `LLM_DAILY_BUDGET_USD`(예: 5)
   - 선택: `AI_USER_DAILY_MAX`(기본 3), `AI_STALE_SECONDS`(기본 300), `LLM_KILL_SWITCH=true`(즉시 중단)
   - 감수: `AI_REVIEW_MODEL`, `GEMINI_API_KEY`, `AI_REVIEW_PRICE_IN_PER_M`, `AI_REVIEW_PRICE_OUT_PER_M`, `AI_REVIEW_BUDGET_USD`(기본 0.05)
3. 앱 게시(배포).

## 남은 것
- Gemini 실제 호출 확인(키가 붙은 새 세션에서).
- 배포 환경(Cloudflare)에서 요청이 끊기지 않는지 staging 확인(실측 12초라 위험은 낮지만 재시도가 겹치면 더 길어진다). 휴대폰 화면이 꺼지면 요청이 끊길 수 있다 → 그래도 서버 쪽 작업은 5분 뒤 다시 시작 가능하고 원가는 기록된다.
- 연애운·궁합 AI 풀이(전용 카드 필요).
- 저장된 AI 풀이를 사람이 검수하는 화면(needs_review 큐).
