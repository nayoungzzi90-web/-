import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// 새 Supabase 프로젝트용 적용 순서(00 기본 → 가격 → 엽전·결제·초대 → 요청 제한 v2 → 최소 권한)를
// 빈 DB(PGlite)에 그대로 실행해 끝까지 적용되고 핵심 권한이 맞는지 확인한다. 모두 REVIEW_ONLY(미적용).
const read = (f: string) => readFileSync(new URL(`../../lovable-app/docs/migrations/REVIEW_ONLY/${f}`, import.meta.url), 'utf8');
const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function fresh() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT SELECT ON auth.users TO service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  for (const f of [
    'FRESH_DB_00_BASE_REVIEW_ONLY.sql',
    'PRICING_900_COIN_REVIEW_ONLY.sql',
    'COINS_PAYMENTS_REFERRAL_REVIEW_ONLY.sql',
    'R015_SAJU_RATE_LIMIT_REVIEW_ONLY_v2.sql',
    'R015_LEAST_PRIVILEGE_REVIEW_ONLY.sql',
  ]) await db.exec(read(f));
  return db;
}

describe('새 DB 적용 순서', () => {
  it('끝까지 적용되고 가격표는 전부 비활성, 엽전 가격은 1·1·2·2·3', async () => {
    const db = await fresh();
    const r = await db.query<{ reading_type: string; price_coins: number; active: boolean }>(
      'SELECT reading_type, price_coins, active FROM public.reading_price_catalog ORDER BY reading_type');
    expect(r.rows.map((x) => `${x.reading_type}:${x.price_coins}:${x.active}`)).toEqual(
      ['basic:1:false', 'compat:1:false', 'deep:3:false', 'love:2:false', 'taekil:2:false']);
  });

  it('가입 직후 지갑 0닢(가입 보너스 없음), 본인 행만 보임', async () => {
    const db = await fresh();
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${U(1)}'), ('${U(2)}')`);
    for (const n of [1, 2]) {
      await db.exec(`SELECT set_config('test.uid','${U(n)}',false); SET ROLE authenticated; SELECT public.ensure_user_setup(); RESET ROLE;`);
    }
    await db.exec(`SELECT set_config('test.uid','${U(1)}',false); SET ROLE authenticated`);
    const w = await db.query<{ user_id: string; coins: number }>('SELECT user_id, coins FROM public.wallets');
    expect(w.rows).toEqual([{ user_id: U(1), coins: 0 }]);
    await db.exec('RESET ROLE');
  });

  it('최소 권한: anon 은 표 접근 불가, authenticated 는 가격표 접근 불가', async () => {
    const db = await fresh();
    await db.exec(`SELECT set_config('test.uid','',false); SET ROLE anon`);
    await expect(db.query('SELECT * FROM public.wallets')).rejects.toThrow();
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await expect(db.query('SELECT * FROM public.reading_price_catalog')).rejects.toThrow();
    await db.exec('RESET ROLE');
  });

  it('본인 출생정보만 저장·조회(타인 user_id 로 저장 거부)', async () => {
    const db = await fresh();
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${U(1)}'), ('${U(2)}')`);
    await db.exec(`SELECT set_config('test.uid','${U(1)}',false); SET ROLE authenticated`);
    await db.exec(`INSERT INTO public.birth_profiles (user_id, name, birth_date) VALUES ('${U(1)}','가', '1995-05-17')`);
    await expect(db.query(`INSERT INTO public.birth_profiles (user_id, name, birth_date) VALUES ('${U(2)}','나', '1995-05-17')`)).rejects.toThrow();
    await db.exec('RESET ROLE');
  });
});
