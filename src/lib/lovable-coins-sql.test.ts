import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// 엽전 가격표·결제·원장·초대 보상 SQL(PRICING_900_COIN → COINS_PAYMENTS_REFERRAL, 둘 다 REVIEW_ONLY, 운영 미적용)을
// 운영과 같은 모양의 모의 스키마에 적용 순서대로 실행해 확인한다.
// 단일 연결(PGlite)이라 "동시 요청" 직렬화(행 잠금)는 검증하지 못한다 → 운영 반영 전 staging 에서 확인할 항목으로 남는다.
const read = (f: string) => readFileSync(new URL(`../../lovable-app/docs/migrations/REVIEW_ONLY/${f}`, import.meta.url), 'utf8');
const PRICING = read('PRICING_900_COIN_REVIEW_ONLY.sql');
const COINS = read('COINS_PAYMENTS_REFERRAL_REVIEW_ONLY.sql');

const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; -- Supabase 의 service_role 은 RLS 를 우회한다
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT SELECT ON auth.users TO service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    -- 운영과 같은 "새 표·새 함수 기본 권한"(anon/authenticated 에 자동 부여)을 흉내 낸다
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    CREATE TABLE public.wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_codes (code text PRIMARY KEY, user_id uuid NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_rewards (invitee_id uuid PRIMARY KEY, inviter_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.unlocked_readings (user_id uuid NOT NULL, reading_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, reading_id));
    CREATE TABLE public.reading_price_catalog (reading_type text PRIMARY KEY, price_coins integer NOT NULL, active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT reading_price_catalog_price_coins_check CHECK (price_coins > 0),
      CONSTRAINT reading_price_catalog_reading_type_check CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text])));
    INSERT INTO public.reading_price_catalog VALUES ('basic', 4, false, now()), ('compat', 4, false, now());
  `);
  await db.exec(PRICING);
  await db.exec(COINS);
  return db;
}

const as = (db: PGlite, n: number | null) => db.exec(`SELECT set_config('test.uid', '${n === null ? '' : U(n)}', false)`);
const newUser = (db: PGlite, n: number, createdAgo = '0 minutes') => db.query(`INSERT INTO auth.users (id, created_at) VALUES ($1, now() - $2::interval)`, [U(n), createdAgo]);
const setupUser = async (db: PGlite, n: number, createdAgo = '0 minutes') => {
  await newUser(db, n, createdAgo);
  await as(db, n);
  await db.exec('SELECT public.ensure_user_setup()');
};
const coins = async (db: PGlite, n: number) => (await db.query<{ coins: number }>('SELECT coins FROM public.wallets WHERE user_id = $1', [U(n)])).rows[0]?.coins;
const codeOf = async (db: PGlite, n: number) => (await db.query<{ code: string }>('SELECT code FROM public.invite_codes WHERE user_id = $1', [U(n)])).rows[0]!.code;
const link = async (db: PGlite, n: number, code: string) => { await as(db, n); return (await db.query<{ ok: boolean }>('SELECT public.apply_invite($1) AS ok', [code])).rows[0]!.ok; };
const spend = async (db: PGlite, id: string, cost: number) => (await db.query<{ b: number }>('SELECT public.spend_coins($1,$2) AS b', [id, cost])).rows[0]!.b;
const order = async (db: PGlite, n: number, c = 1) => (await db.query<{ id: string }>('SELECT public.create_coin_order($1,$2) AS id', [U(n), c])).rows[0]!.id;
let seq = 0;
const credit = async (db: PGlite, orderId: string, amount?: number, pid?: string) => {
  const r = await db.query<{ r: Record<string, unknown> }>('SELECT public.credit_purchase($1,$2,$3,$4) AS r', [orderId, 'test', pid ?? `pay-${++seq}`, amount ?? null]);
  return r.rows[0]!.r;
};
/** 주문 생성 → 서버가 정한 금액 그대로 결제 확정 */
const buy = async (db: PGlite, n: number, c = 1) => {
  const id = await order(db, n, c);
  const amt = (await db.query<{ a: number }>('SELECT amount_krw AS a FROM public.coin_orders WHERE id=$1', [id])).rows[0]!.a;
  return credit(db, id, amt);
};
const one = async <T>(db: PGlite, sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
const KST_DAY = `(date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
const KST_MONTH = `(date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;

describe('가격표(1닢=900원)·상품 확장', () => {
  it('가격 1/1/2/2/3 닢 = 900/900/1,800/1,800/2,700원, 전부 비활성, 허용 상품 밖은 거부', async () => {
    const db = await setup();
    const r = await one<{ reading_type: string; price_coins: number; active: boolean; krw: number }>(db, 'SELECT *, price_coins * 900 AS krw FROM public.reading_price_catalog ORDER BY reading_type');
    expect(r.map((x) => [x.reading_type, x.price_coins, x.krw, x.active])).toEqual([['basic', 1, 900, false], ['compat', 1, 900, false], ['deep', 3, 2700, false], ['love', 2, 1800, false], ['taekil', 2, 1800, false]]);
    await expect(db.exec(`INSERT INTO public.reading_price_catalog (reading_type, price_coins) VALUES ('foo', 1)`)).rejects.toThrow(/check/i);
    await db.close();
  });
});

describe('ensure_user_setup / spend_coins', () => {
  it('가입 보너스 없음: 새 사용자는 지갑 0·초대 코드 1개, 반복 호출 무해, 기존 잔액 불변', async () => {
    const db = await setup();
    await setupUser(db, 1);
    expect(await coins(db, 1)).toBe(0);
    const code = await codeOf(db, 1);
    expect(code).toMatch(/^[0-9A-F]{8}$/);
    await db.exec('SELECT public.ensure_user_setup()');
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

  it('spend_coins: 새 상품 허용·가격 재검증·비활성·잔액 부족·중복 열람 무과금, 원장 기록', async () => {
    const db = await setup();
    await setupUser(db, 1);
    await buy(db, 1, 4); // 4닢 충전
    await as(db, 1);
    await expect(spend(db, 'basic', 1)).rejects.toThrow(/READING_DISABLED/);
    await db.exec(`UPDATE public.reading_price_catalog SET active = true WHERE reading_type IN ('basic','love','deep','compat')`);
    await expect(spend(db, 'basic', 4)).rejects.toThrow(/PRICE_MISMATCH/); // 옛 가격
    expect(await spend(db, 'basic', 1)).toBe(3);
    expect(await spend(db, 'basic', 1)).toBe(3); // 이미 연 풀이는 재차감 없음
    expect(await spend(db, 'love', 2)).toBe(1);
    await expect(spend(db, 'deep', 3)).rejects.toThrow(/INSUFFICIENT_COINS/);
    await expect(spend(db, 'nope', 1)).rejects.toThrow(/UNKNOWN_READING/);
    await expect(spend(db, 'taekil:2026-03-01', 2)).rejects.toThrow(/READING_DISABLED/);
    const led = await one<{ delta: number; reason: string; balance_after: number }>(db, `SELECT delta, reason, balance_after FROM public.coin_ledger WHERE user_id=$1 ORDER BY id`, [U(1)]);
    expect(led).toEqual([{ delta: 4, reason: 'purchase', balance_after: 4 }, { delta: -1, reason: 'spend', balance_after: 3 }, { delta: -2, reason: 'spend', balance_after: 1 }]);
    await db.close();
  });
});

describe('주문·결제 확정(credit_purchase)', () => {
  it('팩 1~4닢 = 900/1,800/2,700/3,600원, 범위 밖·없는 사용자는 거부', async () => {
    const db = await setup();
    await setupUser(db, 1);
    for (const c of [1, 2, 3, 4]) {
      const id = await order(db, 1, c);
      expect((await one<{ a: number }>(db, 'SELECT amount_krw AS a FROM public.coin_orders WHERE id=$1', [id]))[0]!.a).toBe(c * 900);
    }
    await expect(order(db, 1, 0)).rejects.toThrow(/INVALID_PACK/);
    await expect(order(db, 1, 5)).rejects.toThrow(/INVALID_PACK/);
    await expect(order(db, 999, 1)).rejects.toThrow(/UNKNOWN_USER/);
    await db.close();
  });

  it('금액이 다르면 거부(클라이언트 금액 불신), 맞으면 충전·결제기록·원장, 같은 결제 재처리는 한 번만', async () => {
    const db = await setup();
    await setupUser(db, 1);
    const id = await order(db, 1, 2);
    await expect(credit(db, id, 900)).rejects.toThrow(/AMOUNT_MISMATCH/);
    await expect(credit(db, id, 1800 * 100)).rejects.toThrow(/AMOUNT_MISMATCH/);
    expect(await coins(db, 1)).toBe(0);
    const r1 = await credit(db, id, 1800, 'pay-same');
    expect(r1).toMatchObject({ credited: true, balance: 2, referral: 'none' });
    const r2 = await credit(db, id, 1800, 'pay-same'); // PG 재전송(웹훅 중복)
    expect(r2).toEqual({ credited: false, already_credited: true });
    expect(await coins(db, 1)).toBe(2);
    await expect(credit(db, id, 1800, 'pay-other')).rejects.toThrow(/ORDER_ALREADY_PAID_DIFFERENT_PAYMENT/);
    expect((await one<{ n: number }>(db, 'SELECT count(*)::int AS n FROM public.coin_purchases'))[0]!.n).toBe(1);
    // 다른 주문에 같은 결제번호 재사용 → 거부
    const id2 = await order(db, 1, 1);
    await expect(credit(db, id2, 900, 'pay-same')).rejects.toThrow(/unique/i);
    await expect(credit(db, '00000000-0000-4000-8000-00000000ffff', 900)).rejects.toThrow(/ORDER_NOT_FOUND/);
    await db.close();
  });
});

describe('초대 보상: 친구의 첫 결제 + 초대자 결제 이력 + 한국 시간 한도 3/10', () => {
  const inviterWithCode = async (db: PGlite, paid = true) => {
    await setupUser(db, 100, '10 days');
    if (paid) await buy(db, 100, 1);
    return codeOf(db, 100);
  };
  const invitee = async (db: PGlite, n: number, code: string) => {
    await setupUser(db, n);
    expect(await link(db, n, code)).toBe(true);
  };

  it('연결만으로는 엽전이 움직이지 않고, 첫 결제에 초대자에게 1닢 + 원장, 두 번째 결제는 보상 없음', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    const before = await coins(db, 100);
    await invitee(db, 1, code);
    expect(await coins(db, 100)).toBe(before); // 연결만으로는 보상 없음
    expect(await coins(db, 1)).toBe(0);
    const r = await buy(db, 1, 1);
    expect(r['referral']).toBe('rewarded');
    expect(await coins(db, 100)).toBe(before! + 1);
    expect(await coins(db, 1)).toBe(1); // 친구는 산 만큼만
    const rw = await one<{ purchase_id: string | null }>(db, 'SELECT purchase_id FROM public.invite_rewards WHERE invitee_id=$1', [U(1)]);
    expect(rw[0]!.purchase_id).toBe(r['purchase_id']);
    expect((await one<{ reason: string }>(db, `SELECT reason FROM public.coin_ledger WHERE user_id=$1 AND reason='referral_reward'`, [U(100)])).length).toBe(1);
    const r2 = await buy(db, 1, 2);
    expect(r2['referral']).toBe('none');
    expect(await coins(db, 100)).toBe(before! + 1);
    await db.close();
  });

  it('초대자가 결제한 적 없으면 보상 없음(연결은 skipped 로 닫힘), 환불만 있어도 마찬가지', async () => {
    const db = await setup();
    const code = await inviterWithCode(db, false);
    await invitee(db, 1, code);
    expect((await buy(db, 1))['referral']).toBe('skipped:inviter_not_paid');
    expect(await coins(db, 100)).toBe(0);
    expect((await one<{ status: string; reason: string }>(db, 'SELECT status, reason FROM public.referrals WHERE invitee_id=$1', [U(1)]))[0]).toEqual({ status: 'skipped', reason: 'inviter_not_paid' });
    // 환불만 있는 초대자
    const code2 = await (async () => { await setupUser(db, 101, '10 days'); await buy(db, 101, 1); await db.query(`SELECT public.refund_purchase('test', (SELECT provider_payment_id FROM public.coin_purchases WHERE user_id=$1))`, [U(101)]); return codeOf(db, 101); })();
    await invitee(db, 2, code2);
    expect((await buy(db, 2))['referral']).toBe('skipped:inviter_not_paid');
    await db.close();
  });

  it('하루 3건: 한국 시간 오늘 0시 이후만 센다(어제 23:59 KST 건은 안 셈), 4번째는 한도로 보상 없음', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    for (let i = 0; i < 2; i++) await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id, created_at) VALUES ($1, $2, ${KST_DAY} - interval '1 minute')`, [U(500 + i), U(100)]);
    for (let i = 0; i < 3; i++) { await invitee(db, 10 + i, code); expect((await buy(db, 10 + i))['referral'], `오늘 ${i + 1}번째`).toBe('rewarded'); }
    await invitee(db, 20, code);
    expect((await buy(db, 20))['referral']).toBe('skipped:daily_cap');
    await db.close();
  });

  it('하루 3건: 한국 시간 오늘 0시 직후(00:01 KST) 건은 오늘로 센다 — UTC 날짜 경계가 아님', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    for (let i = 0; i < 3; i++) await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id, created_at) VALUES ($1, $2, ${KST_DAY} + interval '1 minute')`, [U(800 + i), U(100)]);
    await invitee(db, 1, code);
    expect((await buy(db, 1))['referral']).toBe('skipped:daily_cap');
    await db.close();
  });

  it('친구가 연결 전에 이미 결제한 적이 있으면 "첫 결제"가 아니므로 이후 결제에 보상 없음', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    await setupUser(db, 1);
    await buy(db, 1, 1); // 연결 전에 먼저 결제
    expect(await link(db, 1, code)).toBe(true);
    const before = await coins(db, 100);
    expect((await buy(db, 1, 1))['referral']).toBe('none');
    expect(await coins(db, 100)).toBe(before);
    await db.close();
  });

  it('월 10건: 한국 시간 이번 달 1일 0시 이후만 센다(지난달 마지막 분 건은 안 셈)', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    for (let i = 0; i < 10; i++) await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id, created_at) VALUES ($1, $2, ${KST_MONTH} - interval '1 minute')`, [U(600 + i), U(100)]);
    await invitee(db, 1, code);
    expect((await buy(db, 1))['referral']).toBe('rewarded'); // 지난달 10건은 이번 달에 안 셈
    for (let i = 0; i < 9; i++) await db.query(`INSERT INTO public.invite_rewards (invitee_id, inviter_id, created_at) VALUES ($1, $2, ${KST_MONTH})`, [U(700 + i), U(100)]);
    await invitee(db, 2, code);
    expect(['skipped:daily_cap', 'skipped:monthly_cap']).toContain((await buy(db, 2))['referral']);
    await db.close();
  });

  it('apply_invite 연결 조건: 자기 초대·없는 코드·가입 3일 지난 계정·중복 연결·비로그인은 거부, 코인 변화 없음', async () => {
    const db = await setup();
    const code = await inviterWithCode(db);
    expect(await link(db, 100, code)).toBe(false);
    await setupUser(db, 2);
    expect(await link(db, 2, 'NOPE1234')).toBe(false);
    expect(await link(db, 2, code.toLowerCase() + ' ')).toBe(true); // 대소문자·공백 허용
    expect(await link(db, 2, code)).toBe(false); // 두 번째 연결 거부
    await setupUser(db, 3, '4 days');
    expect(await link(db, 3, code)).toBe(false);
    await as(db, null);
    await expect(db.query('SELECT public.apply_invite($1)', [code])).rejects.toThrow(/NOT_SIGNED_IN/);
    expect(await coins(db, 2)).toBe(0);
    await db.close();
  });
});

