# R-015 인증·RLS·요청 제한 감사 (2026-10-16)

상태: **NO-GO** — 코드 준비 완료, **격리 staging SQL 검증 PASS(2026-10-16, 부록 1)**, **staging 실제 JWT 인증 E2E 34/34 PASS(2026-10-16, 부록 2)**, **staging 로컬 서버 HTTP 검증 PASS(2026-10-16, 부록 3)**, **호스팅 프리뷰·다중 호스트 검증 미완료(2026-10-17, 부록 4 — staging 부분 진행)**, **호스팅 프리뷰 접근 수단 미확보(2026-10-17, 부록 5 — 이력; 이후 부록 6에서 게스트 공유 프리뷰로 접근 수단 확보)**, **staging 호스팅(공유 프리뷰) HTTP 실측 E2E PASS(2026-10-18, 부록 6 — staging 한정, 운영 검증 아님)**, **운영 DB 미적용**, 운영 한도 미가동. finalApproved=false, 유료 비활성, 미배포.

## 1. 현재 DB 상태 (변경하지 않음)
- public 6개 표 모두 RLS 활성. 정책: birth_profiles(자기 행 ALL), wallets/unlocked_readings/invite_codes(자기 행 SELECT), invite_rewards(당사자 SELECT), reading_price_catalog(정책 없음).
- 문제: anon/authenticated에 표 수준 GRANT 과다(쓰기·TRUNCATE·TRIGGER·REFERENCES 포함 가능). RLS가 행을 막지만 심층 방어 부족. 적용 전 staging에서 실제 grant 스냅샷 재확인 필요.
- 쓰기는 SECURITY DEFINER 함수(spend_coins, ensure_user_setup, apply_invite)로만 수행 — 최소 권한 적용 후에도 영향 없음.

## 2. 코드 변경 (적용됨, 미배포)
- `src/lib/rate-limit.server.ts` 신규: 허용 목록 신뢰 헤더(`TRUSTED_CLIENT_IP_HEADER`: cf-connecting-ip / true-client-ip / x-real-ip)만 사용, x-forwarded-for 불신. 헤더 없거나 형식 이상 → 공유 `unknown` 키(10회/분). IP는 `RATE_LIMIT_PEPPER` HMAC-SHA256로만 사용, 저장·로그·응답 없음. service_role 클라이언트는 함수 내부 동적 import.
- production(published 빌드 또는 `RATE_LIMIT_MODE=production`): pepper(32자 미만)/service role/RPC 실패 시 **fail-closed**.
- preview(dev 서버): 영속 RPC 없으면 "preview-memory-best-effort" 인스턴스별 메모리 한도 — **보안 아님**.
- `src/lib/saju-fns.ts`: 기존 인스턴스 Map·cf/xff 신뢰 제거, 위 모듈 사용.
- 주의: 현재 마이그레이션·비밀값 미설정이므로 **지금 배포하면 공개 미리보기가 전부 차단됨**(의도된 fail-closed).

## 3. 리뷰 전용 SQL (실행 안 함)
- `docs/migrations/REVIEW_ONLY/R015_SAJU_RATE_LIMIT_REVIEW_ONLY.sql`: private_saju.rate_buckets(PK scope+hash+minute), 원자적 INSERT ON CONFLICT DO UPDATE RETURNING, `public.saju_rate_limit_hit` SECURITY DEFINER, 한도 DB 고정, PUBLIC/anon/authenticated EXECUTE 회수, 10분 보관 cleanup.
- `docs/migrations/REVIEW_ONLY/R015_LEAST_PRIVILEGE_REVIEW_ONLY.sql`: 권한 매트릭스 전/후, anon 전면 회수, authenticated는 birth_profiles CRUD + 나머지 4개 SELECT, 가격표 없음.
- `docs/migrations/REVIEW_ONLY/R015_RLS_PGTAP_STAGING_ONLY.sql`: 합성 A/B 사용자 자기/타인 조회·삽입·수정·삭제, anon 거부, 함수 EXECUTE 권한 — 전부 ROLLBACK. **staging 전용, 실행 안 함.**
- 앱은 신뢰 IP가 없을 때 scope `saju_preview_unknown`(DB 고정 10회/분), 그 외 `saju_preview`(30회/분)로 호출 — SQL과 일치.

