# R-015 운영 반영 전 점검·체크리스트 (2026-10-18)

상태: **운영 NO-GO 유지.** 이 문서는 코드·SQL 검토 결과와 승인 대기 체크리스트다. 운영 DB 변경·배포·결제 활성화 없음.

## 1. 검토에서 찾은 것
| # | 구분 | 내용 | 조치 |
|---|---|---|---|
| F1 | **버그(수정함)** | `createSupabaseRateRpc` 가 `supabaseAdmin.rpc` 를 변수로 떼어 호출 → `this` 소실로 `TypeError: Cannot read properties of undefined (reading 'rest')`. 이 오류는 production 에서 "영속 한도 실패"로 처리돼 **모든 공개 미리보기 요청이 영구 차단**된다(fail-closed). DB SQL 이 완벽히 적용돼도 마찬가지. | 메서드 호출 형태로 수정 + 실제 supabase-js 를 가짜 PostgREST 서버에 붙이는 회귀 테스트(`rate-limit-rpc.test.ts`) 추가. 옛 코드에서는 테스트가 실패하고 수정 후 통과함을 확인. |
| F2 | 증거의 한계 | staging 의 호스팅 E2E 는 별도 프로브 경로(`/api/r015-probe`)로 수행됐다. **운영에 올라갈 `createSupabaseRateRpc` 경로 자체는 실제 DB 로 검증된 적이 없다**(F1 이 그 증거). | 운영 전에 staging 에서 **실제 앱 코드(`getSajuPreview`)** 로 같은 시나리오(30/10 한도, 429 응답)를 재실행. |
| F3 | 운영 위험 | `cleanup_rate_buckets()` 는 만들어지지만 **스케줄이 없다**("별도 승인"). 스케줄 없이 운영하면 `rate_buckets` 가 계속 커진다. | 운영 적용 시 5분 주기 정리(pg_cron 등)를 같은 승인 범위에 포함. |
| F4 | 설계 한계 | 고정 60초 창이라 창 경계에서 최대 2배(예: 59초에 30회 + 다음 분 0초에 30회) 허용. | 허용 범위로 판단, 문서화. 필요하면 이후 슬라이딩 창으로 교체. |
| F5 | **검토 공백** | `spend_coins`, `apply_invite`, `ensure_user_setup` 본문은 저장소에 없고 어떤 감사에서도 본문 검토가 안 됐다(돈·초대 보상 로직). | 운영에서 읽기 전용으로 `pg_get_functiondef` 를 뽑아 검토: search_path 고정, `auth.uid()` 사용, 동시성(잔액 음수·이중 지급), 초대 하루 5·월 30 한도, 자기 초대 방지. |
| F6 | 적용 위험 | 최소 권한 SQL 은 `REVOKE ALL` 후 `GRANT` 하는 구조라 **중간에 실패하면 앱이 깨진다**. | 트랜잭션 한 덩어리로 실행, 적용 전 GRANT 스냅샷 저장(롤백 근거). |
| F7 | 확인됨 | 앱이 쓰는 권한이 최소 권한 후에도 충족됨: `saveBirth`(upsert=INSERT+UPDATE+SELECT), `clearMyBirth`(DELETE), `getMyData`(wallets/unlocked/invite_codes SELECT), 쓰기는 DEFINER 함수. 가격표는 `spend_coins` 만 읽는다. | — |
| F8 | 확인됨 | SQL 시그니처 `saju_rate_limit_hit(p_scope, p_identity_hash) → boolean` 과 앱 호출, 한도(30/10, DB 고정)가 일치. | — |

## 2. 순서(승인 후, 한 단계씩)
**원칙: 앱 배포보다 DB·비밀값이 먼저.** 앱은 production 에서 fail-closed 이므로 순서를 바꾸면 공개 미리보기가 전부 막힌다.

