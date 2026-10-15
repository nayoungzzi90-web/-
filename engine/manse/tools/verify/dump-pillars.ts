// 무작위 출생 시각의 4주 덤프 (sxtwl 대조용).  사용: npx tsx engine/manse/tools/verify/dump-pillars.ts <출력.json> [개수] [시드]
import { writeFileSync } from 'node:fs';
import { calculate } from '../../src/engine';
import { daysInMonth } from '../../src/time';
import { JIE } from '../../src/terms';

function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }
const n = Number(process.argv[3] ?? 5000), r = rng(Number(process.argv[4] ?? 20261015));
const rows: unknown[] = [];
while (rows.length < n) {
  const y = 1900 + Math.floor(r() * 201), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * daysInMonth(y, m));
  const h = Math.floor(r() * 24), mi = Math.floor(r() * 60);
  const res = calculate({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi }, { timeBasis: 'ERA_WALL_CLOCK', ziHour: 'ZI_SPLIT_YAJA' });
  if (!res.ok) continue; // 서머타임 공백/중복
  const v = res.value;
  const utc = Date.parse(v.time.utc as string);
  const nearest = Math.min(...JIE.filter((t) => Math.abs(t.ms - utc) < 40 * 86400_000).map((t) => Math.abs(t.ms - utc)));
  rows.push([y, m, d, h, mi, v.pillars.year.ganji, v.pillars.month.ganji, v.pillars.day.ganji, v.pillars.hour?.ganji, Math.round(nearest / 3600_000)]);
}
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log('rows', rows.length);
