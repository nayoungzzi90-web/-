-- R001_BIRTH_INPUT_ORIGINAL_REVIEW_ONLY.sql
-- STATUS: REVIEW-ONLY. NOT APPLIED. Do not copy into supabase/migrations without explicit approval.
-- Scope: adds ONE nullable column. No DROP/ALTER TYPE of birth_date, no UPDATE of existing rows,
-- no change to grants, RLS policies, wallets, unlocked_readings, invite_*, reading_price_catalog.

ALTER TABLE public.birth_profiles ADD COLUMN IF NOT EXISTS birth_input_original text NULL;

COMMENT ON COLUMN public.birth_profiles.birth_input_original IS
  'R-001: original lunar input YYYY-MM-DD (may be Gregorian-invalid, e.g. 2025-02-30). NULL for solar and legacy rows.';

-- Existing RLS policy "own birth profile" (ALL, authenticated, user_id = auth.uid()) already covers the
-- new column; no new policy or grant is required.

-- ---------------------------------------------------------------------------
-- ROLLBACK (review-only; column is new and nullable, so dropping it loses only data written after rollout)
-- ALTER TABLE public.birth_profiles DROP COLUMN IF EXISTS birth_input_original;
-- ---------------------------------------------------------------------------

-- REGRESSION CHECKS (read-only, run after applying; no data mutation)
-- 1) column exists, nullable, text:
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='birth_profiles' AND column_name='birth_input_original';
-- 2) existing rows untouched (count of non-null must be 0 immediately after apply):
--   SELECT count(*) FILTER (WHERE birth_input_original IS NOT NULL) AS non_null, count(*) AS total
--     FROM public.birth_profiles;
-- 3) policies unchanged:
--   SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--    WHERE schemaname='public' AND tablename='birth_profiles';
-- 4) grants unchanged on other tables:
--   SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema='public' ORDER BY 1,2,3;
