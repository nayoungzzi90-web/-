// 절입·합삭 JSON → PostgreSQL 시드 SQL.  사용: npx tsx engine/manse/tools/gen-seed-sql.ts [출력경로]
import { writeFileSync } from 'node:fs';
import terms from '../data/solar_terms.json';
import moons from '../data/new_moons.json';

export const DATASET_ID = 'de421-own-v1';
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
/** UTC+9 고정 표기. 초 아래는 버린다(반올림으로 분 경계를 넘기지 않기 위함). */
export function kstDisplay(utcMs: number): string {
  const d = new Date(Math.floor(utcMs / 1000) * 1000 + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
const iso = (ms: number) => new Date(ms).toISOString();
import { uncertaintyForYear } from '../src/terms';
export const uncertaintySeconds = uncertaintyForYear;

export function buildSeedSql(): string {
  const out: string[] = [];
  out.push(`insert into solar_term_datasets(id,title,ephemeris,engine_version,time_scale_policy,range_from_year,range_to_year,notes) values (${q(DATASET_ID)},'24절기 절입 시각 (자체 계산)',${q(terms.source)},'manse-ref-1.0','TT→UTC: 1972 이후 윤초표(37초 유지), 이전은 UTC≈UT1=TT-ΔT(IERS/Morrison-Stephenson 표). 미래 윤초는 가정하지 않음',1899,2101,'공식(KASI) 값과의 일치는 미확인. 2051년 이후는 JPL DE421 공식 범위 밖일 수 있어 Swiss(Moshier) 와만 대조.') on conflict do nothing;`);
  const rows = terms.rows as Array<{ year: number; lon: number; name: string; utc_ms: number; x_swe_s: number; x_ae_s: number | null }>;
  // term_seq: 소한(285)=1 … 동지(270)=24
  const seqOf = (lon: number) => ((((lon - 285) % 360) + 360) % 360) / 15 + 1;
  const vals = rows.map((r) => `(${q(DATASET_ID)},${r.year},${seqOf(r.lon)},${q(r.name)},${r.lon},${q(iso(r.utc_ms))},${q(kstDisplay(r.utc_ms))},${q('JPL DE421 own reduction')},'manse-ref-1.0','computed',${uncertaintySeconds(r.year)})`);
  for (let i = 0; i < vals.length; i += 500) out.push(`insert into solar_terms(dataset_id,year,term_seq,term_name,sun_longitude,utc_instant,kst_display,source,engine_version,verification_status,uncertainty_seconds) values\n${vals.slice(i, i + 500).join(',\n')};`);
  const chk: string[] = [];
  for (const r of rows) {
    chk.push(`(${q(DATASET_ID)},${r.year},${seqOf(r.lon)},'swisseph-moshier',${r.x_swe_s},5)`);
    if (r.x_ae_s !== null) chk.push(`(${q(DATASET_ID)},${r.year},${seqOf(r.lon)},'astronomy-engine',${r.x_ae_s},90)`);
  }
  for (let i = 0; i < chk.length; i += 1000) out.push(`insert into solar_term_checks(term_id,check_source,delta_seconds,tolerance_seconds) select t.id,v.src,v.d,v.tol from (values\n${chk.slice(i, i + 1000).join(',\n')}) as v(ds,y,seq,src,d,tol) join solar_terms t on t.dataset_id=v.ds and t.year=v.y and t.term_seq=v.seq;`);
  const msrc = (moons as { sources: string[] }).sources;
  const ms = (moons.utc_ms as number[]).map((m, i) => `(${q(DATASET_ID)},${i},${q(iso(m))},${q(kstDisplay(m))},${q(msrc[i])})`);
  for (let i = 0; i < ms.length; i += 500) out.push(`insert into new_moons(dataset_id,seq,utc_instant,kst_display,source) values\n${ms.slice(i, i + 500).join(',\n')};`);
  out.push(`select * from refresh_solar_term_status(${q(DATASET_ID)});`);
  return out.join('\n');
}

if (process.argv[1]?.endsWith('gen-seed-sql.ts')) {
  const path = process.argv[2] ?? 'engine/manse/build/seed.sql';
  writeFileSync(path, buildSeedSql());
  console.log('wrote', path);
}
