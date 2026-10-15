"""우리 대운(순역·기산·간지) ↔ lunar_python(MIT) 대조. sect=2(분 단위) 는 EXACT(연 360일) 와, sect=1(시진 단위) 은 SHICHEN 과 비교.
입력은 한국 시계(UTC+9)이므로 lunar_python(베이징시)에는 1시간 뺀 시각을 넣는다. 절입 ±36시간 안은 제외."""
import json, sys, datetime as dt, collections
from lunar_python import Solar
rows = json.load(open(sys.argv[1]))
cnt = collections.Counter(); bad = collections.defaultdict(list)
for y, m, d, h, mi, g, direction, ey, em, ed, sy, sm, sd, pil, near in rows:
    if near < 36: continue
    t = dt.datetime(y, m, d, h, mi) - dt.timedelta(hours=1)
    ec = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar()
    gender = 1 if g == 'M' else 0
    y2 = ec.getYun(gender, 2); y1 = ec.getYun(gender, 1)
    fwd = 'FORWARD' if y2.isForward() else 'BACKWARD'
    cnt['dir'] += 1
    if fwd != direction: bad['dir'].append((y, m, d, h, mi, g, direction, fwd))
    cnt['pillars'] += 1
    ref_p = [x.getGanZhi() for x in y2.getDaYun()[1:4]]
    if ref_p != pil: bad['pillars'].append((y, m, d, h, mi, g, pil, ref_p))
    # sect2 ↔ EXACT(360)
    cnt['exact'] += 1
    a = ey + em / 12 + ed / 360; b = y2.getStartYear() + y2.getStartMonth() / 12 + y2.getStartDay() / 360
    if abs(a - b) > 0.004: bad['exact'].append((y, m, d, h, mi, g, (ey, em, ed), (y2.getStartYear(), y2.getStartMonth(), y2.getStartDay())))
    anchor_hour = (ec.getLunar().getNextJie() if fwd == 'FORWARD' else ec.getLunar().getPrevJie()).getSolar().getHour()
    # lunar_python 은 23시를 하루의 마지막(11번) 시진으로 세고, 우리는 子시(0번)로 세므로 그 경우만 제외
    if t.hour != 23 and anchor_hour != 23:
        cnt['shichen'] += 1
        a = (sy, sm, sd); b = (y1.getStartYear(), y1.getStartMonth(), y1.getStartDay())
        if a != b: bad['shichen'].append((y, m, d, h, mi, g, a, b))
print('compared:', dict(cnt)); print('mismatches:', {k: len(v) for k, v in bad.items()})
for k, v in bad.items():
    for x in v[:6]: print(k, x)
