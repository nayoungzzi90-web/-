-- R-015 운영 DB 읽기 전용 스냅샷 (SELECT 한 문장, 아무것도 바꾸지 않음)
--
-- 목적: 운영 반영(요청 제한 SQL·최소 권한 SQL) 전에 "지금 상태"를 한 번에 저장한다.
--   · 현재 권한(GRANT)  → 최소 권한 SQL 의 롤백 근거
--   · RLS·정책·제약·인덱스·트리거 → 스키마를 migrations 로 복원하는 재료(저장소에 SQL 이 없음)
--   · spend_coins / apply_invite / ensure_user_setup 함수 본문 → 돈·초대 보상 로직 검토(F5)
--   · 행 수·집계 → 적용 전후 데이터가 그대로인지 비교
-- 개인정보: 이메일·이름·생년월일·사용자 ID·초대 코드를 **출력하지 않는다**(개수와 집계만).
-- 결과: 'snapshot' 한 칸에 JSON 한 덩어리가 나온다. 그 칸 전체를 복사해서 전달한다.
-- 실행: 운영 DB 이므로 **사용자 본인이 직접**, 읽기 전용으로. 이 파일은 SELECT 한 문장뿐이다.
--       (저장소 테스트가 INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/REVOKE 등이 없음을 검사한다.)

SELECT jsonb_pretty(jsonb_build_object(
  'meta', jsonb_build_object(
    'taken_at', now(), 'server_version', current_setting('server_version'),
    'current_user', current_user, 'session_read_only', current_setting('transaction_read_only')
  ),

  'tables', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'owner', pg_get_userbyid(c.relowner), 'acl', c.relacl::text) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  ),

  -- 롤백 근거: 최소 권한 적용 전 실제 권한
  'grants', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', table_name, 'grantee', grantee, 'privilege', privilege_type)
      ORDER BY table_name, grantee, privilege_type), '[]'::jsonb)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  ),

  'columns', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default) ORDER BY table_name, ordinal_position), '[]'::jsonb)
    FROM information_schema.columns WHERE table_schema = 'public'
  ),

  'constraints', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', conrelid::regclass::text, 'name', conname,
      'type', contype::text, 'definition', pg_get_constraintdef(oid)) ORDER BY conrelid::regclass::text, conname), '[]'::jsonb)
    FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  ),

  'indexes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'name', indexname, 'definition', indexdef)
      ORDER BY tablename, indexname), '[]'::jsonb)
    FROM pg_indexes WHERE schemaname = 'public'
  ),

  'policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname, 'command', cmd,
      'roles', roles::text, 'using', qual, 'with_check', with_check) ORDER BY tablename, policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname = 'public'
  ),

  'triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', tgrelid::regclass::text, 'name', tgname,
      'definition', pg_get_triggerdef(oid)) ORDER BY tgrelid::regclass::text, tgname), '[]'::jsonb)
    FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'public.%'
  ),

  -- F5: 함수 본문 전체(확장이 만든 함수는 제외). SECURITY DEFINER·search_path 고정 여부 포함
  'functions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef, 'config', p.proconfig, 'owner', pg_get_userbyid(p.proowner),
      'acl', p.proacl::text, 'definition', pg_get_functiondef(p.oid)) ORDER BY p.proname), '[]'::jsonb)
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ),

  'function_execute', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('function', f.sig, 'exists', to_regprocedure(f.sig) IS NOT NULL,
      'anon', CASE WHEN to_regprocedure(f.sig) IS NULL THEN NULL ELSE has_function_privilege('anon', f.sig, 'EXECUTE') END,
      'authenticated', CASE WHEN to_regprocedure(f.sig) IS NULL THEN NULL ELSE has_function_privilege('authenticated', f.sig, 'EXECUTE') END,
      'service_role', CASE WHEN to_regprocedure(f.sig) IS NULL THEN NULL ELSE has_function_privilege('service_role', f.sig, 'EXECUTE') END
    ) ORDER BY f.sig), '[]'::jsonb)
    FROM (VALUES ('public.spend_coins(text,integer)'), ('public.ensure_user_setup()'), ('public.apply_invite(text)'),
                 ('public.saju_rate_limit_hit(text,text)')) AS f(sig)
  ),

  -- 요청 제한 SQL 이 아직 없어야 정상(없음=미적용)
  'rate_limit_applied', jsonb_build_object(
    'schema_private_saju_exists', EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private_saju'),
    'rate_buckets_exists', to_regclass('private_saju.rate_buckets') IS NOT NULL),

  'extensions', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) ORDER BY extname), '[]'::jsonb) FROM pg_extension),

  'default_acl', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('role', pg_get_userbyid(defaclrole), 'schema', defaclnamespace::regnamespace::text,
      'objtype', defaclobjtype::text, 'acl', defaclacl::text)), '[]'::jsonb)
    FROM pg_default_acl
  ),

  -- 설정값(개인정보 아님)
  'price_catalog', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('reading_type', reading_type, 'price_coins', price_coins, 'active', active)
      ORDER BY reading_type), '[]'::jsonb)
    FROM public.reading_price_catalog
  ),

  -- 적용 전후 비교용 개수·집계
  'counts', jsonb_build_object(
    'birth_profiles', (SELECT count(*) FROM public.birth_profiles),
    'birth_input_original_not_null', (SELECT count(*) FROM public.birth_profiles WHERE birth_input_original IS NOT NULL),
    'wallets', (SELECT count(*) FROM public.wallets),
    'unlocked_readings', (SELECT count(*) FROM public.unlocked_readings),
    'invite_codes', (SELECT count(*) FROM public.invite_codes),
    'invite_rewards', (SELECT count(*) FROM public.invite_rewards)),

  'wallet_stats', (
    SELECT jsonb_build_object('min', min(coins), 'max', max(coins), 'sum', sum(coins),
      'negative_count', count(*) FILTER (WHERE coins < 0)) FROM public.wallets
  ),

  -- 초대 보상 규칙(하루 5·월 30) 점검용 집계: 개인 식별 없이 최댓값만
  'invite_stats', jsonb_build_object(
    'max_rewards_per_inviter_per_kst_day', (
      SELECT coalesce(max(n), 0) FROM (
        SELECT count(*) AS n FROM public.invite_rewards
        GROUP BY inviter_id, ((created_at AT TIME ZONE 'Asia/Seoul')::date)) t),
    'max_rewards_per_inviter_per_kst_month', (
      SELECT coalesce(max(n), 0) FROM (
        SELECT count(*) AS n FROM public.invite_rewards
        GROUP BY inviter_id, date_trunc('month', created_at AT TIME ZONE 'Asia/Seoul')) t),
    'self_invite_rows', (SELECT count(*) FROM public.invite_rewards WHERE inviter_id = invitee_id),
    'invitees_rewarded_more_than_once', (
      SELECT count(*) FROM (SELECT invitee_id FROM public.invite_rewards GROUP BY invitee_id HAVING count(*) > 1) t)),

  'anomalies', jsonb_build_object(
    'wallets_without_invite_code', (SELECT count(*) FROM public.wallets w WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes c WHERE c.user_id = w.user_id)),
    'users_with_multiple_invite_codes', (SELECT count(*) FROM (SELECT user_id FROM public.invite_codes GROUP BY user_id HAVING count(*) > 1) t),
    'duplicate_invite_codes', (SELECT count(*) FROM (SELECT code FROM public.invite_codes GROUP BY code HAVING count(*) > 1) t))
)) AS snapshot;
