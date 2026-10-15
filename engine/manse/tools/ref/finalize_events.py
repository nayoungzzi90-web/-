"""
de421_events.json (TT) → 서비스용 데이터 + 교차검증 통계.
  - TT→UTC: 1972 이후 윤초 표(skyfield 내장), 1972 이전은 UTC≈UT1=TT-ΔT(skyfield 내장 ΔT 표)
  - 교차검증 A: Swiss Ephemeris 의 Moshier 모드(pyswisseph, AGPL — 검증에만 사용·배포하지 않음)
  - 교차검증 B: astronomy-engine(npm) 결과(--ae 파일, TT 기준)
  산출: data/solar_terms.json, data/new_moons.json, data/verification_summary.json

사용: <venv>/bin/python tools/ref/finalize_events.py build/de421_events.json build/ae_terms.json data
"""
import json, math, sys, datetime as dt
import numpy as np
import swisseph as swe
from skyfield.api import load

ts = load.timescale(builtin=True)
TERMS = [('소한', 285), ('대한', 300), ('입춘', 315), ('우수', 330), ('경칩', 345), ('춘분', 0), ('청명', 15), ('곡우', 30), ('입하', 45), ('소만', 60), ('망종', 75), ('하지', 90), ('소서', 105), ('대서', 120), ('입추', 135), ('처서', 150), ('백로', 165), ('추분', 180), ('한로', 195), ('상강', 210), ('입동', 225), ('소설', 240), ('대설', 255), ('동지', 270)]
NAME = {lon: n for n, lon in TERMS}
JD_1972 = 2441317.5
EPOCH_JD = 2440587.5


def tt_to_utc_ms(jd_tt):
    t = ts.tt_jd(jd_tt)
    if jd_tt < JD_1972 + 0.001:
        utc_jd = jd_tt - float(t.delta_t) / 86400.0
    else:
        y, mo, d, h, mi, s = [float(x) for x in t.utc]
        utc_jd = None
        base = dt.datetime(int(y), int(mo), int(d), int(h), int(mi), 0, tzinfo=dt.timezone.utc)
        return int(round((base.timestamp() + s) * 1000)), float(t.delta_t)
    return int(round((utc_jd - EPOCH_JD) * 86400000)), float(t.delta_t)


def sw_lon(jd_tt):
    return swe.calc(jd_tt, swe.SUN, swe.FLG_MOSEPH)[0][0]


def solve(f, jd, target):
    for _ in range(10):
        jd -= (((f(jd) - target + 180) % 360) - 180) / 0.98565
    return jd


def main(de_path, ae_path, out_dir):
    de = json.load(open(de_path)); ae = json.load(open(ae_path))
    ae_tt = {(y, int(l)): tt for y, l, _iso, _ut, tt in ae}
    rows = []; d_sw = []; d_ae = []
    for t in de['terms']:
        y, lon, jd = t['year'], t['lon'], t['tt_jd']
        ms, dtt = tt_to_utc_ms(jd)
        sw = (solve(sw_lon, jd, lon) - jd) * 86400
        a = None
        if (y, lon) in ae_tt:
            a = (2451545.0 + ae_tt[(y, lon)] - jd) * 86400
        rows.append({'year': y, 'lon': lon, 'name': NAME[lon], 'utc_ms': ms, 'tt_jd': round(jd, 9), 'delta_t_s': round(dtt, 3), 'x_swe_s': round(sw, 2), 'x_ae_s': None if a is None else round(a, 1)})
        d_sw.append(abs(sw))
        if a is not None: d_ae.append(abs(a))
    # 합삭
    moons = []
    for jd in de['new_moons_tt_jd']:
        ms, _ = tt_to_utc_ms(jd); moons.append(ms)
    # DE421 계수 시작(1899-12-04) 직전 합삭은 astronomy-engine 값으로 보충한다 (분 단위 오차 가능, 역일 판정에는 충분한 여유가 있음을 확인)
    extra = json.load(open(f'{out_dir}/extra_new_moons.json'))
    sources = ['astronomy-engine'] * len(extra['utc_ms']) + ['de421'] * len(moons)
    moons = extra['utc_ms'] + moons
    import os
    os.makedirs(out_dir, exist_ok=True)
    json.dump({'source': de['engine'], 'jd_range': de['jd_range'], 'rows': rows}, open(f'{out_dir}/solar_terms.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    json.dump({'source': de['engine'], 'utc_ms': moons, 'sources': sources}, open(f'{out_dir}/new_moons.json', 'w'), separators=(',', ':'))
    def stat(x): x = np.array(x); return {'n': len(x), 'max_s': round(float(x.max()), 2), 'p99_s': round(float(np.percentile(x, 99)), 2), 'mean_s': round(float(x.mean()), 3)}
    def by(lo, hi, key):
        return stat([abs(r[key]) for r in rows if lo <= r['year'] <= hi and r[key] is not None])
    summary = {
        'reference': de['engine'], 'reference_jd_range': de['jd_range'],
        'swisseph_moshier_vs_de421': {'1900-2050': by(1900, 2050, 'x_swe_s'), '2051-2100': by(2051, 2100, 'x_swe_s')},
        'astronomy_engine_vs_de421': {'1900-2050': by(1900, 2050, 'x_ae_s'), '2051-2100': by(2051, 2100, 'x_ae_s')},
    }
    json.dump(summary, open(f'{out_dir}/verification_summary.json', 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(summary, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main(*sys.argv[1:4])
