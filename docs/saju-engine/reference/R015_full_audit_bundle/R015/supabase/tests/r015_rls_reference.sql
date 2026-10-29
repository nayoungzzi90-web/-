-- R-015 pgTAP starter, requires a local Supabase instance with pgTAP enabled.
-- The full two-user simulation must be performed in staging before release.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
select has_table('public','analysis_runs','analysis_runs exists');
select has_table('public','credit_wallets','wallets exists');
select has_table('public','credit_ledger','ledger exists');
select ok((select c.relrowsecurity from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='analysis_runs'), 'RLS enabled on analysis_runs');
select ok((select c.relrowsecurity from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='credit_wallets'), 'RLS enabled on credit_wallets');
select ok((select c.relrowsecurity from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='credit_ledger'), 'RLS enabled on credit_ledger');
select is((select count(*)::integer from pg_policies
  where schemaname='public' and tablename='credit_ledger' and cmd='INSERT'),0,
  'no browser INSERT policies on ledger');
select * from finish();
rollback;
-- Use supabase test db and then independent browser/anon/owner/other-user/service-role E2E tests.
-- This starter checks flags; still test A/B users, anon, and denied writes in staging.
