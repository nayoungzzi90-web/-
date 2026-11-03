# Gemini 독립 감수 (review-1.0)

GPT 가 쓴 풀이를 다른 회사 모델(Gemini)이 계산 사실·해석 명제와 대조해 문제 문장을 찾는다.

## 원칙
- Gemini 는 **문제 목록만** 낸다. 통과(PASS)·검토(REVIEW)·차단(BLOCK)은 `src/lib/report/review.ts` 의 `decideVerdict` 코드가 정한다.
- Gemini 는 사주를 다시 계산하지 않는다. 결정론 엔진 값이 정답이다.
- 고객 이름과 고민 글은 보내지 않는다(이름은 `{{이름}}` 으로 되돌려 보냄).
- Gemini 가 인용한 문장이 본문에 실제로 없으면 판정에 쓰지 않는다(지어낸 인용 무시).
- 감수 오류·형식 오류는 PASS 가 아니라 REVIEW. 두 모델이 동의해도 정확성 보증이 아니다.

## 판정 규칙
| 상황 | 판정 |
|---|---|
| 지적 없음, 또는 가벼운 지적 2개 이하 | PASS |
| 무거운(major) 지적 중 사실과 어긋남·예언·민감(건강·돈 결정·법) | BLOCK |
| 그 밖의 무거운 지적, 또는 가벼운 지적 3개 이상, 또는 감수 실패 | REVIEW |

PASS 가 아니면 풀이 상태가 READY → NEEDS_REVIEW 로 내려간다(`applyReview`). 올리지는 않는다.

## 켜는 법
1. Gemini API 키를 환경의 **네트워크 비밀**에 등록하고 `generativelanguage.googleapis.com` 접속을 허용한다.
2. **새 세션**을 연다(비밀은 새 세션부터 적용된다).
3. 측정: `REVIEW_MODEL=<공식 모델 이름> OUT_DIR=... NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx vite-node scripts/measure-ai.ts 2 basic`
   - 모델 이름과 가격(`REVIEW_PRICE_IN_PER_M`, `REVIEW_PRICE_OUT_PER_M`)은 공식 페이지에서 확인해 넣는다. 스크립트 기본 가격은 미확인 값이다.

## 상태
- 코드·시험 완료(가짜 모델로 시험). **실제 Gemini 호출은 아직 못 했다**(2026-11-03 세션에서 키가 붙지 않음).
- 서비스 서버(Edge Function)에는 아직 연결하지 않았다(배포 승인 필요).
