// 양력 → 음력 전수 덤프 (독립 라이브러리 대조용).  사용: npx tsx engine/manse/tools/verify/dump-lunar.ts <출력.json> [끝연도]
import { writeFileSync } from 'node:fs';
import { solarToLunar } from '../../src/lunar';
import { daysInMonth } from '../../src/time';
const out: number[][] = [];
const last = Number(process.argv[3] ?? 2100);
for (let y = 1900; y <= last; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysInMonth(y, m); d++) {
  const r = solarToLunar(y, m, d);
  if (!r.ok) throw new Error(`${y}-${m}-${d} ${r.error.message}`);
  out.push([y, m, d, r.value.year, r.value.month, r.value.day, r.value.leap ? 1 : 0]);
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('days', out.length);
