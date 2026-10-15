"""우리 음양력 변환(전수 덤프) ↔ korean_lunar_calendar(KASI 자료 기반, 1000–2050) 대조. 사용: python cmp_lunar.py lunar_mine.json"""
import json, sys, collections
from korean_lunar_calendar import KoreanLunarCalendar
mine = json.load(open(sys.argv[1]))
c = KoreanLunarCalendar()
diff = []; n = 0
for y, m, d, ly, lm, ld, lp in mine:
    if y > 2050: continue
    if not c.setSolarDate(y, m, d): diff.append((y, m, d, 'REF_UNSUPPORTED')); continue
    n += 1
    ref = (c.lunarYear, c.lunarMonth, c.lunarDay, 1 if c.isIntercalation else 0)
    if ref != (ly, lm, ld, lp): diff.append((y, m, d, (ly, lm, ld, lp), ref))
print('compared days:', n, ' mismatches:', len(diff))
by = collections.Counter(x[0] // 10 * 10 for x in diff)
print('mismatch by decade:', dict(sorted(by.items())))
for x in diff[:40]: print(x)
json.dump(diff, open(sys.argv[1].replace('.json', '_diff.json'), 'w'))
