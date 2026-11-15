// 사용: cd lovable-app && npm install --legacy-peer-deps && NODE_PATH=node_modules npx tsx ../engine/manse/tools/crosscheck/compare-lunar.ts 1900 2050
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculate } from '../../src/engine';
const [from, to] = [Number(process.argv[2] ?? 1900), Number(process.argv[3] ?? 2050)];
let n = 0; const bad: string[] = []; let leapDays = 0;
for (let y = from; y <= to; y++) {
  for (let t = Date.UTC(y, 0, 1); t <= Date.UTC(y, 11, 31); t += 86400000) {
    const d = new Date(t), mo = d.getUTCMonth() + 1, da = d.getUTCDate();
    const k = new KoreanLunarCalendar();
    if (!k.setSolarDate(y, mo, da)) { bad.push(`${y}-${mo}-${da} lib-unsupported`); continue; }
    const kl = k.getLunarCalendar();
    const r = calculate({ calendar: 'solar', year: y, month: mo, day: da, hour: 12, minute: 0 });
    if (!r.ok) { bad.push(`${y}-${mo}-${da} mine-error`); continue; }
    const ml = r.value.calendar.lunar as any;
    n++;
    if (!ml) { bad.push(`${y}-${mo}-${da} mine-null`); continue; }
    const mLeap = !!(ml.leap ?? ml.isLeap ?? ml.leapMonth);
    if (kl.intercalation) leapDays++;
    if (ml.year !== kl.year || ml.month !== kl.month || ml.day !== kl.day || mLeap !== !!kl.intercalation) bad.push(`${y}-${mo}-${da} lib=${kl.year}-${kl.month}-${kl.day}${kl.intercalation ? 'L' : ''} mine=${JSON.stringify(ml)}`);
  }
}
console.log(JSON.stringify({ from, to, compared: n, leapDays, mismatches: bad.length }));
console.log(bad.slice(0, 15).join('\n'));
