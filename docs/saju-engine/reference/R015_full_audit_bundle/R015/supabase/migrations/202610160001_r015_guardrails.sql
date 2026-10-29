-- R-015 REFERENCE migration: review against current Supabase project before applying.
-- NEVER run db reset --linked against production.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.rule_releases (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null,
  version text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  approval_status text not null check (approval_status in ('draft','review','approved','retired')),
  approved_by text,
  approved_at timestamptz,
  artifact_uri text not null,
  unique(rule_id,version,content_sha256)
);
revoke all on private.rule_releases from public, anon, authenticated;
grant select,insert,update on private.rule_releases to service_role;

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chart_digest text not null, -- HMAC of normalized chart; not raw birth info
  manifest_digest text not null check (manifest_digest ~ '^[a-f0-9]{64}$'),
  product_code text not null check(product_code in ('free_character','paid_basic_saju','paid_love_fortune')),
  result_status text not null check(result_status in ('candidate','approved','review_required','blocked')),
  interpretation jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analysis_runs_user_created_idx on public.analysis_runs(user_id,created_at desc);
alter table public.analysis_runs enable row level security;
revoke all on public.analysis_runs from anon, authenticated;
grant select on public.analysis_runs to authenticated;
grant select,insert,update,delete on public.analysis_runs to service_role;
create policy analysis_runs_read_own on public.analysis_runs
  for select to authenticated using ((select auth.uid())=user_id);
-- Insert/update/delete intentionally denied to browser roles.

create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta bigint not null check(delta <> 0),
  balance_after bigint not null check(balance_after >= 0),
  idempotency_key text not null,
  source_kind text not null,
  created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
create index if not exists credit_ledger_user_idx on public.credit_ledger(user_id,id desc);
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on public.credit_wallets, public.credit_ledger from anon, authenticated;
grant select on public.credit_wallets, public.credit_ledger to authenticated;
grant select,insert,update on public.credit_wallets to service_role;
grant select,insert on public.credit_ledger to service_role;
create policy wallets_read_own on public.credit_wallets for select to authenticated
  using ((select auth.uid())=user_id);
create policy ledger_read_own on public.credit_ledger for select to authenticated
  using ((select auth.uid())=user_id);

-- Single transactional wallet mutation; call ONLY after server validates payment/referral/entitlement.
-- FUNCTION ACCESS IS SERVICE_ROLE-ONLY; do not expose to anon/authenticated.
create or replace function private.apply_credit_event(
  p_user uuid, p_delta bigint, p_idempotency_key text, p_source_kind text
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_balance bigint; v_old public.credit_ledger%rowtype;
begin
  if p_user is null or p_delta=0 or length(coalesce(p_idempotency_key,''))<8
     or length(coalesce(p_source_kind,''))<3 then
    raise exception 'INVALID_CREDIT_EVENT';
  end if;
  insert into public.credit_wallets(user_id,balance) values(p_user,0)
  on conflict(user_id) do nothing;
  select balance into v_balance from public.credit_wallets where user_id=p_user for update;
  select * into v_old from public.credit_ledger
    where user_id=p_user and idempotency_key=p_idempotency_key;
  if found then
    if v_old.delta<>p_delta or v_old.source_kind<>p_source_kind then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return v_balance;
  end if;
  if v_balance + p_delta < 0 then raise exception 'INSUFFICIENT_CREDITS'; end if;
  update public.credit_wallets set balance=balance+p_delta, updated_at=now()
    where user_id=p_user returning balance into v_balance;
  insert into public.credit_ledger(user_id,delta,balance_after,idempotency_key,source_kind)
    values(p_user,p_delta,v_balance,p_idempotency_key,p_source_kind);
  return v_balance;
end;
$$;
revoke all on function private.apply_credit_event(uuid,bigint,text,text) from public, anon, authenticated;
grant execute on function private.apply_credit_event(uuid,bigint,text,text) to service_role;
-- NOTE: verify owner, schema privileges, default PUBLIC function grants, pgTAP and concurrency tests.
