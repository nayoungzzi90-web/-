#!/usr/bin/env python3
"""Build solar term *calculation* dataset via Swiss Ephemeris/Moshier.
Requires pyswisseph. Independent KASI 2026 reference is kept in tests, not synthesized.
The generated data is not a KASI product and no wholesale KASI verification is claimed.
"""
import json, datetime, swisseph as swe
from pathlib import Path
NAMES=['소한','대한','입춘','우수','경칩','춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지']
ANGLES=[285,300,315,330,345,0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270]
SEEDS=[(1,3),(1,18),(2,1),(2,16),(3,3),(3,17),(4,2),(4,17),(5,3),(5,18),(6,4),(6,19),(7,5),(7,21),(8,5),(8,21),(9,5),(9,21),(10,7),(10,21),(11,5),(11,20),(12,5),(12,20)]
assert len(SEEDS)==24
result={}
for year in range(1899,2102):
    instants=[]
    for (month,day),lng,name in zip(SEEDS,ANGLES,NAMES):
        jd=swe.solcross_ut(float(lng),swe.julday(year,month,day,0.0,swe.GREG_CAL),swe.FLG_MOSEPH)
        ms=round((jd-2440587.5)*86400000)
        dt=datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc)
        if dt.year!=year or dt.month!=month:
            raise RuntimeError(f'unexpected event {year} {name}: {dt.isoformat()}')
        instants.append(ms)
    assert all(instants[i]<instants[i+1] for i in range(23))
    result[str(year)]=instants
base=Path(__file__).parent
(base/'solar_terms_1899_2101.json').write_text(json.dumps({'dataVersion':'OHENG-TERMS-MOSHIER-1','method':'Swiss Ephemeris pyswisseph 2.10.03 solcross_ut FLG_MOSEPH; apparent geocentric tropical solar ecliptic longitude','calendar':'proleptic Gregorian','time':'UTC Unix epoch milliseconds','startYear':1899,'endYear':2101,'termNames':NAMES,'angles':ANGLES,'rows':result},ensure_ascii=False,separators=(',',':'))+'\n')
print('generated',len(result)*24,'terms')
for i in [0,2,4,23]:
    ms=result['2026'][i]
    print('2026',NAMES[i],datetime.datetime.fromtimestamp(ms/1000,datetime.timezone(datetime.timedelta(hours=9))).isoformat())
