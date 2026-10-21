import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// 엽전 정책 변경 SQL(INVITE_COINS_KST_REVIEW_ONLY.sql)을 운영과 같은 모양의 모의 스키마에서 실행해 확인한다.
// 단일 연결(PGlite)이라 "동시 요청" 직렬화는 검증하지 못한다 → 운영 반영 전 staging 에서 확인할 항목으로 남는다.
const SQL = readFileSync(new URL('../../lovable-app/docs/migrations/REVIEW_ONLY/INVITE_COINS_KST_REVIEW_ONLY.sql', import.meta.url), 'utf8');

const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    CREATE TABLE public.wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_codes (code text PRIMARY KEY, user_id uuid NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.invite_rewards (invitee_id uuid PRIMARY KEY, inviter_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  `);
  await db.exec(SQL);
  return db;
}
const as = (db: PGlite, n: number | null) => db.exec(`SELECT set_config('test.uid', '${n === null ? '' : U(n)}', false)`);
const newUser = async (db: PGlite, n: number, createdAgo = '0 minutes') => db.query(`INSERT INTO auth.users (id, created_at) VALUES ($1, now() - $2::interval)`, [U(n), createdAgo]);
const coins = async (db: PGlite, n: number) => (await db.query<{ coins: number }>('SELECT coins FROM public.wallets WHERE user_id = $1', [U(n)])).rows[0]?.coins;
const apply = async (db: PGlite, code: string) => (await db.query<{ ok: boolean }>('SELECT public.apply_invite($1) AS ok', [code])).rows[0]!.ok;
const codeOf = async (db: PGlite, n: number) => (await db.query<{ code: string }>('SELECT code FROM public.invite_codes WHERE user_id = $1', [U(n)])).rows[0]!.code;
const KST_DAY = `(date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
const KST_MONTH = `(date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;

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
    // 이미 4엽전을 가진 기존 회원은 그대로
    await newUser(db, 2);
    await db.query('INSERT INTO public.wallets VALUES ($1, 4)', [U(2)]);
    await as(db, 2);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await coins(db, 2)).toBe(4);
    await as(db, null);
    await expect(db.exec('SELECT public.ensure_user_setup()')).rejects.toThrow(/NOT_SIGNED_IN/);
    await db.close();
  });
});

describe('apply_invite: 보상 1엽전, 한국 시간 한도', () => {
  async function inviter(db: PGlite) {
    await newUser(db, 100, '10 days');
    await as(db, 100);
    await db.exec('SELECT public.ensure_user_setup()');
    return codeOf(db, 100);
  }

  it('초대받은 사람이 적용하면 초대한 사람에게 1엽전이 지급되고 초대받은 사람은 0 그대로', async () => {
    const db = await setup();
    const code = await inviter(db);
    await newUser(db, 1);
    await as(db, 1);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await apply(db, code.toLowerCase() + ' ')).toBe(true); // 대소문자·공백 허용
    expect(await coins(db, 100)).toBe(1);
    expect(await coins(db, 1)).toBe(0);
    expect(await apply(db, code)).toBe(false); // 두 번째는 거부
    expect(await coins(db, 100)).toBe(1);
    await db.close();
  });

  it('자기 초대·없는 코드·가입 3일 지난 계정·비로그인은 거부', async () => {
    const db = await setup();
    const code = await inviter(db);
    await as(db, 100);
    expect(await apply(db, code)).toBe(false); // 자기 자신(가입 10일 전이라 어차피 거부)
    await newUser(db, 2);
    await as(db, 2);
    await db.exec('SELECT public.ensure_user_setup()');
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

  it('하루 5건: 한국 시간 오늘 0시 이후만 센다(어제 23:59 KST 건은 안 셈)', async () => {
    const db = await setup();
    const code = await inviter(db);
    // 어제 23:59 KST 에 4건 → 오늘 기준 0건이므로 5건 더 받을 수 있어야 한다
    for (let i = 0; i < 4; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_DAY} - interval '1 minute')`, [U(500 + i), U(100)]);
    for (let i = 0; i < 5; i++) {
      await newUser(db, 10 + i);
      await as(db, 10 + i);
      await db.exec('SELECT public.ensure_user_setup()');
      expect(await apply(db, code), `오늘 ${i + 1}번째`).toBe(true);
    }
    await newUser(db, 20);
    await as(db, 20);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await apply(db, code), '오늘 6번째').toBe(false);
    expect(await coins(db, 100)).toBe(5);
    await db.close();
  });

  it('월 30건: 한국 시간 이번 달 1일 0시 이후만 센다(지난달 마지막 분 건은 안 셈)', async () => {
    const db = await setup();
    const code = await inviter(db);
    // 지난달 마지막 분에 30건 → 이번 달 기준 0건이라 받을 수 있다
    for (let i = 0; i < 30; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_MONTH} - interval '1 minute')`, [U(600 + i), U(100)]);
    await newUser(db, 1);
    await as(db, 1);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await apply(db, code)).toBe(true);
    // 이번 달 시작 시각 정각에 29건을 더 넣어 총 30건(이번 달 기준) → 다음 초대는 거부 (오늘 한도에도 걸릴 수 있으나 어느 쪽이든 false)
    for (let i = 0; i < 29; i++) await db.query(`INSERT INTO public.invite_rewards VALUES ($1, $2, ${KST_MONTH})`, [U(700 + i), U(100)]);
    await newUser(db, 2);
    await as(db, 2);
    await db.exec('SELECT public.ensure_user_setup()');
    expect(await apply(db, code)).toBe(false);
    await db.close();
  });

  it('함수 본문: search_path 고정, 초대자 행 잠금, 보상 상수 1', async () => {
    const db = await setup();
    const r = await db.query<{ def: string; cfg: string[] }>(`SELECT pg_get_functiondef(p.oid) AS def, p.proconfig AS cfg FROM pg_proc p WHERE p.proname = 'apply_invite'`);
    expect(r.rows[0]!.cfg).toContain('search_path=""');
    expect(r.rows[0]!.def).toMatch(/FOR UPDATE/i);
    expect(r.rows[0]!.def).toMatch(/c_reward\s+constant integer := 1;/);
    expect(r.rows[0]!.def).toMatch(/Asia\/Seoul/);
    await db.close();
  });
});
