import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// Lovable 운영 DB 읽기 전용 스냅샷 SQL(lovable-app/docs/ops/R015_PROD_READONLY_SNAPSHOT.sql)을
// 운영과 같은 모양의 모의 스키마(PGlite)에서 실행해 (1) 문법이 맞고 (2) 읽기 전용이며 (3) 개인정보를 내보내지 않음을 확인한다.
const SQL = readFileSync(new URL('../../lovable-app/docs/ops/R015_PROD_READONLY_SNAPSHOT.sql', import.meta.url), 'utf8');

const strip = (s: string) => s.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''");

const MOCK = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.birth_profiles (user_id uuid PRIMARY KEY, name text NOT NULL, calendar text NOT NULL DEFAULT 'solar', leap boolean NOT NULL DEFAULT false,
  birth_date date NOT NULL, birth_input_original text, birth_time text, gender text NOT NULL DEFAULT 'f', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.unlocked_readings (user_id uuid NOT NULL, reading_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, reading_id));
CREATE TABLE public.invite_codes (user_id uuid PRIMARY KEY, code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.invite_rewards (inviter_id uuid NOT NULL, invitee_id uuid NOT NULL PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.reading_price_catalog (reading_type text PRIMARY KEY, price_coins integer NOT NULL, active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.birth_profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own birth profile" ON public.birth_profiles FOR ALL TO authenticated USING (user_id = auth_uid_stub()) WITH CHECK (user_id = auth_uid_stub());
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
CREATE FUNCTION public.spend_coins(p_reading_id text, p_cost integer) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT 0 $$;
CREATE FUNCTION public.ensure_user_setup() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT 1 $$;
CREATE FUNCTION public.apply_invite(p_code text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT true $$;
REVOKE EXECUTE ON FUNCTION public.spend_coins(text, integer), public.ensure_user_setup(), public.apply_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_coins(text, integer), public.ensure_user_setup(), public.apply_invite(text) TO authenticated, service_role;
INSERT INTO public.reading_price_catalog VALUES ('basic', 4, false, now());
`;
// auth.uid() 대용(PGlite 에는 supabase auth 스키마가 없음)
const PRE = `CREATE FUNCTION public.auth_uid_stub() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`;

describe('R015 운영 읽기 전용 스냅샷 SQL', () => {
  it('SELECT 한 문장뿐이고 쓰기·DDL·권한 변경 구문이 없다', () => {
    const code = strip(SQL).trim().replace(/;\s*$/, '');
    expect(code.includes(';')).toBe(false); // 문장이 하나
    expect(/^select\b/i.test(code)).toBe(true);
    const forbidden = /\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|copy|merge|call|execute|vacuum|reindex|comment|set|reset|lock|do)\b/i;
    expect(forbidden.exec(code)?.[0]).toBeUndefined();
  });

  it('운영과 같은 모양의 모의 스키마에서 실행되어 모든 구역이 채워진다', async () => {
    const db = new PGlite();
    await db.exec(PRE + MOCK);
    // 개인정보가 새지 않는지 보려는 표식 행
    await db.exec(`
      INSERT INTO public.birth_profiles (user_id, name, birth_date) VALUES ('00000000-0000-4000-8000-0000000000aa', 'SECRET-NAME-홍길동', DATE '1990-04-19');
      INSERT INTO public.wallets VALUES ('00000000-0000-4000-8000-0000000000aa', 4, now());
      INSERT INTO public.invite_codes VALUES ('00000000-0000-4000-8000-0000000000aa', 'SECRETCODE123', now());
      INSERT INTO public.invite_rewards VALUES ('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000000bb', now());`);
    await db.exec('BEGIN READ ONLY');
    const r = await db.query<{ snapshot: string }>(SQL);
    await db.exec('ROLLBACK');
    expect(r.rows).toHaveLength(1);
    const raw = r.rows[0]!.snapshot;
    const s = JSON.parse(raw);

    expect(s.meta.session_read_only).toBe('on');
    expect(s.tables.map((t: { table: string }) => t.table).sort()).toEqual(['birth_profiles', 'invite_codes', 'invite_rewards', 'reading_price_catalog', 'unlocked_readings', 'wallets']);
    expect(s.tables.find((t: { table: string }) => t.table === 'birth_profiles').rls_enabled).toBe(true);
    // 현재 과다 권한이 그대로 기록된다(롤백 근거)
    expect(s.grants.some((g: { table: string; grantee: string; privilege: string }) => g.table === 'wallets' && g.grantee === 'anon' && g.privilege === 'TRUNCATE')).toBe(true);
    expect(s.policies[0].name).toBe('own birth profile');
    const spend = s.functions.find((f: { name: string }) => f.name === 'spend_coins');
    expect(spend.security_definer).toBe(true);
    expect(spend.config).toContain('search_path=""');
    expect(spend.definition).toContain('FUNCTION public.spend_coins');
    const fe = Object.fromEntries(s.function_execute.map((f: { function: string }) => [f.function, f]));
    expect(fe['public.spend_coins(text,integer)']).toMatchObject({ exists: true, anon: false, authenticated: true, service_role: true });
    expect(fe['public.saju_rate_limit_hit(text,text)']).toMatchObject({ exists: false, anon: null });
    expect(s.rate_limit_applied).toEqual({ schema_private_saju_exists: false, rate_buckets_exists: false });
    expect(s.price_catalog).toEqual([{ reading_type: 'basic', price_coins: 4, active: false }]);
    expect(s.counts).toMatchObject({ birth_profiles: 1, wallets: 1, invite_codes: 1, invite_rewards: 1, birth_input_original_not_null: 0 });
    expect(s.wallet_stats).toMatchObject({ min: 4, max: 4, sum: 4, negative_count: 0 });
    expect(s.invite_stats).toMatchObject({ max_rewards_per_inviter_per_kst_day: 1, max_rewards_per_inviter_per_kst_month: 1, self_invite_rows: 0, invitees_rewarded_more_than_once: 0 });
    expect(s.anomalies).toMatchObject({ wallets_without_invite_code: 0, duplicate_invite_codes: 0 });

    // 개인정보 비노출
    for (const secret of ['SECRET-NAME', '홍길동', 'SECRETCODE123', '00000000-0000-4000-8000-0000000000aa', '1990-04-19']) expect(raw).not.toContain(secret);
    await db.close();
  });
});

describe('스냅샷 분석기', () => {
  it('과다 권한·search_path 누락·한도 초과·유료 활성을 잡고, 정상 상태는 FAIL 이 없다', async () => {
    // @ts-expect-error mjs 스크립트에는 타입 선언이 없다
    const { analyze } = (await import('../../lovable-app/scripts/analyze-snapshot.mjs')) as { analyze: (s: unknown) => { level: string; msg: string }[] };
    const good = {
      tables: [{ table: 'wallets', rls_enabled: true }],
      policies: [{ table: 'wallets', name: 'own' }],
      grants: [{ table: 'wallets', grantee: 'authenticated', privilege: 'SELECT' }],
      functions: ['spend_coins', 'ensure_user_setup', 'apply_invite'].map((name) => ({ name, security_definer: true, config: ['search_path=""'], definition: 'auth.uid()' })),
      function_execute: [{ function: 'public.spend_coins(text,integer)', exists: true, anon: false, authenticated: true, service_role: true }, { function: 'public.saju_rate_limit_hit(text,text)', exists: false, anon: null }],
      rate_limit_applied: { schema_private_saju_exists: false, rate_buckets_exists: false },
      price_catalog: [{ reading_type: 'basic', price_coins: 4, active: false }], counts: { wallets: 1 }, wallet_stats: { negative_count: 0 },
      invite_stats: { max_rewards_per_inviter_per_kst_day: 2, max_rewards_per_inviter_per_kst_month: 9, self_invite_rows: 0, invitees_rewarded_more_than_once: 0 }, anomalies: { duplicate_invite_codes: 0, users_with_multiple_invite_codes: 0 },
    };
    expect(analyze(good).filter((o) => o.level === 'FAIL' || o.level === 'WARN')).toEqual([]);
    const bad = JSON.parse(JSON.stringify(good));
    bad.grants.push({ table: 'wallets', grantee: 'anon', privilege: 'SELECT' }, { table: 'wallets', grantee: 'authenticated', privilege: 'TRUNCATE' });
    bad.functions[0].config = null;
    bad.function_execute[0].anon = true;
    bad.invite_stats.max_rewards_per_inviter_per_kst_day = 6;
    bad.wallet_stats.negative_count = 1;
    bad.price_catalog[0].active = true;
    const msgs = analyze(bad).filter((o) => o.level !== 'INFO').map((o) => o.msg).join('\n');
    for (const k of ['anon 이 wallets', 'TRUNCATE', 'search_path 미고정', 'anon 이 실행 가능', '하루 6건', '음수 잔액', 'active=true']) expect(msgs).toContain(k);
  });
});
