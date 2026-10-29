#!/usr/bin/env python3
"""Offline-only verification: Swiss Ephemeris Moshier vs public KASI minute reference.
Do not import this into the production Lovable website. Excludes JPL DE440s.
Reproducible with pyswisseph 2.10.03 and Python 3.13. Licenses must be reviewed.
"""
import csv, json, hashlib, statistics
from datetime import datetime,timedelta,timezone
from pathlib import Path
import swisseph as swe
BASE=Path(__file__).resolve().parent
SRC=BASE/'kasi_reference_minutes_2025_2027.json'
REF=BASE/'solar_terms_swiss_1900_2027.json'
KST=timezone(timedelta(hours=9))
KASI=json.loads(SRC.read_text())
SWISS=json.loads(REF.read_text())
NAMES=['소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설']
KASI_INDEX=[0,2,4,6,8,10,12,14,16,18,20,22]
records=[]
for y, arr in KASI['rows'].items():
    for idx, (name, minute) in enumerate(zip(NAMES, (arr[i] for i in KASI_INDEX))):
        local=datetime.strptime(y+'-'+minute,'%Y-%m-%d %H:%M').replace(tzinfo=KST)
        if name=='소한':
            msec=SWISS[str(int(y)-1)][11]
        else:
            msec=SWISS[y][idx-1]
        swiss_utc=datetime.fromtimestamp(msec/1000,timezone.utc)
        diff=(swiss_utc-local.astimezone(timezone.utc)).total_seconds()
        records.append({'year':y,'name':name,'kasi_kst_minute':local.strftime('%Y-%m-%d %H:%M'),'swiss_kst':swiss_utc.astimezone(KST).isoformat(timespec='milliseconds'),'signed_error_seconds':round(diff,3),'abs_error_seconds':round(abs(diff),3)})
with (BASE/'kasi_vs_swiss_36_jeol.csv').open('w',newline='',encoding='utf-8-sig') as fp:
    wr=csv.DictWriter(fp,fieldnames=list(records[0]));wr.writeheader();wr.writerows(records)
errs=sorted(r['abs_error_seconds'] for r in records)
summary={
 'auditDate':'2026-10-16', 'sourceReference':'KASI reference minute resolution, annual calendarData 2025..2027 (not the legally promulgated almanac)',
 'independentMethod':'Swiss Ephemeris 2.10.03 Moshier built-in analytic ephemeris, solcross_ut geocentric apparent tropical solar longitude',
 'runtimeIntegration':'never use Swiss Ephemeris in the commercial runtime without legal/license review',
 'kasiCrosscheck':{'n':len(records),'maxAbsSeconds':max(errs),'medianAbsSeconds':statistics.median(errs),'within60Seconds':sum(x<60 for x in errs),'worst':sorted(records,key=lambda v:v['abs_error_seconds'],reverse=True)[:6]},
 'fixtureCoverage':{'years':len(SWISS),'yearFrom':1900,'yearTo':2027,'monthBoundaries':sum(len(a) for a in SWISS.values()),'order':'立春,驚蟄,...,大雪,次年小寒','referenceFileSha256':hashlib.sha256(REF.read_bytes()).hexdigest()},
 'limitations':['Swiss Moshier independent of astronomy-engine but not NASA JPL DE440s','1900..2027 values have not all been verified against KASI official releases','KASI minute reference cannot certify a second-level precision','Differences near 23:00 day-pillar boundary and historical IANA rules need end-to-end validation'],
 'releaseStatus':'NO-GO until browser and real-user route E2E and high-precision independent validation pass'
}
(BASE/'audit_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
