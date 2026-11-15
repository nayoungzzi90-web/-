-- R-015 최소 권한 — REVIEW ONLY. 실행 금지(미적용). 데이터 변경 없음(GRANT/REVOKE만).
--
-- 권한 매트릭스 (현재 → 적용 후)
-- 표                      | anon 현재 | anon 후 | authenticated 현재 | authenticated 후
-- birth_profiles          | ALL*      | 없음    | ALL*               | SELECT,INSERT,UPDATE,DELETE (RLS own)
-- wallets                 | ALL*      | 없음    | ALL*               | SELECT (RLS own)
-- unlocked_readings       | ALL*      | 없음    | ALL*               | SELECT (RLS own)
-- invite_codes            | ALL*      | 없음    | ALL*               | SELECT (RLS own)
-- invite_rewards          | ALL*      | 없음    | ALL*               | SELECT (RLS 당사자)
-- reading_price_catalog   | ALL*      | 없음    | ALL*               | 없음
-- * ALL = SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER. RLS가 행 접근을 막고 있으나 표 수준 권한 과다.
--   적용 전 실제 상태는 staging에서 information_schema.role_table_grants 로 재확인할 것.
-- service_role: 변경 없음(ALL 유지).
-- 쓰기 경로: spend_coins / ensure_user_setup / apply_invite 는 SECURITY DEFINER(소유자 권한)라 영향 없음.

REVOKE ALL ON public.birth_profiles, public.wallets, public.unlocked_readings,
              public.invite_codes, public.invite_rewards, public.reading_price_catalog
  FROM anon;
REVOKE ALL ON public.birth_profiles, public.wallets, public.unlocked_readings,
              public.invite_codes, public.invite_rewards, public.reading_price_catalog
  FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.birth_profiles TO authenticated;
GRANT SELECT ON public.wallets, public.unlocked_readings, public.invite_codes, public.invite_rewards TO authenticated;
-- reading_price_catalog: 클라이언트 권한 없음

GRANT ALL ON public.birth_profiles, public.wallets, public.unlocked_readings,
             public.invite_codes, public.invite_rewards, public.reading_price_catalog
  TO service_role;

-- 함수 실행 권한 (현재 확인값 유지: anon 불가)
REVOKE EXECUTE ON FUNCTION public.spend_coins(text, integer), public.ensure_user_setup(), public.apply_invite(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_coins(text, integer), public.ensure_user_setup(), public.apply_invite(text)
  TO authenticated, service_role;

-- 검증 쿼리(적용 후)
-- SELECT grantee, table_name, string_agg(privilege_type, ',' ORDER BY privilege_type)
--   FROM information_schema.role_table_grants
--  WHERE table_schema='public' AND grantee IN ('anon','authenticated') GROUP BY 1,2 ORDER BY 1,2;

-- ROLLBACK (리뷰용): 적용 전 실제 GRANT 스냅샷을 저장해 그대로 재부여. 무조건 ALL 재부여는 권장하지 않음.
