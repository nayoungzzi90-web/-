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
