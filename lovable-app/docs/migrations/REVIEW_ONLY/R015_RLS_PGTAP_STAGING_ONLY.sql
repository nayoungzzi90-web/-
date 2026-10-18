-- R-015 RLS/권한 pgTAP 테스트 — STAGING ONLY. 연결된 운영 DB에서 절대 실행 금지.
-- 전제: 격리 staging DB, R015_LEAST_PRIVILEGE + R015_SAJU_RATE_LIMIT 적용 후, CREATE EXTENSION pgtap.
-- 실행: psql -v ON_ERROR_STOP=1 -f R015_RLS_PGTAP_STAGING_ONLY.sql  (전체 ROLLBACK, 커밋 없음)
-- auth.users 픽스처 불필요: public 표는 auth.users FK가 없고, RLS는 request.jwt.claims의 sub(auth.uid())만 사용.
-- 스키마 근거(현재 DB): birth_profiles(user_id uuid NN, name text NN, calendar NN def 'solar', leap NN def false,
--   birth_date date NN def 2000-01-01, gender NN def 'f'), wallets(user_id NN, coins NN def 0).
BEGIN;
SELECT plan(22);

-- 픽스처 (postgres/소유자 권한으로 삽입, RLS 우회)
INSERT INTO public.birth_profiles (user_id, name, calendar, leap, birth_date, birth_time, gender)
VALUES ('00000000-0000-4000-a000-00000000000a', 'A', 'solar', false, DATE '2000-01-01', NULL, 'f'),
       ('00000000-0000-4000-a000-00000000000b', 'B', 'solar', false, DATE '2000-01-01', NULL, 'f');
INSERT INTO public.wallets (user_id, coins)
VALUES ('00000000-0000-4000-a000-00000000000a', 4), ('00000000-0000-4000-a000-00000000000b', 4);

-- ===== 사용자 A =====
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.birth_profiles), 1, '1 A: 프로필 1건만 보임');
SELECT is((SELECT count(*)::int FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000b'), 0, '2 A: B 프로필 조회 0건');
SELECT lives_ok($$UPDATE public.birth_profiles SET name = 'A2' WHERE user_id = '00000000-0000-4000-a000-00000000000a'$$, '3 A: 자기 수정 실행');
SELECT is((SELECT name FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000a'), 'A2', '4 A: 자기 수정 반영');
-- 타 사용자 UPDATE/DELETE는 RLS상 오류 없이 영향 0행 → 실행 후 소유자 권한에서 원본 유지로 검증(아래 13·14)
SELECT lives_ok($$UPDATE public.birth_profiles SET name = 'HACK' WHERE user_id = '00000000-0000-4000-a000-00000000000b'$$, '5 A: B 수정 시도(0행)');
SELECT lives_ok($$DELETE FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000b'$$, '6 A: B 삭제 시도(0행)');
SELECT throws_ok($$INSERT INTO public.birth_profiles (user_id, name) VALUES ('00000000-0000-4000-a000-00000000000b', 'x')$$, '42501', NULL, '7 A: B 명의 삽입 거부(RLS WITH CHECK)');
SELECT lives_ok($$DELETE FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000a'$$, '8 A: 자기 삭제');
SELECT lives_ok($$INSERT INTO public.birth_profiles (user_id, name, calendar, leap, birth_date, gender) VALUES ('00000000-0000-4000-a000-00000000000a', 'A3', 'solar', false, DATE '2000-01-01', 'f')$$, '9 A: 자기 삽입');
SELECT is((SELECT count(*)::int FROM public.wallets), 1, '10 A: 지갑 1건만');
SELECT throws_ok($$UPDATE public.wallets SET coins = 999$$, '42501', NULL, '11 A: 지갑 UPDATE 권한 없음');
SELECT throws_ok($$SELECT * FROM public.reading_price_catalog$$, '42501', NULL, '12 A: 가격표 접근 거부');
RESET ROLE;

SELECT is((SELECT name FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000b'), 'B', '13 B 프로필 수정 안 됨');
SELECT is((SELECT count(*)::int FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000b'), 1, '14 B 프로필 삭제 안 됨');
SELECT is((SELECT coins FROM public.wallets WHERE user_id = '00000000-0000-4000-a000-00000000000a'), 4, '15 A 지갑 잔액 그대로');

-- ===== 사용자 B (대칭 확인) =====
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.birth_profiles WHERE user_id = '00000000-0000-4000-a000-00000000000a'), 0, '16 B: A 프로필 조회 0건');
RESET ROLE;

-- ===== anon =====
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok($$SELECT * FROM public.birth_profiles$$, '42501', NULL, '17 anon 프로필 거부');
SELECT throws_ok($$SELECT * FROM public.wallets$$, '42501', NULL, '18 anon 지갑 거부');
RESET ROLE;

-- ===== 함수 실행 권한 =====
SELECT ok(NOT has_function_privilege('anon', 'public.spend_coins(text,integer)', 'EXECUTE'), '19 anon spend_coins 불가');
SELECT ok(has_function_privilege('authenticated', 'public.spend_coins(text,integer)', 'EXECUTE'), '20 authenticated spend_coins 가능');
SELECT ok(NOT has_function_privilege('authenticated', 'public.saju_rate_limit_hit(text,text)', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'public.saju_rate_limit_hit(text,text)', 'EXECUTE'), '21 클라이언트 레이트 RPC 불가');
SELECT ok(has_function_privilege('service_role', 'public.saju_rate_limit_hit(text,text)', 'EXECUTE'), '22 service_role 레이트 RPC 가능');

SELECT * FROM finish();
ROLLBACK;