0. **읽기 전용 스냅샷(승인 불필요한 조회지만 운영이므로 사용자 확인 후)**: 현재 GRANT, 정책, 함수 본문(F5), 행 수(`birth_profiles`, `wallets` …)를 저장.
1. 코드 준비: 이 브랜치(F1 수정 포함)를 staging 에서 위 F2 시나리오로 재검증.
2. **승인 ①** — 요청 제한 SQL 적용(`R015_SAJU_RATE_LIMIT_REVIEW_ONLY.sql`) + 정리 스케줄(F3).
3. 비밀값 설정(서버 전용, 브라우저 노출 금지): `RATE_LIMIT_PEPPER`(무작위 32자 이상), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`. **`TRUSTED_CLIENT_IP_HEADER` 는 설정하지 않는다**(프록시 재기록 검증 전; 미설정이면 모두 공유 `unknown` 10회/분).
4. **승인 ②** — 최소 권한 SQL 적용(`R015_LEAST_PRIVILEGE_REVIEW_ONLY.sql`) — 별도 시점, 한 트랜잭션, 적용 전 스냅샷 보관.
5. 적용 후 검증(읽기 전용): 권한 재조회(anon 0, authenticated 는 표 5개 SELECT + `birth_profiles` CRUD), RPC 가 service_role 만 가능한지, 실제 로그인 2계정으로 자기/타인 접근, 열람·초대 흐름.
6. **승인 ③** — 앱 배포(게시). 게시 후 미리보기 30/10 한도와 429 를 실제로 확인.
- 롤백: 요청 제한 SQL 은 휘발성 카운터뿐이라 DROP 가능(앱은 fail-closed 로 막힘 → 이전 코드로 되돌리거나 한도 코드 복귀). 최소 권한은 0단계 스냅샷으로 그대로 재부여(무조건 `GRANT ALL` 금지).

## 3. 사용자 승인이 필요한 항목(지금 아무것도 실행하지 않음)
- 운영 DB 읽기 조회(0단계), SQL 적용 ①②, 정리 스케줄 생성, 운영 비밀값 설정, 앱 게시, staging 프로젝트 비공개 전환(문서상 현재 공개 상태).

## 4. 여전히 열려 있는 것
- 프록시의 신뢰 헤더 재기록 검증(전까지 헤더 신뢰 금지), 다중 서버 부하에서 quota 공유 증명, 운영 환경에서의 최종 E2E.
- 이번 수정으로 F1 은 닫혔으나 **운영 준비 완료를 뜻하지 않는다.** finalApproved=false, 유료 비활성, 미배포 그대로.

## 5. 운영 스냅샷 이후 갱신 (2026-10-18)
- 운영 DB 읽기 전용 스냅샷을 받았다. **원본과 상세 검토 결과는 보안 정보(권한·함수 본문)를 담고 있어 공개 저장소에 올리지 않는다.**
- 반영된 변경: (1) 분석기가 `information_schema` 권한 조회가 비어 나오는 읽기 전용 계정을 처리(표 ACL 복원), (2) 운영에 `pg_cron` 이 없어 F3 의 정리 스케줄을 대체하는 **요청 제한 SQL v2**(`R015_SAJU_RATE_LIMIT_REVIEW_ONLY_v2.sql`, 함수 안 기회적 정리) 추가 — PGlite 로 한도·권한·정리 확인, **staging 재검증 전까지 미적용**.

## 6. 엽전 가격·결제·원장·초대 보상 (2026-10-21, 검토용·미적용 — 4단계)
- 결정: 1닢 = 900원. 기본 사주 1닢, 궁합 1닢, 심층 연애운 2닢, 택일 2닢, 심층 사주 3닢. 가입 보너스 없음. 초대 보상 1닢은 **초대받은 친구가 처음 결제했을 때**, 그리고 **초대한 사람이 먼저 1닢 이상 결제(환불 제외)한 적이 있을 때만** 지급. 한도는 한국 시간 하루 3명·월 10명(보수적 시작).
- 적용 순서: `PRICING_900_COIN_REVIEW_ONLY.sql`(가격표·허용 상품 확장) → `COINS_PAYMENTS_REFERRAL_REVIEW_ONLY.sql`(주문·결제·원장·초대 연결 표, `create_coin_order`·`credit_purchase`·`refund_purchase`, `apply_invite`·`spend_coins`·`ensure_user_setup` 교체). 둘 다 PGlite 로 시험(`src/lib/lovable-coins-sql.test.ts`, 변이 시험으로 주요 검증이 실제로 잡히는지 확인).
- 지금 DB 가격표는 옛 값(기본·궁합 4닢)이고 `love`·`taekil`·`deep` 은 허용 목록에도 없다 → SQL 적용 전까지 화면 가격(새 값)과 DB 가격이 다르다. 유료 열람은 비활성이라 실제 결제 경로는 막혀 있다.
- 적용 순서에서의 위치: 승인 ②(최소 권한 SQL) 뒤, 승인 ③(앱 게시) 전. 적용 후 함수 ACL 재조회 필수(CREATE OR REPLACE 는 ACL 유지, 새 함수는 SQL 안에서 anon/authenticated 권한 회수).
- 단일 연결(PGlite) 시험으로는 **동시 요청 직렬화(행 잠금)를 검증하지 못한다** → staging 에서 확인 필요.
- 앱 서버 모듈 `src/lib/payments.server.ts`: 결제 모드 기본 꺼짐(`PAYMENTS_MODE`), sandbox 는 가짜 승인, live 는 실제 PG 구현이 없어 NOT_CONFIGURED. 금액은 서버가 정하고 PG 승인 금액이 주문 금액과 같을 때만 충전.
- 앱 토스트 수정: 초대 링크를 적용한 사람에게 "보너스가 지급됐다"고 보여 주던 문구는 사실과 달랐다 → "초대 링크가 적용됐어요" 로 정정(보상은 친구의 첫 결제 때 초대한 사람에게).
- 택일(`taekil:YYYY-MM-DD`) id 형식은 예약값이며 상품 설계 시 확정한다.
- 로그인 후 이동 경로(`?next=`)는 같은 사이트 안의 경로만 허용하도록 정리(`safe-next.ts`).
- (2026-10-29) 환불 규칙 보강: 엽전이 한 개의 잔액이라 "잔액 ≥ 충전량"만 확인하면, 이미 풀이를 연 결제도 보상 엽전이 섞인 잔액으로 환불될 수 있었다. `refund_purchase` 는 이제 그 결제 이후 풀이 열람(spend)이 한 번이라도 있으면 자동 환불하지 않는다(수동 처리). 변이 시험으로 확인. 환불 기간(7일 등)은 정책 확정 후 추가.
- (2026-10-29) 결제 전 동의 기록: `create_coin_order(p_user, p_coins, p_consent_version)` — 동의 버전이 없으면 `CONSENT_REQUIRED`, 있으면 `coin_orders.consent_version/consented_at` 에 기록(사용 개시 후 환불 제한 고지의 근거). 앱은 동의 체크 전에는 충전 버튼을 잠근다.
