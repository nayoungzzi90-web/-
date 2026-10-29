/**
 * OHENG R-001 calendar kernel (calculation candidate, not independently certified).
 * Gregorian dates 1900-2100, Asia/Seoul legal civil time, frozen solar term instants.
 * Not a lunar calendar converter. True-solar-time is intentionally unsupported.
 * Rules: Year at Lichun, month at 12 Jie; [start,nextStart) boundary; day midnight
 * or explicit late-zi (23:00) next-day policy; zi hour starts 23:00.
 */
export const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const;
export const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const;
export type Stem = typeof STEMS[number];
export type Branch = typeof BRANCHES[number];
export type Pillar = { stem: Stem; branch: Branch; index: number; text: string };
export type LocalDateTime = { year:number; month:number; day:number; hour:number; minute:number; second:number; millisecond:number };
export type TermData = {
 dataVersion:string; startYear:number; endYear:number;
 termNames:string[]; angles:number[]; rows: Record<string,number[]>;
};
export type BirthInput = {
  local:string; // YYYY-MM-DDTHH:mm:ss, seconds may be omitted
  zone:'Asia/Seoul'; // MVP legal-civil clock; other regions must use another verified policy
  ambiguous?: 'reject'|'earlier'|'later';
  dayRollover?: 'midnight'|'late_zi_next_day';
  timeBasis?: 'legal_civil';
};
export type BirthResult = {
  status:'calculated_review_required';
  input:BirthInput;
  utc:string; offsetSeconds:number; foldCandidates:number;
  pillars: { year:Pillar; month:Pillar; day:Pillar; hour:Pillar };
  monthBoundary: { name:string; utc:string; longitude:number };
  yearBoundary: { name:'입춘'; utc:string };
  diagnostics: { nearTermBoundary:boolean; secondsToNearestTerm:number;
    historicalTimeZoneReview:boolean; kasiMinuteCrossCheckedYear:boolean;
    dayRollover:string; termDataVersion:string; timeZoneDatabaseVersion:string; independentlyCertified:false;
  };
};
export class R001Error extends Error {
  constructor(public readonly code:string, message:string){super(message);this.name='R001Error';}
}
const mod=(n:number,m:number)=>(n%m+m)%m;
const DAY_MS=86400000;
const pad=(n:number)=>(n<10?'0':'')+n;
const sexagenaryIndex=(stemIndex:number,branchIndex:number)=>mod(branchIndex+12*mod((stemIndex-branchIndex)/2,5),60);
const formatDate=(d:LocalDateTime)=>`${d.year}-${pad(d.month)}-${pad(d.day)}T${pad(d.hour)}:${pad(d.minute)}:${pad(d.second)}.${String(d.millisecond).padStart(3,'0')}`;
const wallPattern=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
export function parseLocal(input:string):LocalDateTime {
 const m=wallPattern.exec(input);
 if(!m) throw new R001Error('INVALID_FORMAT','Use YYYY-MM-DDTHH:mm[:ss] local civil time');
 const [y,mo,d,h,mi,s,milli]=[Number(m[1]),Number(m[2]),Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]??0),Number((m[7]??'0').padEnd(3,'0'))];
 if(y<1900||y>2100) throw new R001Error('OUT_OF_RANGE','1900..2100 Gregorian years are supported');
 const dt=new Date(Date.UTC(y,mo-1,d,h,mi,s,milli));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()+1!==mo||dt.getUTCDate()!==d||dt.getUTCHours()!==h||dt.getUTCMinutes()!==mi||dt.getUTCSeconds()!==s||dt.getUTCMilliseconds()!==milli) throw new R001Error('INVALID_DATE','Nonexistent Gregorian date or invalid clock');
 return {year:y,month:mo,day:d,hour:h,minute:mi,second:s,millisecond:milli};
}
const fmt = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn',{
 timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const partsFromInstant=(ms:number):LocalDateTime=>{
 const p:Record<string,number>={};
 for(const e of fmt.formatToParts(new Date(ms))) if(['year','month','day','hour','minute','second'].includes(e.type)) p[e.type]=Number(e.value);
 return {year:p.year,month:p.month,day:p.day,hour:p.hour,minute:p.minute,second:p.second,millisecond:mod(ms,1000)};
};
const naive=(c:LocalDateTime)=>Date.UTC(c.year,c.month-1,c.day,c.hour,c.minute,c.second,c.millisecond);
const offsetSecondsAt=(ms:number)=>Math.round((naive(partsFromInstant(ms))-ms)/1000);
const same=(a:LocalDateTime,b:LocalDateTime)=>formatDate(a)===formatDate(b);
export function civilToUtc(local:LocalDateTime,choice:'reject'|'earlier'|'later'='reject'):{utcMs:number;offsetSeconds:number;possibleCount:number}{
 const pseudo=naive(local), offsets=new Set<number>();
 for(let h=-18;h<=18;h++) offsets.add(offsetSecondsAt(pseudo+h*3600000));
 const possible=[...offsets].map(o=>pseudo-o*1000).filter(ms=>same(partsFromInstant(ms),local)).sort((a,b)=>a-b);
 if(possible.length===0) throw new R001Error('NONEXISTENT_LOCAL_TIME','Time skipped by a legal clock change or DST');
 if(possible.length>1 && choice==='reject') throw new R001Error('AMBIGUOUS_LOCAL_TIME','Repeated clock time: specify earlier or later occurrence');
 const instant=choice==='later'?possible[possible.length-1]:possible[0];
 return {utcMs:instant,offsetSeconds:offsetSecondsAt(instant),possibleCount:possible.length};
}
export function ganji(index:number):Pillar{
 const i=mod(index,60), stem=STEMS[i%10],branch=BRANCHES[i%12];
 return {stem,branch,index:i,text:stem+branch};
}
export function calculateDay(local:LocalDateTime, rollover:'midnight'|'late_zi_next_day'='midnight'):Pillar{
 // 2000-01-07 Gregorian civil date = 甲子 day, independently cross-check KASI day record.
 const midnightMs=Date.UTC(local.year,local.month-1,local.day);
 const days=Math.round((midnightMs-Date.UTC(2000,0,7))/DAY_MS);
 return ganji(days+(rollover==='late_zi_next_day'&&local.hour===23?1:0));
}
export function calculateHour(day:Pillar,local:LocalDateTime):Pillar {
 const hourBranch=mod(Math.floor((local.hour+1)/2),12); // 23:00-00:59 子
 const hourStem=mod(2*(day.index%10%5)+hourBranch,10);
 return {stem:STEMS[hourStem],branch:BRANCHES[hourBranch],index:sexagenaryIndex(hourStem,hourBranch),text:STEMS[hourStem]+BRANCHES[hourBranch]};
 // Chinese sexagenary index solved by CRT: index≡hourStem(mod10), index≡hourBranch(mod12).
}
const JIE_TERM_INDEX=[2,4,6,8,10,12,14,16,18,20,22,0];
const JIE_BRANCH_INDEX:Record<number,number>={2:2,4:3,6:4,8:5,10:6,12:7,14:8,16:9,18:10,20:11,22:0,0:1};
const seqJie=(terms:TermData,y:number)=>{
 const out:{index:number;year:number;at:number;name:string}[]=[];
 for(const yr of [y-1,y,y+1]){
   const row=terms.rows[String(yr)];
   if(!row||row.length!==24) throw new R001Error('MISSING_EPHEMERIS',`Missing solar terms for ${yr}`);
   for(const idx of JIE_TERM_INDEX)out.push({index:idx,year:yr,at:row[idx],name:terms.termNames[idx]});
 }
 return out.sort((a,b)=>a.at-b.at);
};
export function validateTerms(terms:TermData){
 if(terms.termNames.length!==24||terms.angles.length!==24) throw new R001Error('BAD_EPHEMERIS','Expected 24 terms');
 for(let yr=terms.startYear;yr<=terms.endYear;yr++){
   const row=terms.rows[String(yr)];
   if(!row||row.length!==24||row.some((v,i)=>!Number.isSafeInteger(v)||(i>0&&v<=row[i-1]))) throw new R001Error('BAD_EPHEMERIS',`Bad ephemeris year ${yr}`);
 }
}
export function calculateR001(input:BirthInput,terms:TermData):BirthResult {
 if(input.zone!=='Asia/Seoul')throw new R001Error('UNSUPPORTED_ZONE','Only Asia/Seoul legal-civil policy is implemented');
 if(input.timeBasis && input.timeBasis!=='legal_civil')throw new R001Error('UNSUPPORTED_TIME_BASIS','True solar time is not implemented');
 const local=parseLocal(input.local);
 const {utcMs,offsetSeconds,possibleCount}=civilToUtc(local,input.ambiguous??'reject');
 const rollover=input.dayRollover??'midnight';
 if(!['midnight','late_zi_next_day'].includes(rollover)) throw new R001Error('INVALID_POLICY','Unsupported rollover policy');
 const list=seqJie(terms,local.year);
 const start=[...list].reverse().find(t=>t.at<=utcMs);
 if(!start)throw new R001Error('OUT_OF_RANGE','No previous month boundary');
 const lichun=[...list].filter(t=>t.index===2 && t.at<=utcMs).pop();
 if(!lichun)throw new R001Error('OUT_OF_RANGE','No previous Lichun boundary');
 const solarYear=lichun.year;
 const year=ganji(solarYear-1984);
 const monthNumber=JIE_TERM_INDEX.indexOf(start.index); // 0 寅, ... 11 丑
 const yearStem=year.index%10;
 const monthStem=mod(2*(yearStem%5)+2+monthNumber,10);
 const monthBranch=JIE_BRANCH_INDEX[start.index];
 const monthPillar: Pillar={stem:STEMS[monthStem],branch:BRANCHES[monthBranch],index:sexagenaryIndex(monthStem,monthBranch),text:STEMS[monthStem]+BRANCHES[monthBranch]};
 const day=calculateDay(local,rollover);
 const hour=calculateHour(day,local);
 const proximity=Math.min(...[local.year-1,local.year,local.year+1].flatMap(y=>terms.rows[String(y)]??[]).map(at=>Math.abs(at-utcMs)))/1000;
 return {
   status:'calculated_review_required',input,utc:new Date(utcMs).toISOString(),offsetSeconds,foldCandidates:possibleCount,
   pillars:{year,month:monthPillar,day,hour},
   monthBoundary:{name:start.name,utc:new Date(start.at).toISOString(),longitude:terms.angles[start.index]},
   yearBoundary:{name:'입춘',utc:new Date(lichun.at).toISOString()},
   diagnostics:{nearTermBoundary:proximity<=120,secondsToNearestTerm:Math.round(proximity*1000)/1000,
     historicalTimeZoneReview:local.year<1970,kasiMinuteCrossCheckedYear:local.year>=2025&&local.year<=2027,
     dayRollover:rollover,termDataVersion:terms.dataVersion,timeZoneDatabaseVersion:'RUNTIME_INTL_UNPINNED',independentlyCertified:false}
 };
}
