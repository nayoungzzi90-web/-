import { computeSaju } from '../../../../lovable-app/src/lib/saju-engine.server';
import { calculate } from '../../src/engine';
const basis = (process.argv[2] ?? 'ERA_WALL_CLOCK') as any;
const stride = Number(process.argv[3] ?? 3);
const times: [number, number][] = [[3, 30], [15, 30], [23, 30]];
let n = 0, skip = 0; const diffs: Record<string, number> = {}; const ex: string[] = [];
const t0 = Date.now();
for (let y = 1900; y <= 2026; y++) {
  const start = Date.UTC(y, 0, 1), end = Date.UTC(y, 11, 31);
  for (let t = start, i = 0; t <= end; t += 86400000 * stride, i++) {
    const d = new Date(t); const mo = d.getUTCMonth() + 1, da = d.getUTCDate();
    for (const [h, mi] of times) {
      const a = computeSaju({ year: y, month: mo, day: da, hour: h, minute: mi });
      const b = calculate({ calendar: 'solar', year: y, month: mo, day: da, hour: h, minute: mi }, { ziHour: 'MIDNIGHT', timeBasis: basis });
      if (!a.ok || !a.pillars || !b.ok) { skip++; continue; }
      n++;
      const r = b.value;
      const P = a.pillars;
      const mine = { year: r.pillars.year, month: r.pillars.month, day: r.pillars.day, hour: r.pillars.hour };
      for (const k of ['year', 'month', 'day', 'hour'] as const) {
        const x = (P as any)[k]?.hanja; const m = (mine as any)[k]; const yv = m ? m.ganji : null;
        if (x !== yv) { diffs[k] = (diffs[k] ?? 0) + 1; if (ex.length < 12) ex.push(`${y}-${mo}-${da} ${h}:${mi} ${k} lovable=${x} mine=${yv} nr=${a.needsReview} st=${r.status}`); }
      }
    }
  }
}
console.log(JSON.stringify({ basis, stride, compared: n, skipped: skip, diffs, ms: Date.now() - t0 }));
console.log(ex.join('\n'));