## 4. 테스트 (실제 실행)
- vitest 55개 통과(QA 수정 후)(기존 44 + `src/test/rate-limit.test.ts` 8): 30 허용/31 거부, RPC 오류 fail-closed, 서로 다른 해시, xff 불신, unknown 공유 키, production 비밀값 누락 fail-closed, 응답에 비밀값·IP 없음. 타입 검사 통과.
- ~~실행 안 함: 인증 2인 실사용자 E2E, pgTAP, 실제 DB 권한 확인~~ → **2026-10-16 부록 기준 갱신(이력)**: 격리 staging에서 실제 DB 권한·RLS·RPC 검증은 SQL 트랜잭션으로 완료(PASS). 실제 JWT/SDK 기반 2인 인증 E2E는 아직 미실행. pgTAP은 staging 플랫폼에서 미지원으로 미사용(아래 부록 참조). → **2026-10-16 실제 JWT E2E 부록에서 2인 실사용자 JWT 인증 E2E 완료(PASS)** — 아래 두 번째 부록 참조.

## 4-1. 최종 QA 수정 (2026-10-16)
- preview에서 pepper가 없으면 모든 요청을 공유 `unknown` 키(10회/분)로 처리 → 메모리에 원시 IP 저장 안 함. RPC 실패 시 메모리 키는 HMAC 해시만. 테스트 추가.
- 배포 빌드(isDev=false)는 `RATE_LIMIT_MODE=preview`여도 강제 production(fail-closed). 테스트 추가.
- pgTAP: 실제 스키마 필수 필드(calendar/leap/birth_date/gender, wallets.coins) 명시, auth.users 픽스처 제거, 타인 UPDATE/DELETE는 0행 처리 후 원본 유지로 검증, plan(22)=실제 단언 22개.

> **경고 — TRUSTED_CLIENT_IP_HEADER:** 값을 설정하는 것만으로 안전하지 않습니다. 실제 앞단 프록시가 사용자가 보낸 같은 이름의 헤더를 제거하고 신뢰 헤더를 직접 다시 쓰는지 staging에서 위조 헤더 요청으로 검증하기 전에는 **설정하지 마세요**. 미설정 시 모든 요청은 공유 키로 엄격 제한됩니다.

## 5. 배포 계획 (승인 후, 순서대로)
1. ~~staging에 두 SQL 적용 → pgTAP 통과 → grant 스냅샷 기록.~~ → **staging SQL 적용·grant 재조회·합성 A/B 권한·RPC 검증 완료(부록 PASS, pgTAP 대신 일반 SQL 트랜잭션 사용)**.
2. ~~staging에서 2인 실사용자(SDK/JWT) 인증 E2E~~ → **완료(2026-10-16 실제 JWT E2E 부록 PASS)**. 남음: 앞단 프록시 신뢰 IP 헤더 검증 + `RATE_LIMIT_PEPPER` 등 운영 비밀값 구성 확인.
3. 운영 DB 적용(별도 명시 승인 필수) → 2인 E2E → 레이트 RPC 실동작 확인 → 그 후에만 publish 검토.
- 롤백: 레이트 SQL은 휘발성 카운터만이라 DROP 안전. 최소 권한은 사전 스냅샷 기반 재부여. 앱은 이전 커밋으로 복원.

## 6. 남은 NO-GO (운영 기준, 2026-10-16 부록 이후 갱신)
**운영(production) 미승인.** 운영 DB quota 마이그레이션 미적용(운영 한도 미가동). 운영 비밀값(`RATE_LIMIT_PEPPER` 32자 이상, `TRUSTED_CLIENT_IP_HEADER`) 미설정·프록시 신뢰 검증 미완료. ~~실제 인증 2계정(SDK/JWT) E2E 미실행~~ → **staging에서 2인 실사용자 JWT 인증 E2E 완료(2026-10-16 실제 JWT E2E 부록 PASS)** — 운영 DB 검증은 아님. KASI 공식 API 대조 대기, R-002~R-014 검수 대기, finalApproved=false, 유료 비활성, 미배포.

