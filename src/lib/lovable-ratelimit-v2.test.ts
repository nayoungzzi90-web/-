import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// R015 요청 제한 SQL v2(기회적 정리 포함, REVIEW_ONLY)를 PGlite 에서 실행해 한도·원자성·권한·정리를 확인한다.
// v1 은 staging 에서 통과했다. v2 는 함수 하나만 바뀌었으므로 같은 시나리오를 다시 돌려 회귀를 막고, staging 재검증 전까지는 "미적용" 상태다.
const SQL = readFileSync(new URL('../../lovable-app/docs/migrations/REVIEW_ONLY/R015_SAJU_RATE_LIMIT_REVIEW_ONLY_v2.sql', import.meta.url), 'utf8');
const H = (n: number) => n.toString(16).padStart(64, '0');

async function setup() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;');
  await db.exec(SQL);
  return db;
}
const hit = async (db: PGlite, scope: string, h: string) => (await db.query<{ ok: boolean }>('SELECT public.saju_rate_limit_hit($1,$2) AS ok', [scope, h])).rows[0]!.ok;

describe('R015 요청 제한 SQL v2', () => {
  it('saju_preview 30회 허용 후 거부, saju_preview_unknown 10회 허용 후 거부, 키마다 독립', async () => {
    const db = await setup();
    const minute = async () => (await db.query<{ m: string }>(`SELECT date_trunc('minute', now())::text AS m`)).rows[0]!.m;
    // 고정 60초 창이라 시험 도중 분이 바뀌면 건너뛰고 새 키로 다시 한다(드문 경계 우연 방지)
    for (let attempt = 0; attempt < 3; attempt++) {
      const m0 = await minute();
      const res: boolean[] = [];
      for (let i = 0; i < 31; i++) res.push(await hit(db, 'saju_preview', H(100 + attempt)));
      const u: boolean[] = [];
      for (let i = 0; i < 11; i++) u.push(await hit(db, 'saju_preview_unknown', H(200 + attempt)));
      if ((await minute()) !== m0) continue;
      expect(res.filter(Boolean)).toHaveLength(30);
      expect(res[30]).toBe(false);
      expect(u.filter(Boolean)).toHaveLength(10);
      expect(await hit(db, 'saju_preview', H(300 + attempt))).toBe(true); // 다른 해시는 영향 없음
      break;
    }
    await db.close();
  });

  it('잘못된 scope·해시 형식은 예외', async () => {
    const db = await setup();
    await expect(hit(db, 'other', H(1))).rejects.toThrow(/INVALID_SCOPE/);
    await expect(hit(db, 'saju_preview', 'zz')).rejects.toThrow(/INVALID_IDENTITY/);
    await db.close();
  });

  it('anon·authenticated 는 RPC 와 표에 접근할 수 없고 service_role 은 호출할 수 있다', async () => {
    const db = await setup();
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(hit(db, 'saju_preview', H(9))).rejects.toThrow(/permission denied/);
      await expect(db.query('SELECT * FROM private_saju.rate_buckets')).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    expect(await hit(db, 'saju_preview', H(9))).toBe(true);
    await db.exec('RESET ROLE');
    await db.close();
  });

  it('v2: 호출 중 기회적으로 오래된 버킷을 정리한다(cron 불필요)', async () => {
    const db = await setup();
    for (let i = 0; i < 50; i++) await db.query(`INSERT INTO private_saju.rate_buckets VALUES ('saju_preview', $1, now() - interval '1 hour', 1)`, [H(1000 + i)]);
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM private_saju.rate_buckets')).rows[0]!.n).toBe(50);
    // 2% 확률 정리: 800번 호출하면 정리가 한 번도 안 일어날 확률 ≈ 1e-7
    for (let i = 0; i < 800; i++) await hit(db, 'saju_preview', H(5000 + i));
    const old = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM private_saju.rate_buckets WHERE minute_bucket < now() - interval '10 minutes'`)).rows[0]!.n;
    expect(old).toBe(0);
    await db.close();
  });

  it('수동 정리 함수도 동작한다', async () => {
    const db = await setup();
    await db.query(`INSERT INTO private_saju.rate_buckets VALUES ('saju_preview', $1, now() - interval '1 hour', 1)`, [H(1)]);
    const r = await db.query<{ n: number }>('SELECT private_saju.cleanup_rate_buckets() AS n');
    expect(r.rows[0]!.n).toBe(1);
    await db.close();
  });
});

describe('ACL 문자열 분석', () => {
  it('relacl 을 권한 목록으로 푼다(PG17 MAINTAIN 포함, 빈 grantee 는 PUBLIC)', async () => {
    // @ts-expect-error mjs 스크립트에는 타입 선언이 없다
    const { parseAcl } = (await import('../../lovable-app/scripts/analyze-snapshot.mjs')) as { parseAcl: (a: string) => { grantee: string; privilege: string }[] };
    const r = parseAcl('{postgres=arwdDxtm/postgres,anon=arwdxtm/postgres,=r/postgres,sandbox_exec=ar/postgres}');
    const of = (g: string) => r.filter((x) => x.grantee === g).map((x) => x.privilege).sort();
    expect(of('anon')).toEqual(['DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'UPDATE']); // TRUNCATE 없음
    expect(of('PUBLIC')).toEqual(['SELECT']);
    expect(of('sandbox_exec')).toEqual(['INSERT', 'SELECT']);
    expect(parseAcl('')).toEqual([]);
  });
});
