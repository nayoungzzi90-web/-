import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildSeedSql, DATASET_ID } from '../tools/gen-seed-sql';

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync('supabase/migrations/0005_solar_terms.sql', 'utf8'));
  await db.exec(buildSeedSql());
}, 120_000);

const one = async <T = Record<string, unknown>>(sql: string): Promise<T> => (await db.query(sql)).rows[0] as T;

describe('절입 DB 스키마 (PGlite)', () => {
  it('마이그레이션+시드가 적용되고 행 수가 맞다 (1899 부분 + 1900~2101 × 24)', async () => {
    const r = await one<{ n: number; y0: number; y1: number }>(`select count(*)::int n, min(year) y0, max(year) y1 from solar_terms`);
    expect(r.y0).toBe(1899); expect(r.y1).toBe(2101);
    expect(r.n).toBeGreaterThanOrEqual(1900 * 0 + 202 * 24 - 0); // 1900..2101
    const full = await one<{ n: number }>(`select count(*)::int n from solar_terms where year between 1900 and 2100`);
    expect(full.n).toBe(201 * 24);
  });
  it('절(節) 12개/해, 연도·순서 유일, 필수 컬럼이 채워짐', async () => {
    const r = await one<{ bad: number }>(`select count(*)::int bad from (select year from solar_terms where year between 1900 and 2100 group by year having count(*) filter (where is_jie) <> 12 or count(*) <> 24) x`);
    expect(r.bad).toBe(0);
    const n = await one<{ n: number }>(`select count(*)::int n from solar_terms where source is null or engine_version is null or kst_display is null`);
    expect(n.n).toBe(0);
  });
  it('시각 순서가 황경 순서와 일치 (같은 해 소한<…<동지)', async () => {
    const r = await one<{ bad: number }>(`select count(*)::int bad from solar_terms a join solar_terms b on a.dataset_id=b.dataset_id and a.year=b.year and b.term_seq=a.term_seq+1 where b.utc_instant <= a.utc_instant`);
    expect(r.bad).toBe(0);
  });
  it('인접 절기 간격은 14~16.5일', async () => {
    const r = await one<{ lo: number; hi: number }>(`select min(g)::float lo, max(g)::float hi from (select extract(epoch from (b.utc_instant - a.utc_instant))/86400 g from solar_terms a join solar_terms b on a.year=b.year and b.term_seq=a.term_seq+1) x`);
    expect(r.lo).toBeGreaterThan(14); expect(r.hi).toBeLessThan(16.5);
  });
  it('제약: 황경 15의 배수 아님/연도 범위/상태값 위반은 거부', async () => {
    const bad = (v: string) => db.exec(`insert into solar_terms(dataset_id,year,term_seq,term_name,sun_longitude,utc_instant,kst_display,source,engine_version,uncertainty_seconds) values ${v}`);
    await expect(bad(`('${DATASET_ID}',2000,1,'x',7,now(),'2000-01-01 00:00:00','s','v',1)`)).rejects.toThrow();
    await expect(bad(`('${DATASET_ID}',1850,1,'x',0,now(),'1850-01-01 00:00:00','s','v',1)`)).rejects.toThrow();
    await expect(bad(`('${DATASET_ID}',2000,9,'x',0,now(),'2000-01-01','s','v',1)`)).rejects.toThrow();
    await expect(db.exec(`update solar_terms set verification_status='confirmed' where id=1`)).rejects.toThrow();
  });
  it('시드 직후: 교차검증 통과 → cross_checked, official_confirmed 는 0건 (공식값 없음)', async () => {
    const rows = (await db.query<{ status: string; n: number }>(`select verification_status status, count(*)::int n from solar_terms group by 1`)).rows;
    const m = Object.fromEntries(rows.map((r) => [r.status, r.n]));
    expect(m.official_confirmed ?? 0).toBe(0);
    expect(m.cross_checked).toBeGreaterThan(4800);
    expect(m.computed ?? 0).toBe(0);
  });
  it('교차검증에 실패한 행은 cross_checked 가 되지 않는다', async () => {
    await db.exec(`update solar_term_checks set delta_seconds = 99 where id = (select min(id) from solar_term_checks where check_source='swisseph-moshier')`);
    await db.exec(`select * from refresh_solar_term_status('${DATASET_ID}')`);
    const r = await one<{ n: number }>(`select count(*)::int n from solar_terms where verification_status='computed'`);
    expect(r.n).toBe(1);
    await db.exec(`update solar_term_checks set delta_seconds = 0 where delta_seconds = 99`);
    await db.exec(`select * from refresh_solar_term_status('${DATASET_ID}')`);
  });
  it('공식값 비교: 같은 분→confirmed, 경계 초→boundary_review, 1~2분 차이→boundary_review, 크게 다르면 mismatch', async () => {
    const t = async (year: number, seq: number) => one<{ kst: string; id: number; name: string }>(`select kst_display kst, id, term_name name from solar_terms where dataset_id='${DATASET_ID}' and year=${year} and term_seq=${seq}`);
    const put = (year: number, name: string, kstMinute: string) => db.exec(`insert into official_solar_terms(year,term_name,official_kst_minute,source_document) values (${year},'${name}','${kstMinute}','TEST-FIXTURE')`);
    const st = async (year: number, seq: number) => (await one<{ s: string }>(`select verification_status s from solar_terms where dataset_id='${DATASET_ID}' and year=${year} and term_seq=${seq}`)).s;
    // 경계에서 떨어진 항목을 찾는다 (초 10~50)
    const pick = async (year: number) => (await db.query<{ seq: number }>(`select term_seq seq from solar_terms where year=${year} and substring(kst_display from 18 for 2)::int between 10 and 50 order by term_seq`)).rows.map((r) => r.seq);
    const [a, b, c] = await pick(2020);
    const A = await t(2020, a), B = await t(2020, b), C = await t(2020, c);
    await put(2020, A.name, A.kst.slice(0, 16) + ':00');                              // 같은 분
    const bm = new Date(B.kst.replace(' ', 'T') + 'Z'); bm.setUTCSeconds(0); bm.setUTCMinutes(bm.getUTCMinutes() + 2);
    await put(2020, B.name, bm.toISOString().slice(0, 16).replace('T', ' ') + ':00'); // 2분 뒤 (|Δ|≈2분 → mismatch)
    const cm = new Date(C.kst.replace(' ', 'T') + 'Z'); cm.setUTCSeconds(0); cm.setUTCMinutes(cm.getUTCMinutes() + 1);
    await put(2020, C.name, cm.toISOString().slice(0, 16).replace('T', ' ') + ':00'); // 1분 뒤
    await db.exec(`select * from refresh_solar_term_status('${DATASET_ID}')`);
    expect(await st(2020, a)).toBe('official_confirmed');
    expect(await st(2020, b)).toBe('official_mismatch');
    expect(await st(2020, c)).toBe('boundary_review');
    await db.exec(`delete from official_solar_terms where source_document='TEST-FIXTURE'`);
    await db.exec(`select * from refresh_solar_term_status('${DATASET_ID}')`);
    expect(await st(2020, a)).toBe('cross_checked');
  });
  it('RLS: 읽기 전용 정책만 존재 (checks/official 은 service role 전용)', async () => {
    const r = (await db.query<{ tablename: string; policyname: string }>(`select tablename, policyname from pg_policies order by 1,2`)).rows.map((x) => x.tablename);
    expect(r).toEqual(['new_moons', 'solar_term_datasets', 'solar_terms']);
  });
});
