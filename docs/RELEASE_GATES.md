# 출시 게이트 현황 (자동 PASS 금지)

범례: ✅ 샌드박스에서 구현·테스트됨 / ⏳ 검증 대기(사람·외부) / 🚫 비활성

## 구현 상태 (Mock 기준, `npm test` + E2E)
| 항목 | 상태 | 근거 |
|---|---|---|
| 비회원 무료 캐릭터·운세 (AC-01) | ✅ | E2E |
| 시간 미상 시주 미생성 (AC-02) | ✅ | rules.test |
| 추천 2냥 멱등·상한 5/30·셀프/기존회원 차단 (AC-03/04) | ✅ | rules.test (KST 경계 포함) |
| 가격 변조 거절·웹훅 중복 (AC-05) | ✅ | rules.test, E2E |
| 업전 동시 교환 1회 (AC-06) | ✅(로직) / ⏳ DB 트랜잭션 실측 | `redeem_coins` SQL 은 미실행 |
| 결제 후 생성 실패 → 재시도·환불 요청 (AC-07) | ✅ | E2E |
| 리포트 재열람 동일 (AC-08) | ✅ | E2E |
| 궁합 30일 삭제 (AC-09) | ✅(로직) / ⏳ 서버 크론 | rules.test |
| 타인 리포트 접근 거부 (AC-10) | ✅(로직) / ⏳ RLS 실행 테스트 | `supabase/tests/rls_tests.sql` 미실행 |
| 공유 카드 개인정보 미노출 (AC-11) | ✅ | E2E |
| 연애운 5개 연도 (AC-12) | ✅ | rules.test |

## 차단 조건 (사람이 확인해야 함)
1. ⏳ 만세력 라이브러리 상업 라이선스·50건 검증 → `docs/LIBRARY_EVALUATION.md`
2. ⏳ PG 계약·990원 결제·수수료·웹훅 실거래 (`VITE_FLAG_LIVE_PAYMENT=false`) 🚫
3. ⏳ 궁합 제3자 정보 적법성 (`VITE_FLAG_COMPAT_ENABLED=false` 프로덕션 기본) 🚫
4. ⏳ OAuth(카카오·구글) 콘솔 설정, 계정 연결 정책, RLS 침투 테스트
5. ⏳ AI 모델 품질·원가·개인정보 전송 정책 (`VITE_FLAG_LLM_REPORTS=false`). 현재 리포트는 템플릿 샘플이며 **분량 QA 는 FAIL** 로 표시됨
6. ⏳ 업전 지급·복구 서버 동시성 실측
7. ⏳ 캐릭터 독자 제작·상업 이용권 (`public/characters/README.md`)
8. ⏳ 약관·개인정보처리방침·환불 규정 법률 검토 (현재 자리표시자)
