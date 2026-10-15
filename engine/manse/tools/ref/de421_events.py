"""
기준 천문 사건 생성기 (오프라인 도구, 서비스 런타임에는 포함되지 않음)

JPL DE421 (jplephem 2.6 + de421 패키지의 Chebyshev 계수)로 다음을 계산한다.
  1) 태양 겉보기 황경(날짜 기준 진황도)이 15°의 배수가 되는 시각 = 24절기 (TT)
  2) 달-태양 겉보기 황경이 같아지는 시각 = 합삭(朔) (TT)

보정: 광시간(반복), 상대론적 광행차(지구 속도), IAU2006 세차, IAU2000B 장동(Δψ).
외부 AI·상용 천문 라이브러리를 쓰지 않는다. 결과는 JD(TT) 로 build/de421_events.json 에 저장.

사용: <venv-old>/bin/python tools/ref/de421_events.py build/de421_events.json
"""
import json, math, sys
import numpy as np
import de421
from jplephem import Ephemeris
from skyfield import precessionlib, nutationlib
from skyfield.constants import ASEC2RAD

E = Ephemeris(de421)
EMRAT = E.EMRAT
C = 299792.458  # km/s
K = 1.0 / (1.0 + EMRAT)


class _T:  # skyfield 시간 객체의 최소 대역(TT=TDB 로 취급, 차이 < 2ms)
    def __init__(self, tt):
        self.tt = tt; self.tdb = tt; self.whole = tt; self.shape = ()


def earth(jd):
    em, emv = E.position_and_velocity('earthmoon', jd)
    mo, mov = E.position_and_velocity('moon', jd)
    return (em - mo * K).ravel(), (emv - mov * K).ravel()  # km, km/day


def moon_geo(jd):
    return E.position('moon', jd).ravel()


def sun_bary(jd):
    return E.position('sun', jd).ravel()


def _aberrate(v, ev):
    u = v / np.linalg.norm(v)
    beta = ev / 86400.0 / C
    b2 = float(np.dot(beta, beta)); gi = math.sqrt(1 - b2); q = float(np.dot(u, beta))
    p = (u * gi + beta * (1 + q / (1 + gi))) / (1 + q)
    return p


def _ecliptic_lon(p, jd):
    P = precessionlib.compute_precession(jd)
    dpsi, _ = nutationlib.iau2000b_radians(_T(jd))
    mean_ob = nutationlib.mean_obliquity(jd) * ASEC2RAD
    x, y, z = P.dot(p)
    ye = y * math.cos(mean_ob) + z * math.sin(mean_ob)
    return (math.degrees(math.atan2(ye, x)) + math.degrees(dpsi)) % 360.0


def _astrometric(jd, target):
    """target: 'sun' | 'moon' — 광시간을 반영한 지심 방향 벡터(km)."""
    ep, ev = earth(jd)
    lt = 0.0
    for _ in range(4):
        tj = jd - lt
        if target == 'sun':
            v = sun_bary(tj) - ep
        else:
            e_emit, _ = earth(tj)
            v = (e_emit + moon_geo(tj)) - ep
        lt = np.linalg.norm(v) / C / 86400.0
    return v, ev


def sun_lon(jd):
    v, ev = _astrometric(jd, 'sun')
    return _ecliptic_lon(_aberrate(v, ev), jd)


def moon_lon(jd):
    v, ev = _astrometric(jd, 'moon')
    return _ecliptic_lon(_aberrate(v, ev), jd)


def wrap(d):
    return ((d + 180.0) % 360.0) - 180.0


def solve(f, jd, target, rate, iters=10):
    for _ in range(iters):
        d = wrap(f(jd) - target)
        jd -= d / rate
        if abs(d) < 1e-9:
            break
    return jd


def term_guess(year, lon):
    # 춘분(3/20.5) 기준 근사. 오차 수 일 이내라 뉴턴법이 수렴한다.
    off = -(360 - lon) * 1.0146 if lon >= 285 else lon * 1.0146
    return 2440587.5 + (np.datetime64(f'{year}-03-20T12:00').astype('datetime64[s]').astype(np.int64)) / 86400.0 + off + 0.0 - 0.0007


def main(out):
    terms = []
    for y in range(1899, 2102):
        for k in range(24):
            lon = (285 + 15 * k) % 360
            g = term_guess(y, lon)
            try:
                jd = solve(sun_lon, g, lon, 0.98565)
            except Exception:
                continue  # DE421 계수 범위 밖 (jplephem DateError)
            if jd < E.jalpha + 0.5 or jd > E.jomega - 0.5 or abs(jd - g) > 6:
                continue
            terms.append({'year': y, 'lon': lon, 'tt_jd': jd})
    # 합삭: 1899-12-01 ~ 2102-02 사이. 평균 삭망월 29.530588일 간격으로 후보를 만들고 뉴턴법으로 정련.
    moons = []
    jd0 = E.jalpha + 3
    # 알려진 기준 삭: 2000-01-06 18:14 UTC ≈ JD 2451550.26 (초기 추정용일 뿐, 결과는 모두 DE421 로 재계산)
    ref = 2451550.26
    n_start = int((jd0 - ref) / 29.530588) - 1
    n_end = int((min(2488435.0, E.jomega - 3) - ref) / 29.530588) + 1
    for n in range(n_start, n_end + 1):
        g = ref + n * 29.530588
        def elong(j): return wrap(moon_lon(j) - sun_lon(j))
        jd = g
        try:
            for _ in range(12):
                d = elong(jd); jd -= d / 12.19
                if abs(d) < 1e-9: break
        except Exception:
            continue
        if E.jalpha + 0.5 < jd < E.jomega - 0.5 and abs(jd - g) < 2:
            moons.append(jd)
    json.dump({'engine': 'jplephem 2.6 + de421 2008.1 (own reduction)', 'jd_range': [E.jalpha, E.jomega], 'terms': terms, 'new_moons_tt_jd': moons}, open(out, 'w'))
    print('terms', len(terms), 'new moons', len(moons))


if __name__ == '__main__':
    main(sys.argv[1])
