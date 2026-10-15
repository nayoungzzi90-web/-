-- 오행 친구들 v1.0 초기 스키마 (설계안: 실행 전 검토·확인 필요, 신규 프로젝트 전용이라 파괴적 변경 없음)
-- 원칙: 모든 개인 데이터 테이블 RLS 기본 거부. 쓰기는 서버(Edge Function, service_role)·SECURITY DEFINER RPC 만.
-- service_role 키는 브라우저에 절대 두지 않는다.
create extension if not exists pgcrypto;

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text, is_admin boolean not null default false,
  created_at timestamptz not null default now(), deleted_at timestamptz
);
create table birth_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  guest_session_id text, birth_date date not null,
  calendar_type text not null check (calendar_type in ('solar','lunar')),
  leap_month boolean not null default false, birth_time time, time_unknown boolean not null default false,
  birth_country text not null default 'KR' check (birth_country = 'KR'),
  created_at timestamptz not null default now(), expires_at timestamptz,
  check (owner_user_id is not null or guest_session_id is not null),
  check (time_unknown or birth_time is not null)
);
create index on birth_profiles(owner_user_id); create index on birth_profiles(guest_session_id);
create table saju_charts (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references birth_profiles(id) on delete cascade,
  facts_json jsonb not null, engine_version text not null, rules_version text not null, input_hash text not null,
  created_at timestamptz not null default now(), unique (birth_profile_id, input_hash, engine_version, rules_version)
);
create table character_results (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references saju_charts(id) on delete cascade,
  character_id text not null, expression_id text not null, prop_id text not null, epithet_id text not null,
  version text not null, created_at timestamptz not null default now(), unique (chart_id, version)
);
create table daily_fortunes (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references saju_charts(id) on delete cascade,
  fortune_date_kst date not null, text_json jsonb not null, version text not null,
  created_at timestamptz not null default now(), unique (chart_id, fortune_date_kst, version)
);
create table products (
  id text primary key, name text not null,
  price_krw integer not null check (price_krw >= 0), coin_cost integer not null check (coin_cost >= 0),
  launch_status text not null check (launch_status in ('free','active','coming_soon')), version integer not null default 1
);
insert into products(id,name,price_krw,coin_cost,launch_status) values
 ('character','나의 사주 캐릭터',0,0,'free'), ('daily','오늘의 운세',0,0,'free'),
 ('basic','기본사주',900,1,'active'), ('compatibility','궁합',900,1,'active'), ('love_deep','심층 연애운',2900,3,'active'),
 ('date_selection','택일',1900,2,'coming_soon'), ('saju_deep','심층사주',3900,4,'coming_soon');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_id text not null references products(id), subject_id text not null,
  amount_krw integer not null check (amount_krw >= 0), coin_cost integer not null default 0 check (coin_cost >= 0),
  method text not null check (method in ('cash','coin')),
  status text not null check (status in ('pending','paid','failed','cancelled','refund_requested','refunded')),
  idempotency_key text not null unique, created_at timestamptz not null default now()
);
create index on orders(user_id);
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id), pg_provider text not null,
  pg_payment_id text not null, approved_amount integer not null check (approved_amount >= 0),
  status text not null, created_at timestamptz not null default now(),
  unique (pg_provider, pg_payment_id), unique (order_id)
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_id text not null references products(id), subject_id text not null,
  body_json jsonb, evidence_json jsonb, status text not null default 'pending' check (status in ('pending','ready','failed','expired')),
  generated_at timestamptz, expires_at timestamptz, deleted_at timestamptz,
  rule_version text, prompt_version text, model_version text, engine_version text, created_at timestamptz not null default now()
);
create index on reports(user_id);
create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id), order_id uuid not null references orders(id),
  product_id text not null references products(id), subject_id text not null,
  report_id uuid references reports(id), status text not null default 'active' check (status in ('active','revoked')),
  idempotency_key text not null unique, created_at timestamptz not null default now()
);
create index on entitlements(user_id);
create table compatibility_sessions (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id),
  birth_input_a_encrypted bytea, birth_input_b_encrypted bytea,   -- 만료 시 null 로 삭제
  report_id uuid references reports(id), expires_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create table referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (char_length(code) >= 10), created_at timestamptz not null default now(), revoked_at timestamptz
);
create table referral_attributions (
  id uuid primary key default gen_random_uuid(),
  guest_session_id text not null, referred_user_id uuid references auth.users(id),
  referrer_user_id uuid not null references auth.users(id), captured_at timestamptz not null default now(),
  status text not null default 'captured' check (status in ('captured','rewarded','rejected')), reason text
);
create table referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id), referred_user_id uuid not null references auth.users(id),
  award_coins integer not null check (award_coins >= 0), status text not null check (status in ('approved','rejected')),
  reason text, kst_date date not null, awarded_at timestamptz not null default now(),
  idempotency_key text not null unique,
  unique (referrer_user_id, referred_user_id),
  check (referrer_user_id <> referred_user_id)                       -- 셀프 추천 차단
);
create index on referral_rewards(referrer_user_id, kst_date);
create table coin_ledger (                                          -- append-only
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id), delta integer not null check (delta <> 0),
  reason text not null, source_id text not null, balance_after integer not null check (balance_after >= 0), -- 음수 잔액 방지
  idempotency_key text not null unique, created_at timestamptz not null default now()
);
create index on coin_ledger(user_id, created_at);
create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id), report_id uuid references reports(id),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  attempt_count integer not null default 0 check (attempt_count <= 3),   -- 최초 + 재시도 2회
  tokens_in integer, tokens_out integer, estimated_cost numeric(12,4), last_error text,
  created_at timestamptz not null default now()
);
create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id), action text not null,
  target_type text not null, target_id text not null, reason text not null, created_at timestamptz not null default now()
);
create table privacy_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null, resource_id text not null, due_at timestamptz not null,
  completed_at timestamptz, error text, attempts integer not null default 0
);

