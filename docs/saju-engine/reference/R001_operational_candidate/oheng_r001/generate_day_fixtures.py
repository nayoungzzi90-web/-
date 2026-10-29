#!/usr/bin/env python3
"""Independent sexagenary-day fixtures via korean-lunar-calendar (calendar package).
Do not confuse its lunar month/year strings with the solar-term year/month rules.
"""
from korean_lunar_calendar import KoreanLunarCalendar
from pathlib import Path
import json,re
c=KoreanLunarCalendar(); rows=[]
for y in range(1900,2050):
  for m in range(1,13):
    for d in [1,7,15,28]:
      try:
        if c.setSolarDate(y,m,d):
          day=re.search(r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日',c.getChineseGapJaString()).group(1)
          rows.append([f'{y:04d}-{m:02d}-{d:02d}',day])
      except Exception:
        pass
p=Path(__file__).parent/'day_reference_1900_2049.json'
p.write_text(json.dumps({'source':'korean-lunar-calendar independent cross-reference; Gregorian day ganji only','samples':rows},ensure_ascii=False,separators=(',',':'))+'\n')
print('fixtures',len(rows))