---

## 부록: 2026-10-16 독립 Staging 실행 결과

> **환경 구분(중요):** 이 부록은 **격리된 QA/staging 환경**의 결과이며, **운영(production) DB·앱에 대한 검증이 아닙니다.** 운영 DB에는 R015 rate RPC/테이블·최소 권한 SQL이 **적용되지 않았고**, 운영 요청 한도는 여전히 미가동이며 운영 상태는 계속 **NO-GO**입니다.

### staging 환경
- 격리 staging Lovable 프로젝트 ID `f18ad423-6cc1-4cae-a366-f0ca9939bd6e` — **백지 상태로 신규 생성**(운영 프로젝트에서 remix하지 않음), 독립된 데이터베이스.
- 운영 public 6개 표의 구조와 RLS 규칙을 합성 데이터로 재현.
- REVIEW_ONLY SQL 두 건(요청 한도 + 최소 권한)을 **staging에만** 적용.

### staging 적용 후 권한 재조회 (실제 쿼리 확인)
- anon: 전 표 권한 없음.
- authenticated: birth_profiles SELECT/INSERT/UPDATE/DELETE, wallets·unlocked_readings·invite_codes·invite_rewards SELECT.
- `public.saju_rate_limit_hit` RPC: **service_role 전용**(anon/authenticated EXECUTE 없음).

### RLS/권한 트랜잭션 검증 (합성 UUID A/B, 전체 ROLLBACK)
- `SET LOCAL ROLE authenticated` + `request.jwt.claims`로 합성 A/B 사용자 구성.
- A 자기 행 CRUD 실행, B 명의 접근(조회·삽입·수정·삭제) 거부/0행, wallets 직접 쓰기 거부, anon 전 표 거부, RPC 직접 호출 거부 — 전부 통과 후 롤백(흔적 없음).
- **한계: 실제 JWT 토큰·실제 계정 생성 흐름은 검증하지 않음**(합성 claims 기반).

### 요청 한도 RPC 실측 (staging DB, 동일 분 내 순차 호출)
| 시나리오 | 결과 |
|---|---|
| `saju_preview` 31회 순차 | 30회 허용, 1회 거부 |
| `saju_preview_unknown` 11회 | 10회 허용, 1회 거부 |
| 29회 시드 후 동시 10회 | 1회 허용, 9회 거부(카운터 39, 같은 분) — 원자성 확인 |
| 잘못된 해시 형식 / 잘못된 scope | 거부(예외) |

### 기타
- staging 플랫폼에서 `CREATE EXTENSION pgtap`은 미지원으로 거부됨 → pgTAP 대신 **일반 SQL 단언 트랜잭션**으로 동일 항목을 검증(전부 ROLLBACK). 기존 REVIEW_ONLY pgTAP 파일은 문서 목적으로 유지.
- 별도 상세 보고: `docs/R015_STAGING_TEST_RESULTS.md` (작성 예정).

### staging PASS가 의미하는 것 / 다음 단계
- **의미**: 두 REVIEW_ONLY SQL이 격리 환경에서 실제 DB에서 동작함을 확인 — SQL 자체의 결함은 발견되지 않음.
- **다음 단계(전부 승인 전 미실행)**: ① staging에서 실제 Supabase SDK/JWT 2인 인증 E2E, ② 실제 프록시가 신뢰 헤더를 재기록하는지 검증(위조 헤더 테스트), ③ `RATE_LIMIT_PEPPER`(32자 이상)·`TRUSTED_CLIENT_IP_HEADER` 운영 비밀값 구성, ④ 운영 권한 호환 확인, ⑤ **별도 명시적 승인** 후에만 운영 DB 마이그레이션 적용 및 배포.
- R-001 finalApproved=false, 유료 카탈로그 active=false, 사이트 미공개 — 변동 없음.