describe('환불(refund_purchase)', () => {
  it('남은 엽전만큼 차감·원장 기록·멱등, 이미 쓴 엽전이면 거부(수동 처리)', async () => {
    const db = await setup();
    await setupUser(db, 1);
    await buy(db, 1, 2);
    const pid = (await one<{ p: string }>(db, 'SELECT provider_payment_id AS p FROM public.coin_purchases'))[0]!.p;
    await db.exec(`UPDATE public.reading_price_catalog SET active = true WHERE reading_type = 'basic'`);
    await as(db, 1);
    await spend(db, 'basic', 1); // 1닢 사용 → 잔액 1 < 2
    await expect(db.query(`SELECT public.refund_purchase('test', $1)`, [pid])).rejects.toThrow(/COINS_ALREADY_USED/);
    await buy(db, 1, 3); // 충전해 잔액 4
    const r = (await one<{ r: Record<string, unknown> }>(db, `SELECT public.refund_purchase('test', $1) AS r`, [pid]))[0]!.r;
    expect(r).toMatchObject({ refunded: true, balance: 2 });
    expect(await coins(db, 1)).toBe(2);
    expect((await one<{ r: Record<string, unknown> }>(db, `SELECT public.refund_purchase('test', $1) AS r`, [pid]))[0]!.r).toEqual({ refunded: false, already_refunded: true });
    expect(await coins(db, 1)).toBe(2);
    expect((await one<{ s: string }>(db, 'SELECT status AS s FROM public.coin_purchases WHERE provider_payment_id=$1', [pid]))[0]!.s).toBe('refunded');
    await expect(db.query(`SELECT public.refund_purchase('test', 'nope')`)).rejects.toThrow(/PURCHASE_NOT_FOUND/);
    await db.close();
  });

  it('보상을 만든 결제를 환불하면 초대자의 보상 1닢도 회수(보상 후 환불 반복 방지)', async () => {
    const db = await setup();
    await setupUser(db, 100, '10 days');
    await buy(db, 100, 1);
    const code = await codeOf(db, 100);
    await setupUser(db, 1);
    await link(db, 1, code);
    await buy(db, 1, 1);
    const before = await coins(db, 100); // 1(자기 결제) + 1(보상)
    expect(before).toBe(2);
    const pid = (await one<{ p: string }>(db, 'SELECT provider_payment_id AS p FROM public.coin_purchases WHERE user_id=$1', [U(1)]))[0]!.p;
    const r = (await one<{ r: Record<string, unknown> }>(db, `SELECT public.refund_purchase('test', $1) AS r`, [pid]))[0]!.r;
    expect(r).toMatchObject({ refunded: true, reward_clawed_back: true });
    expect(await coins(db, 100)).toBe(1);
    expect((await one<{ c: string | null }>(db, 'SELECT clawed_back_at::text AS c FROM public.invite_rewards WHERE invitee_id=$1', [U(1)]))[0]!.c).not.toBeNull();
    expect((await one<{ reason: string }>(db, `SELECT reason FROM public.coin_ledger WHERE user_id=$1 AND reason='reward_clawback'`, [U(100)])).length).toBe(1);
    await db.close();
  });
});

