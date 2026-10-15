"""우리 4주 ↔ sxtwl(寿星万年历, BSD) 대조. 연·월주는 절입 ±36시간 안은 제외(sxtwl 은 입력을 베이징시로 해석하므로 경계 부근이 달라질 수 있음)."""
import json, sys, collections
import sxtwl
Gan = '甲乙丙丁戊己庚辛壬癸'; Zhi = '子丑寅卯辰巳午未申酉戌亥'
rows = json.load(open(sys.argv[1]))
cnt = collections.Counter(); bad = collections.defaultdict(list)
for y, m, d, h, mi, yg, mg, dg, hg, near_h in rows:
    day = sxtwl.fromSolar(y, m, d)
    ref = {
        'year': Gan[day.getYearGZ().tg] + Zhi[day.getYearGZ().dz],
        'month': Gan[day.getMonthGZ().tg] + Zhi[day.getMonthGZ().dz],
        'day': Gan[day.getDayGZ().tg] + Zhi[day.getDayGZ().dz],
        'hour': (lambda g: Gan[g.tg] + Zhi[g.dz])(sxtwl.getShiGz(day.getDayGZ().tg, h)),
    }
    mine = {'year': yg, 'month': mg, 'day': dg, 'hour': hg}
    for k in ('day', 'hour'):
        cnt[k] += 1
        if ref[k] != mine[k]: bad[k].append((y, m, d, h, mi, mine[k], ref[k]))
    if near_h > 36:
        for k in ('year', 'month'):
            cnt[k] += 1
            if ref[k] != mine[k]: bad[k].append((y, m, d, h, mi, mine[k], ref[k]))
print('compared:', dict(cnt)); print('mismatches:', {k: len(v) for k, v in bad.items()})
for k, v in bad.items():
    for x in v[:8]: print(k, x)