---

## 부록 2: 2026-10-16 Staging 실제 JWT 인증 E2E 실행 결과

> **환경 구분(중요):** 이 부록은 **격리된 staging 환경의 Supabase 인증(GoTrue)·PostgREST·RLS 동작 검증**이며, **운영(production) DB 정책이나 staging HTTP 서버 미들웨어(신뢰 프록시 헤더·pepper 비밀값·다중 서버 부하)에 대한 검증이 아닙니다.** 운영 DB에는 R015 rate RPC/테이블·최소 권한 SQL이 **적용되지 않았고**, 운영 상태는 계속 **NO-GO**입니다.

### staging 환경
- 동일 격리 staging 프로젝트(부록의 `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`, 별도 Supabase 참조 `ewuiedtpnhmkzdohwdji`)에서 진행. 운영 프로젝트와 완전히 분리된 독립 데이터베이스·인증 인스턴스.
- 이메일/비밀번호 인증(GoTrue)을 **staging 한정, 명시적 사용자 승인 하에** 활성화. 이전 단계의 "Email logins are disabled" 실패를 이 제어로 해결.
- 실제 합성 A/B 계정 2개(`email_confirm: true`, 임시 일회용 비밀번호)를 `signInWithPassword`로 실제 액세스 토큰을 발급받아 테스트. **실제 JWT 발급·검증 경로를 통과**한 최초의 E2E.

### 테스트 결과: 34/34 단언 PASS, 0 FAIL
- 원출처: staging 문서 `docs/R015_REAL_JWT_E2E_AUDIT.md`.
- JWT 형식 검증, `auth.getUser()` A/B 각각 정상 반환.
- A 자기 데이터 CRUD(출생정보 생성·조회·수정·삭제) 정상.
- B 명의 접근: SELECT·INSERT·UPDATE·DELETE 전부 거부(UPDATE/DELETE는 0행 처리 후 원본 유지 확인).
- `wallets`: A 자기 SELECT 허용, 직접 쓰기(UPDATE) 거부.
- anon: 전 표 접근 거부, `spend_coins` 실행 거부.
- authenticated: rate-limit RPC(`saju_rate_limit_hit`) 직접 실행 거부(service_role 전용 유지).
- 변조·깨진(altered/garbage) JWT 토큰 전부 거부.

### 정리(cleanup) 확인
- 테스트 계정·데이터를 staging에서 삭제 후 **독립 SELECT로 재확인**: `auth.users=0`, `birth_profiles=0`, `wallets=0`. 잔여 흔적 없음.
- 이전 단계(합성 claims 기반 SQL 트랜잭션 검증) 및 anon SDK 5/5 테스트도 모두 통과 상태 유지.

### 이 부록이 증명하는 것 / 증명하지 않는 것
- **증명**: staging Supabase의 실제 JWT 발급, GoTrue 인증, PostgREST 경유 RLS 정책, SECURITY DEFINER 함수 EXECUTE 권한이 실제 SDK 경로에서 의도대로 동작함.
- **증명하지 않음(남은 차단 항목)**:
  1. 운영 DB 정책·마이그레이션 적용(별도 명시 승인 필요, 운영 rate RPC는 아직 미적용).
  2. staging HTTP 서버 미들웨어(`rate-limit.server.ts` 런타임)와 앞단 프록시의 신뢰 IP 헤더 재기록 검증.
  3. `RATE_LIMIT_PEPPER`(32자 이상) 등 운영 비밀값 구성.
  4. 다중 서버 인스턴스 부하 상황에서의 quota 공유 동작.

### 운영 상태 (변동 없음)
- 운영 현재 데이터 보존: `birth_profiles=1` 외 변경 없음.
- 운영 DB에 R015 SQL 미적용. 운영·staging 사이트 모두 미공개(unpublished), 유료 상품 inactive, R-001 `finalApproved=false`.
- 실제 SQL 롤아웃은 **추가 명시적 승인 후에만** 진행.

---

## 부록 3: 2026-10-16 Staging 로컬 서버 HTTP 실행 결과

