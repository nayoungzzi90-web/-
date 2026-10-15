"""
엔진과 독립적인 기준값 고정(fixture) 생성기.
  - 4주: sxtwl(BSD) 와 lunar_python(MIT) 이 모두 같은 값을 낸 경우만 채택
  - 음력: korean_lunar_calendar(MIT, KASI 자료 기반 1000–2050)
  - 대운: lunar_python(MIT) sect=2 (분 단위 3일=1년)
출처 버전을 JSON 에 함께 기록한다.  사용: python make-fixtures.py <출력.json>
"""
import json, sys, datetime as dt, importlib.metadata as md
import sxtwl
from lunar_python import Solar
from korean_lunar_calendar import KoreanLunarCalendar

Gan = '甲乙丙丁戊己庚辛壬癸'; Zhi = '子丑寅卯辰巳午未申酉戌亥'
def sx(y, m, d, h):
    day = sxtwl.fromSolar(y, m, d)
    g = lambda x: Gan[x.tg] + Zhi[x.dz]
    return {'year': g(day.getYearGZ()), 'month': g(day.getMonthGZ()), 'day': g(day.getDayGZ()), 'hour': g(sxtwl.getShiGz(day.getDayGZ().tg, h))}
def lp(y, m, d, h, mi):
    ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar()
    return {'year': ec.getYear(), 'month': ec.getMonth(), 'day': ec.getDay(), 'hour': ec.getTime()}

# (날짜, 시, 분, 설명): 모두 절입에서 36시간 이상 떨어진 날을 골랐다
CASES = [
    (1990, 4, 19, 1, 10, '시험 입력 (보정 없음)'),
    (2000, 1, 7, 12, 0, '2000-01-07 은 甲子일'), (1999, 12, 31, 23, 30, '자시 야자시 구간'), (2000, 1, 1, 0, 0, '자정'),
    (2024, 7, 15, 22, 59, '22:59'), (2024, 7, 15, 23, 0, '23:00'), (2024, 7, 15, 23, 59, '23:59'), (2024, 7, 16, 0, 0, '00:00'),
    (2024, 7, 16, 0, 59, '00:59'), (2024, 7, 16, 1, 0, '01:00 丑시 시작'), (2024, 7, 16, 2, 59, '02:59'), (2024, 7, 16, 3, 0, '03:00 寅시'),
    (1900, 1, 1, 12, 0, '지원 범위 시작'), (2100, 12, 31, 12, 0, '지원 범위 끝'), (1984, 7, 1, 8, 30, '甲子년'),
    (1912, 6, 15, 6, 0, '+9 시대 시작 직후'), (1955, 7, 7, 14, 20, '서머타임 기간'), (1987, 8, 20, 15, 45, '서머타임 기간'), (1961, 9, 1, 9, 9, '표준시 +9 복귀 직후'),
    (1996, 2, 29, 10, 10, '윤일'), (2020, 5, 23, 18, 0, '윤4월 1일'), (1975, 11, 11, 4, 4, ''), (2008, 8, 8, 20, 8, ''),
]
import random
random.seed(20261015)
for _ in range(60):
    y = random.randint(1901, 2099); m = random.randint(1, 12); d = random.randint(1, 28)
    CASES.append((y, m, d, random.randint(0, 23), random.randint(0, 59), 'random'))
pillars = []
for y, m, d, h, mi, note in CASES:
    a, b = sx(y, m, d, h), lp(y, m, d, h, mi)
    agree = all(a[k] == b[k] for k in ('year', 'month', 'day', 'hour'))
    pillars.append({'date': [y, m, d, h, mi], 'note': note, 'ref': a, 'agree': agree})

# 음력 윤달: 1900–2050 전수
c = KoreanLunarCalendar(); leaps = []; prev = None
cur = dt.date(1900, 1, 1)
while cur <= dt.date(2050, 12, 31):
    c.setSolarDate(cur.year, cur.month, cur.day)
    key = (c.lunarYear, c.lunarMonth, c.isIntercalation)
    if c.isIntercalation and key != prev: leaps.append({'lunarYear': c.lunarYear, 'month': c.lunarMonth, 'solarStart': [cur.year, cur.month, cur.day]})
    prev = key; cur += dt.timedelta(days=1)

# 음력→양력 표본
lunar = []
for _ in range(300):
    y = random.randint(1901, 2049); m = random.randint(1, 12); d = random.randint(1, 29)
    c2 = KoreanLunarCalendar()
    if c2.setLunarDate(y, m, d, False): lunar.append({'lunar': [y, m, d, False], 'solar': [c2.solarYear, c2.solarMonth, c2.solarDay]})

# 대운 (sect 2). 한국 시계 → 베이징 시계(-1h)
luck = []
for _ in range(60):
    y = random.randint(1962, 2020); m = random.randint(1, 12); d = random.randint(1, 28); h = random.randint(0, 22); mi = random.randint(0, 59); g = random.choice(['M', 'F'])
    if y in (1987, 1988): continue
    t = dt.datetime(y, m, d, h, mi) - dt.timedelta(hours=1)
    ec = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar()
    yun = ec.getYun(1 if g == 'M' else 0, 2)
    luck.append({'date': [y, m, d, h, mi], 'gender': g, 'forward': yun.isForward(), 'start': [yun.getStartYear(), yun.getStartMonth(), yun.getStartDay()], 'pillars': [x.getGanZhi() for x in yun.getDaYun()[1:6]]})

out = {'generated_with': {k: md.version(k) for k in ('sxtwl', 'lunar_python', 'korean_lunar_calendar')}, 'pillars': pillars, 'leapMonths1900_2050': leaps, 'lunarToSolar': lunar, 'luck': luck}
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
print('pillar cases', len(pillars), 'agreeing', sum(p['agree'] for p in pillars), 'leaps', len(leaps), 'lunar', len(lunar), 'luck', len(luck))