-- 원장 불변성: UPDATE/DELETE 금지
create function forbid_mutation() returns trigger language plpgsql as $$ begin raise exception 'append-only table'; end $$;
create trigger coin_ledger_immutable before update or delete on coin_ledger for each row execute function forbid_mutation();
create trigger admin_audit_immutable before update or delete on admin_audit_logs for each row execute function forbid_mutation();

-- RLS: 기본 거부 후 "내 행 읽기"만 허용. INSERT/UPDATE/DELETE 정책은 없음 → 클라이언트 쓰기 전면 차단.
do $$ declare t text; begin
  foreach t in array array['profiles','birth_profiles','saju_charts','character_results','daily_fortunes','compatibility_sessions','products','orders','payments','entitlements','reports','referral_codes','referral_attributions','referral_rewards','coin_ledger','generation_jobs','admin_audit_logs','privacy_deletion_jobs']
  loop execute format('alter table %I enable row level security', t); execute format('alter table %I force row level security', t); end loop; end $$;

create policy products_read on products for select using (true);
create policy profiles_own on profiles for select using (user_id = auth.uid());
create policy birth_own on birth_profiles for select using (owner_user_id = auth.uid());
create policy charts_own on saju_charts for select using (exists (select 1 from birth_profiles b where b.id = birth_profile_id and b.owner_user_id = auth.uid()));
create policy chars_own on character_results for select using (exists (select 1 from saju_charts c join birth_profiles b on b.id = c.birth_profile_id where c.id = chart_id and b.owner_user_id = auth.uid()));
create policy daily_own on daily_fortunes for select using (exists (select 1 from saju_charts c join birth_profiles b on b.id = c.birth_profile_id where c.id = chart_id and b.owner_user_id = auth.uid()));
create policy orders_own on orders for select using (user_id = auth.uid());
create policy payments_own on payments for select using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy ent_own on entitlements for select using (user_id = auth.uid());
create policy reports_own on reports for select using (user_id = auth.uid() and deleted_at is null and (expires_at is null or expires_at > now()));
create policy ref_codes_own on referral_codes for select using (user_id = auth.uid());
create policy ref_rewards_own on referral_rewards for select using (referrer_user_id = auth.uid());
create policy ledger_own on coin_ledger for select using (user_id = auth.uid());
-- compatibility_sessions(암호화 입력), generation_jobs, admin_audit_logs, privacy_deletion_jobs, referral_attributions: 정책 없음 = 서버 전용.
-- 관리자는 profiles.is_admin 플래그를 브라우저에서 믿지 않고, Edge Function 이 서버에서 검증(+MFA) 후 service_role 로 처리한다.

-- 엽전 교환: 잔액 검증 → 차감 → 주문 → 권한을 한 트랜잭션으로 (동시 2회 클릭 시 한 번만)
create function redeem_coins(p_user uuid, p_product text, p_subject text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_prod products; v_key text; v_bal integer; v_order uuid; v_ent uuid;
begin
  select * into v_prod from products where id = p_product and launch_status = 'active';
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  v_key := format('redeem:%s:%s:%s', p_user, p_product, p_subject);
  select id into v_ent from entitlements where idempotency_key = v_key;
  if found then return v_ent; end if;
  perform pg_advisory_xact_lock(hashtext(p_user::text));              -- 사용자 단위 직렬화
  select id into v_ent from entitlements where idempotency_key = v_key;
  if found then return v_ent; end if;
  select coalesce(sum(delta),0) into v_bal from coin_ledger where user_id = p_user;
  if v_bal < v_prod.coin_cost then raise exception 'INSUFFICIENT_COINS'; end if;
  insert into coin_ledger(user_id,delta,reason,source_id,balance_after,idempotency_key)
    values (p_user, -v_prod.coin_cost, 'redeem', v_key, v_bal - v_prod.coin_cost, v_key);
  insert into orders(user_id,product_id,subject_id,amount_krw,coin_cost,method,status,idempotency_key)
    values (p_user,p_product,p_subject,0,v_prod.coin_cost,'coin','paid',v_key) returning id into v_order;
  insert into entitlements(user_id,order_id,product_id,subject_id,idempotency_key)
    values (p_user,v_order,p_product,p_subject,v_key) returning id into v_ent;
  return v_ent;
end $$;
revoke all on function redeem_coins(uuid,text,text) from public, anon, authenticated;  -- Edge Function(service_role)만 호출