> **환경 구분(중요):** 이 부록은 **격리 staging 프로젝트의 로컬 개발 서버(`localhost:8080`) HTTP 미들웨어 런타임 검증**이며, **호스팅(edge) 서버나 운영(production) DB·프록시에 대한 검증이 아닙니다.** 운영 DB에는 R015 rate RPC/테이블·최소 권한 SQL이 **적용되지 않았고**, 운영 상태는 계속 **NO-GO**입니다.

### staging 환경
- 격리 staging 프로젝트 `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`에서 진행. 상세 원출처: staging 문서 `docs/R015_SERVER_HTTP_AUDIT.md`.
- `POST /api/r015-probe` 서버 전용 엔드포인트로 검증: HMAC pepper와 토큰 비밀값을 서버 비밀값으로 구성하고, **실제 staging Supabase rate RPC**를 호출.
- 검증 대상은 **로컬 dev 서버(`localhost:8080`)만** — 호스팅 edge 서버는 검증하지 않음.

### HTTP 실측 결과 (동일 분 내)
| 시나리오 | 결과 |
|---|---|
| 순차 요청 11회 (동일 분) | 10회 HTTP 200 허용, 11회 HTTP 429 거부 |
| 9회 시드 후 동시 10회 | 1회 허용, 9회 거부 (원자성 확인) |
| 위조 `x-forwarded-for` / `cf-connecting-ip` / `x-real-ip` 헤더 | 별도 quota 미생성 (헤더 불신·공유 키 유지) |
| 토큰 누락 / 오류 토큰 | HTTP 403 |
| 과대 요청 본문 | HTTP 413 |

- `TRUSTED_CLIENT_IP_HEADER`는 **미설정 유지** — 프록시의 신뢰 헤더 재기록이 입증되지 않았으므로 모든 트래픽이 공유 10회/분 한도로 처리됨 (설계대로).
- 비밀값(pepper·토큰)은 로그·응답에 출력되지 않음을 확인.

### 추가 코드 QA (staging 서버 코드에 반영)
- **bounded streaming 요청 본문(최대 1024바이트)**: 멀티바이트 UTF-8과 chunked/Content-Length 전송 모두 안전 처리.
- **엄격한 IP 헤더 허용목록·파싱**: 허용목록 외 헤더 불신, `x-forwarded-for` 계속 불신.
- 테스트: **vitest 27/27 PASS**, HTTP 통합 러너 **7/7 PASS**, typecheck/build PASS.
- **이력(수정 전)**: QA 수정 직후 첫 러너 실행은 5/7 실패였으며 원인은 분(minute) 리셋 버그로 확인 — 수정 후 재실행에서 7/7 PASS.

### 이 부록이 증명하는 것 / 증명하지 않는 것
- **증명**: staging 로컬 서버에서 rate 미들웨어 런타임(본문 한도·헤더 파싱·403/413·HTTP 429 응답·RPC 연동)이 실제 HTTP 경로에서 의도대로 동작함.
- **증명하지 않음(남은 차단 항목)**:
  1. 호스팅 프리뷰/운영 프록시의 신뢰 IP 헤더 재기록 검증 — `TRUSTED_CLIENT_IP_HEADER`는 검증 전까지 설정 금지.
  2. 다중 애플리케이션 서버 인스턴스 부하 상황에서의 quota 공유 동작.
  3. 운영 DB 정책·마이그레이션 적용(별도 명시 승인 필요) 및 운영 비밀값(`RATE_LIMIT_PEPPER` 32자 이상 등) 구성.

### 운영 상태 (변동 없음)
- 운영 DB에 R015 SQL 미적용, 운영 요청 한도 미가동. 운영 사이트 미공개(unpublished), 유료 상품 inactive, R-001 `finalApproved=false` — **NO-GO 유지**.
- 이전 부록의 staging JWT 인증 E2E 34/34 및 anon 5/5 결과는 이력 증거로 그대로 유지하며, 운영 검증으로 오해하지 않도록 본 부록과 함께 명시함.

---

