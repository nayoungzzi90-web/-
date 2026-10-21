import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// 엽전 정책 SQL(가격표 900원/닢, 초대 보상 1닢·한국 시간 한도 3/10·초대자 결제 조건, 가입 보너스 없음)을
// 운영과 같은 모양의 모의 스키마에서 적용 순서대로 실행해 확인한다. 둘 다 REVIEW_ONLY(운영 미적용).
// 단일 연결(PGlite)이라 "동시 요청" 직렬화는 검증하지 못한다 → 운영 반영 전 staging 에서 확인할 항목으로 남는다.
const read = (f: string) => readFileSync(new URL(`../../lovable-app/docs/migrations/REVIEW_ONLY/${f}`, import.meta.url), 'utf8');
const PRICING = read('PRICING_900_COIN_REVIEW_ONLY.sql');
const INVITE = read('INVITE_COINS_KST_REVIEW_ONLY.sql');

const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; -- Supabase 의 service_role 은 RLS 를 우회한다
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    -- 운영과 같은 "새 표 기본 권한"(anon/authenticated 에 자동 부여)을 흉내 낸다
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    CREATE TABLE public.wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_codes (code text PRIMARY KEY, user_id uuid NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_rewards (invitee_id uuid PRIMARY KEY, inviter_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.unlocked_readings (user_id uuid NOT NULL, reading_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, reading_id));
    CREATE TABLE public.reading_price_catalog (reading_type text PRIMARY KEY, price_coins integer NOT NULL, active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT reading_price_catalog_price_coins_check CHECK (price_coins > 0),
      CONSTRAINT reading_price_catalog_reading_type_check CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text])));
    INSERT INTO public.reading_price_catalog VALUES ('basic', 4, false, now()), ('compat', 4, false, now());
    -- 호출 순서: 가격표·결제 기록 표 → 초대 정책
  `);
  await db.exec(PRICING);
  await db.exec(INVITE);
  return db;
}
const as = (db: PGlite, n: number | null) => db.exec(`SELECT set_config('test.uid', '${n === null ? '' : U(n)}', false)`);
const newUser = async (db: PGlite, n: number, createdAgo = '0 minutes') => db.query(`INSERT INTO auth.users (id, created_at) VALUES ($1, now() - $2::interval)`, [U(n), createdAgo]);
const coins = async (db: PGlite, n: number) => (await db.query<{ coins: number }>('SELECT coins FROM public.wallets WHERE user_id = $1', [U(n)])).rows[0]?.coins;
const apply = async (db: PGlite, code: string) => (await db.query<{ ok: boolean }>('SELECT public.apply_invite($1) AS ok', [code])).rows[0]!.ok;
const codeOf = async (db: PGlite, n: number) => (await db.query<{ code: string }>('SELECT code FROM public.invite_codes WHERE user_id = $1', [U(n)])).rows[0]!.code;
const spend = async (db: PGlite, id: string, cost: number) => (await db.query<{ b: number }>('SELECT public.spend_coins($1,$2) AS b', [id, cost])).rows[0]!.b;
const KST_DAY = `(date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
const KST_MONTH = `(date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
const pay = (db: PGlite, n: number, status = 'paid', c = 1) => db.query(`INSERT INTO public.coin_purchases (user_id, coins, amount_krw, provider, provider_payment_id, status) VALUES ($1,$2,$3,'test',$4,$5)`, [U(n), c, c * 900, `p-${n}-${status}-${c}-${Math.random()}`, status]);

describe('가격표(1닢=900원)·상품 확장', () => {
  it('가격 1/1/2/2/3, 전부 비활성, 허용 상품 밖은 거부', async () => {
    const db = await setup();
    const r = await db.query<{ reading_type: string; price_coins: number; active: boolean }>('SELECT * FROM public.reading_price_catalog ORDER BY reading_type');
    expect(r.rows.map((x) => [x.reading_type, x.price_coins, x.active])).toEqual([['basic', 1, false], ['compat', 1, false], ['deep', 3, false], ['love', 2, false], ['taekil', 2, false]]);
    await expect(db.exec(`INSERT INTO public.reading_price_catalog (reading_type, price_coins) VALUES ('foo', 1)`)).rejects.toThrow(/check/i);
    await db.close();
  });

  it('원 환산: 900/900/1,800/1,800/2,700원', async () => {
    const db = await setup();
    const r = await db.query<{ reading_type: string; krw: number }>('SELECT reading_type, price_coins * 900 AS krw FROM public.reading_price_catalog ORDER BY reading_type');
    expect(Object.fromEntries(r.rows.map((x) => [x.reading_type, x.krw]))).toEqual({ basic: 900, compat: 900, love: 1800, taekil: 1800, deep: 2700 });
    await db.close();
  });

  it('spend_coins: 새 상품 id 허용, 가격 재검증, 비활성·잔액 부족·중복 열람 처리', async () => {
    const db = await setup();
    await newUser(db, 1);
    await db.query('INSERT INTO public.wallets VALUES ($1, 5)', [U(1)]);
    await as(db, 1);
    await expect(spend(db, 'basic', 1)).rejects.toThrow(/READING_DISABLED/); // 활성 전
    await db.exec(`UPDATE public.reading_price_catalog SET active = true WHERE reading_type IN ('basic','love','deep','compat')`);
    await expect(spend(db, 'basic', 4)).rejects.toThrow(/PRICE_MISMATCH/); // 옛 가격(4닢)은 거부
    expect(await spend(db, 'basic', 1)).toBe(4);
    expect(await spend(db, 'basic', 1)).toBe(4); // 이미 연 풀이는 재차감 없음
    expect(await spend(db, 'love', 2)).toBe(2);
    expect(await spend(db, 'compat:2026-03-01', 1)).toBe(1);
    await expect(spend(db, 'deep', 3)).rejects.toThrow(/INSUFFICIENT_COINS/);
    await expect(spend(db, 'nope', 1)).rejects.toThrow(/UNKNOWN_READING/);
    await expect(spend(db, 'compat:abc', 1)).rejects.toThrow(/UNKNOWN_READING/);
    await expect(spend(db, 'taekil:2026-03-01', 2)).rejects.toThrow(/READING_DISABLED/); // 택일은 비활성
    expect(await coins(db, 1)).toBe(1);
    await db.close();
  });

  it('coin_purchases: anon·authenticated 는 접근 불가(기본 권한 회수 확인), service_role 은 가능, 중복 결제 id 거부', async () => {
    const db = await setup();
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(db.query('SELECT * FROM public.coin_purchases')).rejects.toThrow(/permission denied/);
      await expect(db.query(`INSERT INTO public.coin_purchases (user_id, coins, amount_krw, provider, provider_payment_id) VALUES ('${U(1)}', 1, 900, 'x', 'y')`)).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    await db.query(`INSERT INTO public.coin_purchases (user_id, coins, amount_krw, provider, provider_payment_id) VALUES ($1, 1, 900, 'x', 'dup')`, [U(1)]);
    await expect(db.query(`INSERT INTO public.coin_purchases (user_id, coins, amount_krw, provider, provider_payment_id) VALUES ($1, 1, 900, 'x', 'dup')`, [U(1)])).rejects.toThrow(/unique/i);
    await db.exec('RESET ROLE');
    await expect(db.query(`INSERT INTO public.coin_purchases (user_id, coins, amount_krw, provider, provider_payment_id) VALUES ($1, 0, 900, 'x', 'z')`, [U(1)])).rejects.toThrow(/check/i);
    await db.close();
  });
});

describe('ensure_user_setup: 가입 보너스 없음', () => {
  it('새 사용자는 지갑 0 + 초대 코드 1개, 다시 불러도 그대로, 기존 잔액은 건드리지 않는다', async () => {
    const db = await setup();
    await newUser(db, 1);
    await as(db, 1);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await coins(db, 1)).toBe(0);
    const code = await codeOf(db, 1);
    expect(code).toMatch(/^[0-9A-F]{8}$/);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await coins(db, 1)).toBe(0);
    expect(await codeOf(db, 1)).toBe(code);
    await newUser(db, 2);
    await db.query('INSERT INTO public.wallets VALUES ($1, 4)', [U(2)]);
    await as(db, 2);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await coins(db, 2)).toBe(4); // 이미 4닢을 가진 기존 회원은 그대로
    await as(db, null);
    await expect(db.exec('SELECT public.ensure_user_setup()')).rejects.toThrow(/NOT_SIGNED_IN/);
    await db.close();
  });
});

describe('apply_invite: 보상 1닢, 초대자 결제 조건, 한국 시간 한도 3/10', () => {
  async function inviter(db: PGlite, paid = true) {
    await newUser(db, 100, '10 days');
    await as(db, 100);
    await db.exec('SELECT public.ensure_user_setup()');
    if (paid) await pay(db, 100);
    return codeOf(db, 100);
  }
  const invitee = async (db: PGlite, n: number) => {
    await newUser(db, n);
    await as(db, n);
    await db.exec('SELECT public.ensure_user_setup()');
  };
  const rewards = async (db: PGlite) => (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.invite_rewards')).rows[0]!.n;

  it('결제한 초대자: 초대받은 사람이 적용하면 초대자에게 1닢, 초대받은 사람은 0 그대로, 두 번째는 거부', async () => {
    const db = await setup();
    const code = await inviter(db);
    await invitee(db, 1);
    expect(await apply(db, code.toLowerCase() + ' ')).toBe(true); // 대소문자·공백 허용
    expect(await coins(db, 100)).toBe(1);
    expect(await coins(db, 1)).toBe(0);
    expect(await apply(db, code)).toBe(false);
    expect(await coins(db, 100)).toBe(1);
    await db.close();
  });

  it('결제 이력이 없거나 환불만 있는 초대자는 보상 없음(초대 기록도 안 남음)', async () => {
    const db = await setup();
    const code = await inviter(db, false);
    await invitee(db, 1);
    expect(await apply(db, code)).toBe(false);
    expect(await coins(db, 100)).toBe(0);
    expect(await rewards(db)).toBe(0);
    await pay(db, 100, 'refunded');
    expect(await apply(db, code)).toBe(false);
    expect(await rewards(db)).toBe(0);
    await pay(db, 100, 'paid'); // 결제하면 같은 초대받은 사람이 다시 적용해도 인정(이전에 기록이 안 남았으므로)
    expect(await apply(db, code)).toBe(true);
    expect(await coins(db, 100)).toBe(1);
    await db.close();
  });

  it('자기 초대·없는 코드·가입 3일 지난 계정·비로그인은 거부', async () => {
    const db = await setup();
    const code = await inviter(db);
    await as(db, 100);
    expect(await apply(db, code)).toBe(false);
    await invitee(db, 2);
    expect(await apply(db, 'NOPE1234')).toBe(false);
    await newUser(db, 3, '4 days');
    await as(db, 3);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await apply(db, code)).toBe(false);
    await as(db, null);
    await expect(db.query('SELECT public.apply_invite($1)', [code])).rejects.toThrow(/NOT_SIGNED_IN/);
    expect(await coins(db, 100)).toBe(0);
    await db.close();
  });

  it('하루 3건: 한국 시간 오늘 0시 이후만 센다(어제 23:59 KST 건은 안 셈)', async () => {
    const db = await setup();
    const code = await inviter(db);
    for (let i = 0; i < 2; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_DAY} - interval '1 minute')`, [U(500 + i), U(100)]);
    for (let i = 0; i < 3; i++) {
      await invitee(db, 10 + i);
      expect(await apply(db, code), `오늘 ${i + 1}번째`).toBe(true);
    }
    await invitee(db, 20);
    expect(await apply(db, code), '오늘 4번째').toBe(false);
    expect(await coins(db, 100)).toBe(3);
    await db.close();
  });

  it('월 10건: 한국 시간 이번 달 1일 0시 이후만 센다(지난달 마지막 분 건은 안 셈)', async () => {
    const db = await setup();
    const code = await inviter(db);
    for (let i = 0; i < 10; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_MONTH} - interval '1 minute')`, [U(600 + i), U(100)]);
    await invitee(db, 1);
    expect(await apply(db, code)).toBe(true); // 지난달 10건은 이번 달에 안 셈
    for (let i = 0; i < 9; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_MONTH})`, [U(700 + i), U(100)]);
    await invitee(db, 2);
    expect(await apply(db, code)).toBe(false); // 이번 달 10건 채움(오늘 한도에도 걸릴 수 있으나 어느 쪽이든 거부)
    await db.close();
  });

  it('함수 본문: search_path 고정, 초대자 행 잠금, 보상 상수 1, 한도 3/10, 한국 시간', async () => {
    const db = await setup();
    const r = await db.query<{ def: string; cfg: string[] }>(`SELECT pg_get_functiondef(p.oid) AS def, p.proconfig AS cfg FROM pg_proc p WHERE p.proname = 'apply_invite'`);
    expect(r.rows[0]!.cfg).toContain('search_path=""');
    expect(r.rows[0]!.def).toMatch(/FOR UPDATE/i);
    expect(r.rows[0]!.def).toMatch(/c_reward\s+constant integer := 1;/);
    expect(r.rows[0]!.def).toMatch(/c_daily_cap\s+constant integer := 3;/);
    expect(r.rows[0]!.def).toMatch(/c_monthly_cap\s+constant integer := 10;/);
    expect(r.rows[0]!.def).toMatch(/Asia\/Seoul/);
    expect(r.rows[0]!.def).toMatch(/coin_purchases/);
    await db.close();
  });
});
