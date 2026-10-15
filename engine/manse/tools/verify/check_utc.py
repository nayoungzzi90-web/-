"""절입 UTC 시각(데이터 파일) ↔ Swiss Ephemeris(Moshier) 로 독립 재계산한 UTC 시각. 시간 척도(ΔT·윤초) 변환 오류를 잡는 검사.
swisseph 의 UTC 변환은 윤초표, 1972 이전은 UT1 기준(ΔT)이다."""
import json, sys, datetime as dt
import numpy as np, swisseph as swe
rows = json.load(open(sys.argv[1]))['rows']
def lon_et(jd): return swe.calc(jd, swe.SUN, swe.FLG_MOSEPH)[0][0]
def solve(jd, target):
    for _ in range(10): jd -= (((lon_et(jd) - target + 180) % 360) - 180) / 0.98565
    return jd
res = {'pre1972': [], '1972-2026': [], '2027+': []}
for r in rows:
    mine_jd = 2440587.5 + r['utc_ms'] / 86400000
    # 대략 ET 추정(ΔT≈ swe.deltat) 후 정련
    jd_et = solve(mine_jd + swe.deltat(mine_jd), r['lon'])
    y, mo, d, h, mi, s = swe.jdet_to_utc(jd_et, swe.GREG_CAL)
    ms = dt.datetime(y, mo, d, h, mi, 0, tzinfo=dt.timezone.utc).timestamp() * 1000 + s * 1000
    diff = (r['utc_ms'] - ms) / 1000
    k = 'pre1972' if r['year'] < 1972 else '1972-2026' if r['year'] <= 2026 else '2027+'
    res[k].append(diff)
for k, v in res.items():
    v = np.array(v); print(f'{k:10s} n={len(v):5d}  max|Δ|={np.abs(v).max():.2f}s  mean={v.mean():+.2f}s')