## 부록 4: 2026-10-17 격리 Staging 감사 — 호스팅 프리뷰·다중 호스트 검증 결과 (부분 진행)

> **환경 구분(중요):** 이 부록은 **격리 staging 프로젝트 `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`의 추가 감사 결과**이며, **운영(production) DB·앱·프록시에 대한 검증이 아닙니다.** 운영 DB에는 R015 rate RPC/테이블·최소 권한 SQL이 **여전히 적용되지 않았고**, 운영 상태는 계속 **NO-GO**입니다. 이 부록의 결론은 **staging 부분 진행(partial progress)**이며, 호스팅 환경 검증 통과로 표기하지 않습니다. 원출처: staging 프로젝트 대시보드 감사 문서 `docs/R015_MULTI_HOST_AND_HOSTED_PREVIEW_AUDIT.md`.

### 1. 호스팅 프리뷰(비공개) HTTP 접근 시도 — 검증 불가
- staging에서 기존 **비공개 호스팅 프리뷰**에 대해 GET 루트(`/`)와 보호된 `POST /api/r015-probe`를 서버 측 staging 테스트 비밀값으로 안전하게 시도.
- 두 요청 모두 **HTTP 403, text/plain** 응답, `X-R015-Staging` 마커 없음.
- 트래픽이 staging API에 실제 도달했는지 확인할 수 없어 **호스팅 edge / 신뢰 프록시 헤더 재기록 검증은 NOT TESTED**로 유지. 403의 원인은 로그인 게이트웨이 또는 상위 계층일 수 있음(단정 불가).
- 우회(공유·게시 등) 방법은 사용하지 않음.

### 2. 다중 호스트(독립 프로세스 2개) 부하 실험 — 미실행
- 독립 애플리케이션 프로세스 2개 실행 시도는 **RUN하지 않음**: 관리형 샌드박스에서 두 번째 Vite 프로세스 실행이 금지되고 실행 가능한 컴파일 아티팩트가 없음.
- 독립 프로세스/부하 증거 0건 → **다중 호스트 PASS 주장 금지** 유지.

### 3. Staging URL 가드 강화 및 테스트
- staging URL 가드를 **정확한 staging HTTPS Supabase 정식 호스트명**만 허용하도록 강화: 기만적 접두사/접미사 및 URL 내 자격증명(credential) 포함 값 거부.
- **Vitest 30/30 PASS**, harness build PASS. **명시적 typecheck는 별도 실행하지 않음**(미실행으로 기록).

### 4. 이력 증거의 유효성 유지
- 이전 staging 결과(로컬 서버 HTTP 7/7, 실제 JWT E2E 34/34, anon SDK 5/5)는 이력 증거로 계속 유효하나, **운영 또는 호스팅 테스트 통과를 의미하지 않음**.

### 5. 현재 상태 (변동 없음)
- `TRUSTED_CLIENT_IP_HEADER` **미설정 유지** — 모든 트래픽은 엄격한 공유 `unknown` 10회/분 한도로 처리.
- 비밀값은 **staging 전용**이며 운영 비밀값 구성 없음. 운영 quota SQL **미적용**.
- 운영 사이트 미공개(unpublished), 유료 상품 inactive, R-001 `finalApproved=false`, R-015 **운영 NO-GO**.

### 6. 남은 요구사항 (운영 적용 전, 전부 별도 승인 전 미실행)
1. 공개 게시 없이 **비공개 호스팅 프리뷰에 인증된 접근** 확보 후 프리뷰 라우팅 검증.
2. 리버스 프록시의 신뢰 헤더 **재기록/제거(override/strip)** 동작 검증 — 이 검증 전까지 `TRUSTED_CLIENT_IP_HEADER` 설정 금지(기존 경고 유지).
3. 동일 staging 백엔드·비밀값을 공유하는 **독립 2-애플리케이션-프로세스 harness**와 **호스트 간 HMAC quota 공유** 증명.
4. 위 항목 완료 후 **별도 명시적 승인**을 받아 운영 SQL 마이그레이션 적용 및 배포 검토.

