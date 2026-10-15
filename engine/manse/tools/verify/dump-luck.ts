// 대운 덤프 (lunar_python 대조용).  사용: npx tsx engine/manse/tools/verify/dump-luck.ts <출력.json> [개수]
import { writeFileSync } from 'node:fs';
import { calculate } from '../../src/engine';
import { daysInMonth } from '../../src/time';
import { JIE } from '../../src/terms';
function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }
const r = rng(777), n = Number(process.argv[3] ?? 3000), rows: unknown[] = [];
while (rows.length < n) {
  const y = 1962 + Math.floor(r() * 59), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * daysInMonth(y, m));
  const h = Math.floor(r() * 24), mi = Math.floor(r() * 60), g = r() < 0.5 ? 'M' : 'F';
  if (y === 1987 || y === 1988) continue;
  const base = { calendar: 'solar' as const, year: y, month: m, day: d, hour: h, minute: mi, gender: g as 'M' | 'F' };
  const a = calculate(base, { timeBasis: 'ERA_WALL_CLOCK', luck: { startPrecision: 'EXACT', yearLengthDays: 360 } });
  const b = calculate(base, { timeBasis: 'ERA_WALL_CLOCK', solarTime: { mode: 'FIXED_OFFSET', fixedOffsetMinutes: -60 }, luck: { startPrecision: 'SHICHEN' } }); // 시계를 UTC+8(베이징)로 맞춰 lunar_python 과 같은 시진 번호를 쓴다
  if (!a.ok || !b.ok || !a.value.luck || !b.value.luck) continue;
  const utc = Date.parse(a.value.time.utc as string);
  const near = Math.min(...JIE.filter((t) => Math.abs(t.ms - utc) < 40 * 86400_000).map((t) => Math.abs(t.ms - utc))) / 3600_000;
  const L = a.value.luck, S = b.value.luck;
  rows.push([y, m, d, h, mi, g, L.direction, L.startAge.years, L.startAge.months, L.startAge.days, S.startAge.years, S.startAge.months, S.startAge.days, L.pillars.slice(0, 3).map((p) => p.pillar.ganji), Math.round(near)]);
}
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log('rows', rows.length);
