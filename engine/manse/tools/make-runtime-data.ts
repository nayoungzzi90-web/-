// 런타임용 축소 표 생성 (브라우저 번들 크기 때문). 사용: npx tsx engine/manse/tools/make-runtime-data.ts
import { writeFileSync } from 'node:fs';
import full from '../data/solar_terms.json';
const rows = (full.rows as Array<{ year: number; lon: number; utc_ms: number; x_swe_s: number }>).map((r) => [r.year, r.lon, r.utc_ms, Math.abs(r.x_swe_s) <= 5 ? 1 : 0]);
writeFileSync('engine/manse/data/solar_terms.runtime.json', JSON.stringify({ source: full.source, rows }));
console.log('rows', rows.length);