---

## 부록 5: 2026-10-17 Staging 호스팅 프리뷰 접근(공유 링크) 시도 결과 — 접근 수단 미확보

> **환경 구분(중요):** 이 부록은 **격리 staging 프로젝트 `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`의 접근 수단 확인**이며, **운영(production) DB·앱·프록시에 대한 검증이 아닙니다.** 운영 상태는 계속 **NO-GO**입니다. 원출처: staging 문서 `docs/R015_HOSTED_SHARE_ACCESS_2026-10-17.md`.

### 1. 시도 범위: 24시간 이하 임시 VIEW-ONLY 게스트 링크
- 연결된 에이전트가 사용할 수 있는 Lovable 도구에는 **프리뷰 공유 링크 생성/회수 기능 없음** → **링크 생성 0건, 새 호스팅 요청 0건**.
- staging 워크스페이스 요금제는 **Pro**. 공식 문서 기준 Free/Pro의 공유 프리뷰 링크는 **기본 7일 만료**이며, 링크 생성 시 더 짧은 기간을 직접 고를 수 없고 생성 후 만료 기간 변경도 불가.
- **24시간 만료 옵션은 Pro에서 사용할 수 없으므로 존재한다고 주장하지 않는다.**

### 2. 사용자 직접 수행이 필요한 경우 (명시적 동의 시에만)
- 화면 경로: **Share → Share preview → Guest comments(allow comments) 끄기 → 링크 생성/복사**.
- **7일 기본 기간을 수용한다는 명시적 동의 후에만** 진행하며, 테스트가 끝난 즉시 **본인이 링크를 삭제(회수)** 해야 함. 문서상 링크 삭제 외 별도 revoke 기능은 없고, 삭제 반영은 최대 1분 소요.

### 3. 이번 시도에서 수행하지 않은 것
- 호스팅 API 검증, 리버스 프록시 신뢰 헤더 재기록(override/strip) 검증, 독립 2-프로세스(다중 호스트) 부하 테스트 — **모두 미실행**.

### 4. 이력 증거 유지 / 현재 상태
- 이전 staging 결과(실제 JWT E2E 34/34, 로컬 서버 HTTP 7/7, 단위 테스트 30/30)는 이력 증거로 유효하나, **호스팅·운영 통과를 의미하지 않는다**.
- 운영: R015 SQL **미적용**, `public.saju_rate_limit_hit` **미존재**, 요청 한도 미가동. 사이트 미공개, 유료 상품 전부 inactive, R-001 `finalApproved=false` → **운영 NO-GO 유지**.

---

## 부록 6: 2026-10-18 Staging 호스팅(공유 게스트 프리뷰) HTTP 실측 E2E 결과

> **환경 구분(중요):** 이 부록은 **격리 staging 프로젝트 `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`의 공유 게스트 프리뷰(호스팅) HTTP 경로 검증**이며, **운영(production) DB·앱·프록시에 대한 검증이 아닙니다.** 운영 DB에는 R015 rate RPC/테이블·최소 권한 SQL이 **여전히 적용되지 않았고**, 운영 상태는 계속 **NO-GO**입니다. 원출처: staging 문서 `docs/R015_HOSTED_HTTP_REAL_E2E_AUDIT.md` (초기 시도 기록 포함, 통제 후속 검증은 그 문서 7절).

### 1. 초기 게스트 프리뷰 시도 (이력으로 보존)
- 게스트 링크로 호스팅 프리뷰 접근 수단을 확보: 게스트 `GET /` → **HTTP 200**. 실제 staging 엔드포인트에 **토큰 없는 POST(JSON)** → **HTTP 403, `X-R015-Staging: true` 마커 존재**. 토큰 포함 POST(JSON) → **HTTP 200, 마커 true**. 앱까지 트래픽이 도달함을 처음 확인.
- 이어진 혼합 위조 헤더 11회 시퀀스 테스트는 **기대 시퀀스 실패**: 6×200, 5×403(앱 외부 상류에서 거부, 마커 없음), 0×429, 버킷 수 6. 403은 CF 포함 위조 헤더가 상류에서 거부된 것과 상관됨.
- 이 초기 실패는 **의도된 대로 상류 거부가 있음을 보여주는 정직한 이력**으로 그대로 보존하며, 통제 후속 검증(아래 2절)으로 원인을 분리해 재검증함.

