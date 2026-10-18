# R-001 음력 원본 저장 구조 (2026-10-16)

**상태 (2026-10-16 갱신 — 적용 완료)**
- DB column applied and verified: `birth_profiles.birth_input_original text NULL` 1개만 사용자 승인으로 적용·재조회 확인.
- Server save-read implementation: `src/lib/birth-persistence.server.ts`(serializeBirth/deserializeBirth) + `src/lib/user-fns.ts`(saveBirth/getMyData) 구현 완료. 잘못된 입력은 DB write 없음, created_at 보존, 본인 행만(RLS).
- No backfill: 기존 회원 행 UPDATE 없음. legacy 음력(original=null)은 birth_date를 원래 음력 입력으로 그대로 표시(재변환 없음). 기존 회원 프로필 1건도 변경 없음.
- 테스트: vitest 44개 전부 통과(Lovable 환경 기준).
- Pending: 인증된 실사용자 E2E(live authenticated), KASI 공식 API live 대조(서비스키 없음), RLS cross-user 실통합 테스트. 유료 inactive, finalApproved=false 유지. 미배포(unpublished).

## 배경
`birth_profiles.birth_date`는 PostgreSQL `DATE`라서 음력으로는 유효하지만 양력에 없는 숫자(예: 음력 2월 30일)를 원형 그대로 저장할 수 없었습니다. 이를 해결하기 위해 원본 음력 입력을 보존하는 `birth_input_original text NULL` 컬럼을 추가하고, 저장·불러오기 서버 로직을 아래와 같이 구현했습니다.

## 적용 이력
`docs/migrations/R001_BIRTH_INPUT_ORIGINAL_REVIEW_ONLY.sql` — 신규 nullable 컬럼 `birth_input_original text NULL` 하나만 추가하는 review-only SQL. `birth_date` 삭제/타입 변경 없음, 기존 행 UPDATE 없음, 다른 표·권한·원장·잔액 변경 없음. 자동 실행 경로(`supabase/migrations/`)에 두지 않았고, 사용자 승인 후 수동 적용되어 재조회로 확인 완료. 이 SQL 파일은 과거 감사 기록으로만 보존합니다.

## 현재 서버 구현 (적용 완료)

**쓰기 (`saveBirth`, 인증 필수)**
- 사용자 제공값(BirthInput)에 대해 `parseBirthInput`으로 서버 검증(음력이면 변환 + 왕복 검사). 실패 시 저장 거부, DB write 없음.
- lunar: `birth_date` = 변환된 유효 양력 날짜, `birth_input_original` = 원래 음력 `YYYY-MM-DD`, `calendar='lunar'`, `leap` 그대로.
- solar: `birth_date` = 입력 양력, `birth_input_original = null`, `leap=false`.
- 동일 내용 재저장(idempotent), `created_at` 보존.

**읽기 (`getMyData`)**
- lunar + `birth_input_original` 있음(신규 기록) → 화면 날짜 = `birth_input_original`(원본 음력).
- lunar + `birth_input_original` null(기존 legacy) → 기존 동작대로 `birth_date` 값을 원래 음력 입력 숫자로 간주(재변환 없음).
- solar + `birth_input_original` null → `birth_date` 그대로.

## 저장 사례 표 (현재 동작)

| 사례 | birth_date | birth_input_original | 비고 |
|---|---|---|---|
| legacy 음력 (기존 저장분) | 음력 숫자(양력 유효한 경우만 저장됐음) | null | 읽기 시 음력 입력으로 처리, 변경 없음 |
| 2017 윤5/1 | 2017-06-24 | 2017-05-01 (leap=true) | 2017 윤3월은 서버 거부 |
| 2025 윤6/1 | 2025-07-25 | 2025-06-01 (leap=true) | 평6/1은 2025-06-25 |
| 음력 유효·양력 무효 (예: 2월 30일이 있는 해) | 변환된 유효 양력 날짜 | 원래 `YYYY-02-30` | 과거 '저장 불가' 상태 해소 — 원본 음력 보존 |
| 양력 출생 | 입력값 | null | |
| 1900 경계 (음 1899-12-01) | 1900-01-01 | 1899-12-01 | 양력 기준 범위 판단 |
| 2026 경계 | ≤ 2026-12-31 | 원본 | 양력 2027 이후는 거부 |

## RLS
기존 정책 `own birth profile` (authenticated, `user_id = auth.uid()`)이 새 컬럼에도 그대로 적용 — 본인 행만. 신규 정책/권한 불필요, anon 권한 없음.

## Rollback 주의
이 시점 이후에는 **무조건적인 `DROP COLUMN` 롤백을 권고하지 않습니다.** `birth_input_original`에는 컬럼 적용 이후 저장된 신규 음력 원본 데이터가 들어 있고, 이 데이터는 `birth_date`(변환된 양력)만으로는 원형 복원이 불가능하므로 삭제 시 **새 음력 출생 원본 데이터가 영구 소실**됩니다.

롤백이 필요한 경우: 신규 음력 원본 데이터의 보존·이관 계획을 먼저 수립한 뒤에만 컬럼을 다루고, 코드(serialize/deserialize, saveBirth/getMyData)는 이전 read/write 방식으로 되돌리는 접근을 검토하세요. 기존 legacy 행(원본 null)에는 컬럼 제거가 영향을 주지 않습니다.

## 회귀 확인
SQL 파일 하단의 읽기 전용 점검 쿼리(컬럼 존재·null 개수·정책·권한) + vitest 전체(44개 통과), 음력 저장/읽기 왕복(serialize/deserialize 단위 테스트), legacy 음력 행 표시 확인, idempotence(동일 재저장 시 결과 동일·created_at 보존), cross-user 접근 차단(모의 기반 단위 검증). 실DB 기반 인증 E2E는 별도 단계로 남아 있습니다.

## 현재 남은 작업
- 인증된 실사용자 저장/불러오기 E2E(live authenticated flow) — 미실행.
- KASI 공식 API live 대조 — 공공데이터포털 서비스키 없어 대기 중.
- RLS cross-user 실통합 테스트 — 별도 단계.
- finalApproved=false, 유료 상품 inactive, 미배포 — 별도 승인 전까지 유지.