describe('권한과 함수 설정', () => {
  it('anon·authenticated 는 서버 전용 함수와 주문·결제·연결 표에 접근할 수 없고, 원장은 본인 것만 읽는다', async () => {
    const db = await setup();
    await setupUser(db, 1);
    await setupUser(db, 2);
    await buy(db, 1, 1);
    await buy(db, 2, 2);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for (const q of [`SELECT public.create_coin_order('${U(1)}', 1)`, `SELECT public.credit_purchase('${U(1)}', 'x', 'y', 900)`, `SELECT public.refund_purchase('x', 'y')`,
        'SELECT * FROM public.coin_orders', 'SELECT * FROM public.coin_purchases', 'SELECT * FROM public.referrals'])
        await expect(db.query(q), `${role}: ${q}`).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE anon');
    await expect(db.query('SELECT * FROM public.coin_ledger')).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
    await db.exec('SET ROLE authenticated');
    await as(db, 1);
    const mine = await one<{ user_id: string }>(db, 'SELECT user_id FROM public.coin_ledger');
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.user_id === U(1))).toBe(true); // 타인(2) 원장은 안 보임
    await expect(db.query(`INSERT INTO public.coin_ledger (user_id, delta, reason, balance_after) VALUES ('${U(1)}', 5, 'adjust', 5)`)).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
    await db.close();
  });

  it('모든 새·교체 함수는 search_path 고정, 서버 전용 함수는 service_role 만 실행 가능', async () => {
    const db = await setup();
    const fns = await one<{ proname: string; cfg: string[]; secdef: boolean }>(db, `SELECT p.proname, p.proconfig AS cfg, p.prosecdef AS secdef FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('ensure_user_setup','apply_invite','spend_coins','create_coin_order','credit_purchase','refund_purchase')`);
    expect(fns).toHaveLength(6);
    for (const f of fns) { expect(f.secdef, f.proname).toBe(true); expect(f.cfg, f.proname).toContain('search_path=""'); }
    for (const sig of ['public.create_coin_order(uuid,integer)', 'public.credit_purchase(uuid,text,text,integer)', 'public.refund_purchase(text,text)']) {
      const p = (await one<{ a: boolean; u: boolean; s: boolean }>(db, `SELECT has_function_privilege('anon', '${sig}', 'EXECUTE') AS a, has_function_privilege('authenticated', '${sig}', 'EXECUTE') AS u, has_function_privilege('service_role', '${sig}', 'EXECUTE') AS s`))[0]!;
      expect(p, sig).toEqual({ a: false, u: false, s: true });
    }
    await db.close();
  });
});
