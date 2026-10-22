import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// 회원 탈퇴 SQL(ACCOUNT_DELETION_REVIEW_ONLY.sql, 검토용·미적용)을 모의 스키마에서 적용 순서대로 실행해 확인한다.
// 실제 회원 데이터는 건드리지 않는다(전부 인메모리 가상 DB).
const read = (f: string) => readFileSync(new URL(`../../lovable-app/docs/migrations/REVIEW_ONLY/${f}`, import.meta.url), 'utf8');
const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT SELECT ON auth.users TO service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    CREATE TABLE public.birth_profiles (user_id uuid PRIMARY KEY, name text NOT NULL, calendar text NOT NULL DEFAULT 'solar', leap boolean NOT NULL DEFAULT false, birth_date date NOT NULL DEFAULT '2000-01-01', birth_time text, gender text NOT NULL DEFAULT 'f', birth_input_original text);
    CREATE TABLE public.wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_codes (code text PRIMARY KEY, user_id uuid NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_rewards (invitee_id uuid PRIMARY KEY, inviter_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.unlocked_readings (user_id uuid NOT NULL, reading_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, reading_id));
    CREATE TABLE public.reading_price_catalog (reading_type text PRIMARY KEY, price_coins integer NOT NULL, active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT reading_price_catalog_price_coins_check CHECK (price_coins > 0),
      CONSTRAINT reading_price_catalog_reading_type_check CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text])));
    INSERT INTO public.reading_price_catalog VALUES ('basic', 4, false, now()), ('compat', 4, false, now());
  `);
  for (const f of ['PRICING_900_COIN_REVIEW_ONLY.sql', 'COINS_PAYMENTS_REFERRAL_REVIEW_ONLY.sql', 'ACCOUNT_DELETION_REVIEW_ONLY.sql']) await db.exec(read(f));
  return db;
}
const one = async <T>(db: PGlite, sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
const n = async (db: PGlite, table: string, user?: number, col = 'user_id') => (await one<{ n: number }>(db, `SELECT count(*)::int AS n FROM public.${table}${user === undefined ? '' : ` WHERE ${col} = '${U(user)}'`}`))[0]!.n;
const as = (db: PGlite, id: number | null) => db.exec(`SELECT set_config('test.uid', '${id === null ? '' : U(id)}', false)`);
const member = async (db: PGlite, id: number, createdAgo = '0 minutes') => {
  await db.query('INSERT INTO auth.users (id, created_at) VALUES ($1, now() - $2::interval)', [U(id), createdAgo]);
  await as(db, id);
  await db.exec('SELECT public.ensure_user_setup()');
  await db.query(`INSERT INTO public.birth_profiles (user_id, name, birth_date, birth_time, gender) VALUES ($1, '홍길동-비밀', DATE '1990-04-19', '14:00', 'f')`, [U(id)]);
};
let seq = 0;
const buy = async (db: PGlite, id: number, coins: number) => {
  const oid = (await one<{ id: string }>(db, 'SELECT public.create_coin_order($1,$2) AS id', [U(id), coins]))[0]!.id;
  return (await one<{ r: Record<string, unknown> }>(db, 'SELECT public.credit_purchase($1,$2,$3,$4) AS r', [oid, 'test', `pay-${++seq}`, coins * 900]))[0]!.r;
};
const del = async (db: PGlite, id: number, forfeit = false) => (await one<{ r: Record<string, unknown> }>(db, 'SELECT public.delete_member_data($1,$2) AS r', [U(id), forfeit]))[0]!.r;

describe('delete_member_data', () => {
  it('개인 식별 정보·이용 기록은 지우고 결제·원장·보상 기록은 남긴다, 다른 회원은 그대로', async () => {
    const db = await setup();
    await member(db, 100); await buy(db, 100, 1);
    await member(db, 1); await buy(db, 1, 2);
    await db.exec(`UPDATE public.reading_price_catalog SET active = true WHERE reading_type = 'basic'`);
    await as(db, 1); await db.query(`SELECT public.spend_coins('basic', 1)`); // 지갑 1 남김
    await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id) VALUES ($1, $2)`, [U(1), U(100)]);

    const r = await del(db, 1, true);
    expect(r).toEqual({ deleted: true, forfeited_coins: 1 });
    for (const t of ['birth_profiles', 'wallets', 'unlocked_readings', 'invite_codes']) expect(await n(db, t, 1), t).toBe(0);
    // 남기는 것
    expect(await n(db, 'coin_purchases', 1)).toBe(1);
    expect(await n(db, 'coin_orders', 1)).toBe(1);
    expect(await n(db, 'invite_rewards', 1, 'invitee_id')).toBe(1);
    const led = await one<{ delta: number; reason: string; balance_after: number; ref: string }>(db, `SELECT delta, reason, balance_after, ref FROM public.coin_ledger WHERE user_id=$1 ORDER BY id`, [U(1)]);
    expect(led.map((x) => [x.delta, x.reason])).toEqual([[2, 'purchase'], [-1, 'spend'], [-1, 'adjust']]); // 소멸도 원장에 남음
    expect(led.at(-1)).toMatchObject({ balance_after: 0, ref: 'account_deleted' });
    // 다른 회원은 그대로
    for (const t of ['birth_profiles', 'wallets', 'invite_codes']) expect(await n(db, t, 100), t).toBe(1);
    // 감사 기록: 개인정보 없음, 보관 만료일 ≈ 오늘 + 5년
    const a = (await one<{ forfeited_coins: number; retained_until: string; yrs: number }>(db, `SELECT forfeited_coins, retained_until::text, (retained_until - (now() AT TIME ZONE 'Asia/Seoul')::date) AS yrs FROM public.account_deletions WHERE user_id=$1`, [U(1)]))[0]!;
    expect(a.forfeited_coins).toBe(1);
    expect(a.yrs).toBeGreaterThanOrEqual(365 * 5);
    expect(a.yrs).toBeLessThanOrEqual(365 * 5 + 2);
    // 남은 기록 어디에도 이름·생년월일이 없다
    const dump = JSON.stringify(await one(db, 'SELECT * FROM public.coin_purchases')) + JSON.stringify(await one(db, 'SELECT * FROM public.coin_ledger')) + JSON.stringify(await one(db, 'SELECT * FROM public.account_deletions'));
    expect(dump).not.toMatch(/홍길동|1990-04-19/);
    await db.close();
  });

  it('남은 엽전이 있는데 동의(forfeit)가 없으면 거부하고 아무것도 지우지 않는다', async () => {
    const db = await setup();
    await member(db, 1); await buy(db, 1, 2);
    await expect(del(db, 1, false)).rejects.toThrow(/COINS_REMAIN/);
    expect(await n(db, 'birth_profiles', 1)).toBe(1);
    expect(await n(db, 'wallets', 1)).toBe(1);
    expect(await n(db, 'account_deletions')).toBe(0);
    // 엽전이 0 이면 동의 없이도 삭제
    await member(db, 2);
    expect(await del(db, 2, false)).toEqual({ deleted: true, forfeited_coins: 0 });
    await db.close();
  });

  it('멱등: 두 번째 호출은 아무것도 하지 않고, 대기 중 주문은 취소되며, 초대 연결은 정리된다', async () => {
    const db = await setup();
    await member(db, 100); await buy(db, 100, 1);
    await member(db, 1);
    await member(db, 2);
    const code = (await one<{ code: string }>(db, 'SELECT code FROM public.invite_codes WHERE user_id=$1', [U(100)]))[0]!.code;
    await as(db, 1); await db.query('SELECT public.apply_invite($1)', [code]); // 1 → 100 대기 연결
    await db.query('SELECT public.create_coin_order($1, 1)', [U(1)]); // 결제 대기 주문
    // 초대자(100)가 아니라 초대받은 사람(1)이 탈퇴: 연결 삭제 + 주문 취소
    await del(db, 1);
    expect(await n(db, 'referrals', 1, 'invitee_id')).toBe(0);
    expect((await one<{ status: string }>(db, `SELECT status FROM public.coin_orders WHERE user_id=$1`, [U(1)])).every((o) => o.status === 'canceled')).toBe(true);
    expect(await del(db, 1)).toEqual({ deleted: false, already_deleted: true });
    // 초대한 사람(100)이 탈퇴하면 그에게 걸린 대기 연결은 닫힌다
    await as(db, 2); await db.query('SELECT public.apply_invite($1)', [code]);
    await del(db, 100, true);
    const ref = (await one<{ status: string; reason: string }>(db, `SELECT status, reason FROM public.referrals WHERE invitee_id=$1`, [U(2)]))[0]!;
    expect(ref).toEqual({ status: 'skipped', reason: 'inviter_deleted' });
    await db.close();
  });

  it('탈퇴 사용자가 결제 대기 중이던 주문은 이후 승인이 와도 충전되지 않는다', async () => {
    const db = await setup();
    await member(db, 1);
    const oid = (await one<{ id: string }>(db, 'SELECT public.create_coin_order($1,2) AS id', [U(1)]))[0]!.id;
    await del(db, 1);
    await expect(db.query('SELECT public.credit_purchase($1,$2,$3,$4)', [oid, 'test', 'late-pay', 1800])).rejects.toThrow(/ORDER_NOT_PAYABLE/);
    expect(await n(db, 'wallets', 1)).toBe(0);
    await db.close();
  });
});

