import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// AI 풀이 저장 SQL(AI_READINGS_REVIEW_ONLY, 운영 미적용)을 운영과 같은 모양의 모의 스키마에서 확인한다.
// 단일 연결(PGlite)이라 동시 요청 직렬화(advisory lock·행 잠금)는 검증하지 못한다 → staging 확인 항목.
const SQL = readFileSync(new URL('../../lovable-app/docs/migrations/REVIEW_ONLY/AI_READINGS_REVIEW_ONLY.sql', import.meta.url), 'utf8');
const U = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const RID = 'basic:0123456789abcd';
const V = 'ai-v1';

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('test.uid', true), '')::uuid $f$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  `);
  await db.exec(SQL);
  for (const n of [1, 2, 3]) await db.query('INSERT INTO auth.users (id) VALUES ($1)', [U(n)]);
  return db;
}
type Begin = { state: string; id?: string; attempt?: number; status?: string };
const begin = async (db: PGlite, n: number, rid = RID, o: { daily?: number; usd?: number; reserve?: number; stale?: number } = {}) =>
  (await db.query<{ r: Begin }>('SELECT public.ai_reading_begin($1,$2,$3,$4,$5,$6,$7) AS r', [U(n), rid, V, o.daily ?? 3, o.usd ?? 5, o.reserve ?? 0.1, o.stale ?? 300])).rows[0]!.r;
const finish = async (db: PGlite, id: string, attempt: number, status: string, cost = 0.05) =>
  (await db.query<{ ok: boolean }>('SELECT public.ai_reading_finish($1,$2,$3,$4,$5,$6,$7,$8) AS ok', [id, attempt, status, status === 'failed' ? null : JSON.stringify([{ id: 's1', body: 'x' }]), null, 'm', cost, status === 'failed' ? 'E' : null])).rows[0]!.ok;
const asRole = async (db: PGlite, role: string, uid: number | null) => { await db.exec(`SET ROLE ${role}`); await db.exec(`SELECT set_config('test.uid', '${uid === null ? '' : U(uid)}', false)`); };

describe('AI 풀이 저장 SQL (REVIEW_ONLY)', () => {
  it('처음은 start, 만드는 중이면 running, 끝나면 done — 같은 풀이를 두 번 만들지 않는다', async () => {
    const db = await setup();
    const a = await begin(db, 1);
    expect(a.state).toBe('start');
    expect((await begin(db, 1)).state).toBe('running');
    expect(await finish(db, a.id!, 1, 'ready')).toBe(true);
    expect(await begin(db, 1)).toMatchObject({ state: 'done', status: 'ready' });
    // 끝난 행은 다시 끝낼 수 없다
    expect(await finish(db, a.id!, 1, 'blocked')).toBe(false);
  });

  it('실패하면 다시 시작할 수 있고, 3번째 시도까지만 허용한다. 늦게 온 옛 시도의 결과는 반영하지 않는다', async () => {
    const db = await setup();
    const a = await begin(db, 1);
    await finish(db, a.id!, 1, 'failed');
    const b = await begin(db, 1);
    expect(b).toMatchObject({ state: 'start', attempt: 2 });
    expect(await finish(db, b.id!, 1, 'ready')).toBe(false); // 옛 시도 번호
    await finish(db, b.id!, 2, 'failed');
    expect((await begin(db, 1)).attempt).toBe(3);
    await finish(db, b.id!, 3, 'failed');
    expect((await begin(db, 1)).state).toBe('exhausted');
    // 원가는 실패한 시도까지 누적된다
    const cost = (await db.query<{ c: string }>('SELECT cost_usd::text AS c FROM public.ai_readings')).rows[0]!.c;
    expect(Number(cost)).toBeCloseTo(0.15);
  });

  it('오래 멈춘 작업(stale)만 다시 시작한다', async () => {
    const db = await setup();
    const a = await begin(db, 1);
    await db.query(`UPDATE public.ai_readings SET started_at = now() - interval '10 minutes' WHERE id = $1`, [a.id]);
    expect(await begin(db, 1)).toMatchObject({ state: 'start', attempt: 2 });
  });

  it('한 사람의 하루 새 풀이 개수, 전체 하루 원가(진행 중 예약 포함)를 넘지 않는다', async () => {
    const db = await setup();
    for (let i = 0; i < 2; i++) expect((await begin(db, 1, `basic:${String(i).repeat(14)}`, { daily: 2 })).state).toBe('start');
    expect((await begin(db, 1, 'basic:aaaaaaaaaaaaaa', { daily: 2 })).state).toBe('user_limit');
    // 전체 상한 0.25달러, 예약 0.1: 진행 중 2건(0.2) + 이번 0.1 > 0.25 → budget
    expect((await begin(db, 2, RID, { usd: 0.25, reserve: 0.1 })).state).toBe('budget');
  });

  it('회원은 자기 행만 읽고, 쓰기·함수 호출은 못 한다', async () => {
    const db = await setup();
    const a = await begin(db, 1);
    await finish(db, a.id!, 1, 'ready');
    await asRole(db, 'authenticated', 1);
    expect((await db.query('SELECT id FROM public.ai_readings')).rows.length).toBe(1);
    await asRole(db, 'authenticated', 2);
    expect((await db.query('SELECT id FROM public.ai_readings')).rows.length).toBe(0);
    await expect(db.query(`UPDATE public.ai_readings SET status = 'ready'`)).rejects.toThrow();
    await expect(db.query(`INSERT INTO public.ai_readings (user_id, reading_id, version_key) VALUES ($1, $2, 'x')`, [U(2), RID])).rejects.toThrow();
    await expect(begin(db, 2)).rejects.toThrow();
    await asRole(db, 'anon', null);
    await expect(db.query('SELECT id FROM public.ai_readings')).rejects.toThrow();
    await db.exec('RESET ROLE');
  });

  it('잘못된 열람 id·상태·원가를 거부한다', async () => {
    const db = await setup();
    await expect(begin(db, 1, 'basic:XYZ')).rejects.toThrow();
    const a = await begin(db, 1);
    await expect(db.query('SELECT public.ai_reading_finish($1,1,$2,$3,null,null,0,null)', [a.id, 'running', '[]'])).rejects.toThrow();
    await expect(db.query('SELECT public.ai_reading_finish($1,1,$2,$3,null,null,-1,null)', [a.id, 'ready', '[]'])).rejects.toThrow();
    await expect(db.query('SELECT public.ai_reading_finish($1,1,$2,null,null,null,0,null)', [a.id, 'ready'])).rejects.toThrow();
  });
});