### 2. 통제 후속 검증 (2026-10-18, `docs/R015_HOSTED_HTTP_REAL_E2E_AUDIT.md` 7절)

#### 2-1. 토큰 없는 프로브 4종 — 헤더별 상류/앱 경계 분리
| 프로브 | 결과 |
|---|---|
| 헤더 없음 | 앱 JSON 403, `X-R015-Staging` 마커 = true |
| `x-forwarded-for` 단독 | 앱 JSON 403, 마커 = true |
| `cf-connecting-ip` 단독 | 상류 HTML 403, **마커 없음**(quota RPC 도달 없음) |
| 복합 위조 헤더 | 상류 HTML 403, **마커 없음**(quota RPC 도달 없음) |

- staging `TRUSTED_CLIENT_IP_HEADER`는 **계속 미설정** — 모든 트래픽은 엄격한 공유 `unknown` 버킷(10회/분)으로 처리.

#### 2-2. 정상(위조 헤더 없음) 호스팅 HTTP 2단계 — staging 서버 측 비공개 토큰 사용
| 단계 | 시나리오 | 결과 |
|---|---|---|
| A | 새 분(分)에서 HTTP 11회 순차 | **첫 10회 HTTP 200, 11번째 HTTP 429**. DB `saju_preview_unknown` 버킷 1개, 카운트 11. 전부 마커·정확한 JSON·안전한 본문 |
| B | 다음 새 분에서 9×HTTP 200 시드 후 **동시 호스팅 HTTP 10회** | **1×HTTP 200, 9×HTTP 429**. 공유 `unknown` 버킷 1개, 카운트 19. 전부 마커·정확한 JSON |

- DB 카운터로 **실제 호스팅 quota RPC 30회** 동작 확인(단계 A 11 + 단계 B 19).
- 응답에서 **IP·비밀값·HMAC 누출 없음**을 관찰.

### 3. 이번 검증이 증명하는 것 / 증명하지 않는 것
- **증명(staging 한정)**: 공유 게스트 프리뷰(호스팅) 경유 실제 HTTP에서 레이트리밋(200/429), 원자적 quota RPC 연동, DB 카운터 일치, 헤더별 상류/앱 경계 동작이 의도대로 작동함.
- **증명하지 않음(그대로 유지)**:
  1. **프록시 재기록(override/strip) 추론 금지** — 이번 결과만으로 리버스 프록시의 신뢰 헤더 재기록 동작을 단정하지 않음. `TRUSTED_CLIENT_IP_HEADER` 설정은 여전히 금지.
  2. **독립 2-애플리케이션-프로세스(다중 호스트) 부하 증명 없음** — 호스트 간 HMAC quota 공유는 미검증.
  3. **운영(production) 검증 없음** — 운영 DB R015 SQL/RPC 미적용, 운영 요청 한도 미가동.
- 이전 staging 증거(JWT E2E 34/34, anon SDK 5/5, 로컬 서버 HTTP 7/7, 단위 테스트 30/30)는 이력 증거로 유효 유지.

### 4. 현재 상태 (변동 없음)
- 이 감사는 staging 문서와 QA 대시보드만 변경했으며 **서버 보안 코드 변경 없음**.
- staging 사이트는 현재 `is_published=true`(공개 audience) 상태 — **사용자가 직접 비공개로 되돌릴 필요 있음**(이번 감사에서 새 게시/비공개 조치는 하지 않음).
- 운영: 사이트 미공개(unpublished), R015 rate quota SQL/RPC **미적용**, `reading_price_catalog` 전부 inactive, R-001 `finalApproved=false` → **R-015 운영 NO-GO 유지**. 운영 SQL 롤아웃은 별도 명시적 승인 후에만 진행.
