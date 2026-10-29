'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs');
const {calculateR001,calculateDay,calculateHour,civilToUtc,parseLocal,ganji,STEMS,BRANCHES,validateTerms}=require('./dist/oheng_r001.js');
const terms=JSON.parse(fs.readFileSync('./solar_terms_1899_2101.json','utf8'));
let passed=0;
const check=(name,f)=>{try{f();passed++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
const birth=(wall,extra={})=>calculateR001({local:wall,zone:'Asia/Seoul',...extra},terms);
const exactKasi2026=[
 ['소한','01-05T17:23'],['대한','01-20T10:45'],['입춘','02-04T05:02'],['우수','02-19T00:52'],
 ['경칩','03-05T22:59'],['춘분','03-20T23:46'],['청명','04-05T03:40'],['곡우','04-20T10:39'],
 ['입하','05-05T20:49'],['소만','05-21T09:37'],['망종','06-06T00:48'],['하지','06-21T17:25'],
 ['소서','07-07T10:57'],['대서','07-23T04:13'],['입추','08-07T20:43'],['처서','08-23T11:19'],
 ['백로','09-07T23:41'],['추분','09-23T09:05'],['한로','10-08T15:29'],['상강','10-23T18:38'],
 ['입동','11-07T18:52'],['소설','11-22T16:23'],['대설','12-07T11:53'],['동지','12-22T05:50']
];
check('terms data 203 years x 24 terms integrity',()=>{validateTerms(terms); assert.equal(Object.keys(terms.rows).length,203)});
check('2026 24 terms versus independent KASI KST minute table',()=>{
 const data=terms.rows['2026'];
 for(let i=0;i<24;i++){
  const [name,local]=exactKasi2026[i]; assert.equal(terms.termNames[i],name);
  const ref=Date.parse('2026-'+local+':00+09:00');
  const deltaMs=Math.abs(data[i]-ref);
  assert(deltaMs<60000,`${name}: delta=${deltaMs/1000}s`);
 }
});
check('sexagenary sequence day 2000-01-07 甲子 and 2000-01-01 戊午',()=>{
 assert.equal(calculateDay(parseLocal('2000-01-07T12:00')).text,'甲子');
 assert.equal(calculateDay(parseLocal('2000-01-01T12:00')).text,'戊午');
 for(let i=0;i<60;i++){const dt=new Date(Date.UTC(2000,0,7+i)); const r=calculateDay(parseLocal(dt.toISOString().slice(0,10)+'T12:00'));assert.equal(r.index,i);}
});
check('canonical 2000-01-07 year month day 己卯 丁丑 甲子',()=>{
 const p=birth('2000-01-07T12:00').pillars;assert.deepEqual([p.year.text,p.month.text,p.day.text],['己卯','丁丑','甲子']);
});
check('2026 입춘 boundary before/during/after second 甲? correct solar year',()=>{
 const ms=terms.rows['2026'][2];
 const kst=(epoch)=>new Date(epoch+9*3600000).toISOString().slice(0,23);
 const prev=birth(kst(ms-1000)).pillars,at=birth(kst(ms)).pillars,next=birth(kst(ms+1000)).pillars;
 assert.equal(prev.year.text,'乙巳');assert.equal(prev.month.text,'己丑');
 assert.equal(at.year.text,'丙午');assert.equal(at.month.text,'庚寅');
 assert.equal(next.year.text,'丙午');assert.equal(next.month.text,'庚寅');
});
check('boundary at another Jie before exact change of month only',()=>{
 const ms=terms.rows['2026'][4];
 const kst=(ep)=>new Date(ep+9*3600000).toISOString().slice(0,23);
 assert.equal(birth(kst(ms-1000)).pillars.month.text,'庚寅');
 assert.equal(birth(kst(ms)).pillars.month.text,'辛卯');
 assert.equal(birth(kst(ms)).pillars.year.text,'丙午');
});
check('zhongqi 雨水 does not change month',()=>{
 const ms=terms.rows['2026'][3];
 const kst=(ep)=>new Date(ep+9*3600000).toISOString().slice(0,23);
 assert.equal(birth(kst(ms-1000)).pillars.month.text,birth(kst(ms+1000)).pillars.month.text);
});
check('all 60 sexagenary indices internally consistent',()=>{
 for(let i=0;i<60;i++){const p=ganji(i);assert.equal(p.stem,STEMS[i%10]);assert.equal(p.branch,BRANCHES[i%12]);}
});
check('12 hour branches from civil local hours',()=>{
 for(let h=0;h<24;h++){
  const r=birth(`2000-01-07T${String(h).padStart(2,'0')}:30`).pillars.hour;
  assert.equal(r.branch,BRANCHES[Math.floor((h+1)/2)%12]);
  assert.equal(r.index%10,STEMS.indexOf(r.stem));assert.equal(r.index%12,BRANCHES.indexOf(r.branch));
 }
});
check('甲子 day 子 hour = 甲子, 丑 hour = 乙丑',()=>{
 assert.equal(birth('2000-01-07T00:30').pillars.hour.text,'甲子');
 assert.equal(birth('2000-01-07T01:30').pillars.hour.text,'乙丑');
});
check('late-zi day and hour shift only when explicit',()=>{
 assert.equal(birth('2000-01-07T23:30').pillars.day.text,'甲子');
 assert.equal(birth('2000-01-07T23:30',{dayRollover:'late_zi_next_day'}).pillars.day.text,'乙丑');
 assert.equal(birth('2000-01-07T23:30',{dayRollover:'late_zi_next_day'}).pillars.hour.text,'丙子');
});
check('DST gap 1988-05-08 02:30 invalid',()=>{
 assert.throws(()=>birth('1988-05-08T02:30'),x=>x.code==='NONEXISTENT_LOCAL_TIME');
});
check('DST fold 1988-10-09 02:30 requests disambiguation',()=>{
 assert.throws(()=>birth('1988-10-09T02:30'),x=>x.code==='AMBIGUOUS_LOCAL_TIME');
 const earlier=birth('1988-10-09T02:30',{ambiguous:'earlier'});
 const later=birth('1988-10-09T02:30',{ambiguous:'later'});
 assert.equal(Date.parse(later.utc)-Date.parse(earlier.utc),3600000);
});
check('1954 legal +08:30; 1955 DST +09:30; 1988 DST +10',()=>{
 for(const [local,expected] of [['1954-04-01T12:00',8.5],['1955-06-01T12:00',9.5],['1988-07-01T12:00',10]]){
   assert.equal(birth(local).offsetSeconds,expected*3600,local);
 }
});
check('year boundary December and January cross not using Gregorian Jan 1',()=>{
 assert.equal(birth('2000-01-01T12:00').pillars.year.text,'己卯');
 assert.equal(birth('2000-01-01T12:00').pillars.month.text,'丙子');
});
check('no Gregorian date overflow; only Gregorian year supported',()=>{
 for(const local of ['2000-02-30T10:00','2001-13-01T00:00','2001-02-29T12:00'])assert.throws(()=>birth(local));
 assert.throws(()=>birth('1899-12-31T10:00'),x=>x.code==='OUT_OF_RANGE');
});
check('review flags: 1955 historical; exact 2026 boundary near',()=>{
 assert.equal(birth('1955-06-01T12:00').diagnostics.historicalTimeZoneReview,true);
 const kst=new Date(terms.rows['2026'][2]+9*3600000).toISOString().slice(0,23);
 assert.equal(birth(kst).diagnostics.nearTermBoundary,true);
 assert.equal(birth('2026-04-20T12:00').diagnostics.independentlyCertified,false);
});

check('independent ganji-day cross-check 1900-2049 via korean-lunar-calendar',()=>{
 const samples=JSON.parse(fs.readFileSync('./day_reference_1900_2049.json','utf8')).samples;
 let mismatches=[];
 for(const [date,ganji] of samples){const got=calculateDay(parseLocal(date+'T12:00')).text;if(got!==ganji)mismatches.push(`${date} ${got} != ${ganji}`)}
 assert.deepEqual(mismatches,[]);assert(samples.length>7000);
});
check('official KASI 2026 12 lunar-month first-day day-ganzhi anchors',()=>{
 for(const [d,ganji] of [
 ['2026-02-17','壬戌'],['2026-03-19','壬辰'],['2026-04-17','辛酉'],['2026-05-17','辛卯'],
 ['2026-06-15','庚申'],['2026-07-14','己丑'],['2026-08-13','己未'],['2026-09-11','戊子'],
 ['2026-10-11','戊午'],['2026-11-09','丁亥'],['2026-12-09','丁巳'],['2027-01-08','丁亥']]){
  assert.equal(calculateDay(parseLocal(d+'T12:00')).text,ganji,d);
 }
});


check('independent KASI 2025-2027: 72 solar terms within minute precision',()=>{
 const refs=JSON.parse(fs.readFileSync('./kasi_reference_minutes_2025_2027.json','utf8')).rows;
 for(const [year,dates] of Object.entries(refs)){
  const computed=terms.rows[year];assert.equal(dates.length,24);
  for(let i=0;i<24;i++){
   const ref=Date.parse(`${year}-${dates[i].replace(' ','T')}:00+09:00`);
   const seconds=Math.abs(computed[i]-ref)/1000;
   assert(seconds<60,`${year} ${terms.termNames[i]} discrepancy: ${seconds.toFixed(2)}s`);
  }
 }
});


check('all 2025-2027 36 Jie boundaries exactly step years/months',()=>{
 const indices=[0,2,4,6,8,10,12,14,16,18,20,22];
 const kst=(ms)=>new Date(ms+9*3600000).toISOString().slice(0,23);
 for(const y of ['2025','2026','2027']){
  for(const idx of indices){
   const at=terms.rows[y][idx];
   const before=birth(kst(at-1000)),exact=birth(kst(at)),after=birth(kst(at+1000));
   assert.notEqual(before.pillars.month.text,exact.pillars.month.text,`${y} ${terms.termNames[idx]}`);
   assert.equal(exact.pillars.month.text,after.pillars.month.text,`${y} ${terms.termNames[idx]}`);
   if(idx===2) assert.notEqual(before.pillars.year.text,exact.pillars.year.text);
   else assert.equal(before.pillars.year.text,exact.pillars.year.text);
  }
 }
});
check('all 2025-2027 36 Zhongqi boundaries do NOT change years/months',()=>{
 const kst=(ms)=>new Date(ms+9*3600000).toISOString().slice(0,23);
 for(const y of ['2025','2026','2027'])for(let idx=1;idx<24;idx+=2){
  const at=terms.rows[y][idx],before=birth(kst(at-1000)),after=birth(kst(at+1000));
  assert.equal(before.pillars.month.text,after.pillars.month.text);
  assert.equal(before.pillars.year.text,after.pillars.year.text);
 }
});
check('1948 DST missing hour and 1954 30-minute fold',()=>{
 assert.throws(()=>birth('1948-06-01T00:30'),e=>e.code==='NONEXISTENT_LOCAL_TIME');
 assert.throws(()=>birth('1954-03-20T23:45'),e=>e.code==='AMBIGUOUS_LOCAL_TIME');
 const a=birth('1954-03-20T23:45',{ambiguous:'earlier'}),b=birth('1954-03-20T23:45',{ambiguous:'later'});
 assert.equal(Date.parse(b.utc)-Date.parse(a.utc),30*60000);
});
check('historical Asia/Seoul zone: 1909 +08:30 and 1915 +09:00',()=>{
 assert.equal(birth('1909-06-01T12:00').offsetSeconds,8.5*3600);
 assert.equal(birth('1915-06-01T12:00').offsetSeconds,9*3600);
});
check('leap-year 2000 accepted and nonleap 2100 rejected',()=>{
 assert.equal(parseLocal('2000-02-29T12:00').day,29);
 assert.throws(()=>parseLocal('2100-02-29T12:00'));
});

console.log(`RESULT ${passed} tests passed; exitCode=${process.exitCode??0}`);
