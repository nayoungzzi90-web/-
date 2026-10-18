import { computeSaju, solarTermsUtc, utcToSeoulWall } from '../../../../lovable-app/src/lib/saju-engine.server';
import { calculate } from '../../src/engine';
let n = 0, skipped = 0, diffMonthYear = 0, flagBoth = 0, flagOneOnly = 0; const ex: string[] = []; const
const offs = [-1800, -600, -300, -150, -100, -45, -5, 5, 45, 100, 150, 300, 600, 1800];
for (let y = 1901; y <= 2025; y++) for (const t of solarTermsUtc(y)) for (const o of offs) {
  const w = utcToSeoulWall(new Date(t.getTime() + o * 1000));
  const a = computeSaju({ year: w.y, month: w.mo, day: w.d, hour: w.h, minute: w.mi }); // 분 단위 (초 버림)
  const b = calculate({ calendar: 'solar', year: w.y, month: w.mo, day: w.d, hour: w.h, minute: w.mi }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' });
  if (!a.ok || !a.pillars || !b.ok) { skipped++; continue; }
  n++;
  const r = b.value;
  const same = a.pillars.year.hanja === r.pillars.year.ganji && a.pillars.month.hanja === r.pillars.month.ganji;
  const fa = !!a.needsReview, fb = r.status === 'NEEDS_REVIEW' || r.uncertainties.some((u) => u.severity === 'REVIEW');
  if (!same) { diffMonthYear++; if (!fa && !fb && ex.length < 10) ex.push(`${y} off=${o}s ${w.y}-${w.mo}-${w.d} ${w.h}:${w.mi} L=${a.pillars.year.hanja}/${a.pillars.month.hanja} M=${r.pillars.year.ganji}/${r.pillars.month.ganji}`); }
  if (fa && fb) flagBoth++; else if (fa !== fb) flagOneOnly++;
}
console.log(JSON.stringify({ n, skipped, diffMonthYear, flagBoth, flagOneOnly, unflaggedDisagreements: ex.length }));
console.log(ex.join('\n'));