describe('purge_retained_records', () => {
  it('보관 기간이 지난 탈퇴자의 결제·원장·보상 기록만 지우고, 기간 내·활동 회원 기록은 그대로', async () => {
    const db = await setup();
    await member(db, 100); await buy(db, 100, 1);
    await member(db, 1); await buy(db, 1, 1);
    await member(db, 2); await buy(db, 2, 1);
    await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id) VALUES ($1, $2)`, [U(1), U(100)]);
    await del(db, 1, true);
    await del(db, 2, true);
    // 아직 기간 내 → 아무것도 안 지움
    expect(await one(db, 'SELECT public.purge_retained_records() AS r')).toEqual([{ r: { purged_users: 0 } }]);
    // 1번만 만료로 만든다
    await db.query(`UPDATE public.account_deletions SET retained_until = (now() AT TIME ZONE 'Asia/Seoul')::date - 1 WHERE user_id=$1`, [U(1)]);
    const r = (await one<{ r: Record<string, number> }>(db, 'SELECT public.purge_retained_records() AS r'))[0]!.r;
    expect(r).toMatchObject({ purged_users: 1, purchases: 1, orders: 1, rewards: 1 });
    for (const t of ['coin_purchases', 'coin_orders', 'coin_ledger']) expect(await n(db, t, 1), t).toBe(0);
    for (const t of ['coin_purchases', 'coin_orders', 'coin_ledger']) expect(await n(db, t, 2), t).toBeGreaterThan(0); // 기간 내
    for (const t of ['coin_purchases', 'coin_ledger']) expect(await n(db, t, 100), t).toBeGreaterThan(0); // 활동 회원
    expect((await one<{ p: string | null }>(db, 'SELECT purged_at::text AS p FROM public.account_deletions WHERE user_id=$1', [U(1)]))[0]!.p).not.toBeNull();
    expect(await one(db, 'SELECT public.purge_retained_records() AS r')).toEqual([{ r: { purged_users: 0 } }]); // 다시 불러도 무해
    await db.close();
  });
});

describe('권한', () => {
  it('anon·authenticated 는 탈퇴 함수·삭제 감사 표에 접근할 수 없고 service_role 만 실행한다', async () => {
    const db = await setup();
    await member(db, 1);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(db.query(`SELECT public.delete_member_data('${U(1)}', true)`), role).rejects.toThrow(/permission denied/);
      await expect(db.query('SELECT public.purge_retained_records()'), role).rejects.toThrow(/permission denied/);
      await expect(db.query('SELECT * FROM public.account_deletions'), role).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    expect(await one(db, `SELECT public.delete_member_data('${U(1)}', true) AS r`)).toBeTruthy();
    await db.exec('RESET ROLE');
    const f = await one<{ cfg: string[]; secdef: boolean }>(db, `SELECT proconfig AS cfg, prosecdef AS secdef FROM pg_proc WHERE proname IN ('delete_member_data','purge_retained_records')`);
    for (const x of f) { expect(x.secdef).toBe(true); expect(x.cfg).toContain('search_path=""'); }
    await db.close();
  });
});
