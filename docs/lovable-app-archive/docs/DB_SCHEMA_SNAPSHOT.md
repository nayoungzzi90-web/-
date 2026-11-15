# DB 스키마 스냅샷 (2026-10-18, 자동 생성 타입에서 추출 — 읽기 전용 기록)

> 이 저장소에는 실제 스키마 SQL(`supabase/migrations`)이 없다. 아래는 `src/integrations/supabase/types.ts`(Lovable Cloud가 생성)에서 읽은 **구조 요약**이며, RLS 정책·GRANT·함수 본문·제약조건은 타입에 없다. 실제 DB와의 일치는 확인되지 않았다.
> 운영 DB 변경 없음. 이 문서는 재현 가능한 마이그레이션으로 가는 첫 단계의 입력 자료다.

## 표 (public, 6개)
| 표 | 컬럼 |
|---|---|
| birth_profiles | user_id(PK), name, calendar, leap, birth_date, birth_input_original(null), birth_time(null), gender, created_at, updated_at |
| wallets | user_id(PK), coins(닢), updated_at |
| unlocked_readings | user_id, reading_id, created_at |
| invite_codes | user_id, code, created_at |
| invite_rewards | inviter_id, invitee_id, created_at |
| reading_price_catalog | reading_type, price_coins(닢), active, updated_at |

## 함수 (public, SECURITY DEFINER 로 문서화됨)
- `ensure_user_setup()` → void : 지갑·초대 코드 준비(가입 보너스 지급 위치로 추정 — 본문 확인 필요)
- `spend_coins(p_reading_id text, p_cost int)` → int(남은 닢) : 카탈로그 가격으로 서버 재검증, 비활성이면 `READING_DISABLED`, 부족하면 `INSUFFICIENT_COINS`
- `apply_invite(p_code text)` → boolean
- (R015 검토 전용, 미적용) `saju_rate_limit_hit(p_scope text, p_identity_hash text)` → boolean

## 권한 모델 (R015 문서 기준)
- RLS: birth_profiles 본인 행 ALL, 나머지 표 본인 SELECT. 쓰기는 위 함수로만.
- 현재 anon/authenticated 의 표 수준 GRANT 가 과다 → `R015_LEAST_PRIVILEGE_REVIEW_ONLY.sql` 로 축소 예정(운영 미적용, 승인 필요).

## 해야 할 일
1. 운영 DB 에서 **읽기 전용**으로 `pg_dump --schema-only`(또는 동등한 쿼리)로 정책·GRANT·함수 본문을 뽑아 `supabase/migrations/` 초안을 만든다 — 실행은 사용자 승인 후.
2. 그 초안을 staging 에 적용해 현 운영과 동일한지 비교한다.

## 재화 용어
화폐는 **엽전**, 단위는 **닢**으로 통일했다(화면 문구). DB 컬럼명 `coins`/`price_coins` 는 그대로 둔다(스키마 변경 없음).
