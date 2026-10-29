/** 참고 구현 단위 테스트: 원국의 간지 연월시 합법성은 R-001이 검증하는 별도 항목이다. */
import {analyzeR009, type CandidateCode, familyOf, tenGod} from './oheng_r009';
import type {Pillars, Stem, Branch} from './oheng_r008';
function assert(v:unknown,message='assertion failed'): asserts v {if(!v) throw new Error(message);}
function eq(a:unknown,b:unknown,message='equality failed'){if(a!==b) throw new Error(`${message}: ${String(a)} != ${String(b)}`)}
const P=(day:Stem,month:Branch, yearStem:Stem='庚',monthStem:Stem='己',hourStem:Stem='壬',yearBranch:Branch='申',dayBranch:Branch='子',hourBranch:Branch='丑'):Pillars=>({
  year:{stem:yearStem,branch:yearBranch},month:{stem:monthStem,branch:month},day:{stem:day,branch:dayBranch},hour:{stem:hourStem,branch:hourBranch}
});
const codes=(p:Pillars):CandidateCode[]=>analyzeR009(p).candidates.map(c=>c.code);
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log(`PASS ${name}`)}
const branches:Branch[]=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const stems:Stem[]=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const lu:Record<Stem,Branch>={甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
const blade:Partial<Record<Stem,Branch>>={甲:'卯',丙:'午',戊:'午',庚:'酉',壬:'子'};
test('S009-01: 건록 10개 매핑',()=>{for(const s of stems){eq(analyzeR009(P(s,lu[s])).structural.jianlu,true,s);}});
test('S009-02: 건록 잘못된 월지 거절',()=>{for(const s of stems){for(const b of branches){if(b!==lu[s])eq(analyzeR009(P(s,b)).structural.jianlu,false,s+b)}}});
test('S009-03: 양인 다섯 가지 매핑',()=>{for(const s of stems){for(const b of branches){eq(analyzeR009(P(s,b)).structural.yang_blade,blade[s]===b, s+b)}}});
test('S009-04: 甲卯 양인과 월겁 동시 보존',()=>{const r=analyzeR009(P('甲','卯'));assert(r.structural.yang_blade);assert(r.structural.month_robbery);assert(codes(P('甲','卯')).includes('YUEJIE'));assert(codes(P('甲','卯')).includes('YANG_BLADE'));});
test('S009-05: 戊午 본기 인성 + 양인',()=>{eq(tenGod('戊','丁'),'정인');assert(codes(P('戊','午')).includes('YANG_BLADE'));});
test('S009-06: 丁巳 월겁이나 양인은 아님',()=>{const c=codes(P('丁','巳'));assert(c.includes('YUEJIE'));assert(!c.includes('YANG_BLADE'));});
test('S009-07: 從財 약한 쪽 후보, 확정 아님',()=>{const r=analyzeR009(P('丙','酉','庚','辛','辛','申','子','丑'));assert(codes(P('丙','酉','庚','辛','辛','申','子','丑')).includes('FOLLOW_WEALTH'));eq(r.final_pattern,null);eq(r.status,'review_required');});
test('S009-08: 從官살 후보, 확정 아님',()=>{const p=P('乙','酉','辛','辛','辛','酉','酉','酉');assert(codes(p).includes('FOLLOW_OFFICER'));eq(analyzeR009(p).final_follow_status,'not_evaluated');});
test('S009-09: 從兒 후보, 확정 아님',()=>{const p=P('甲','巳','丁','丙','丙','巳','午','午');assert(codes(p).includes('FOLLOW_OUTPUT'));});
test('S009-10: 인성 비겁 남았을 때 가종 검토 후보',()=>{const p=P('丙','酉','甲','辛','庚','申','子','丑');const c=codes(p);assert(c.includes('FOLLOW_WEALTH'));assert(c.includes('FAKE_FOLLOW_REVIEW'));});
test('S009-11: 從旺 구조 검토 후보',()=>{const p:Pillars={year:{stem:'癸',branch:'卯'},month:{stem:'乙',branch:'卯'},day:{stem:'甲',branch:'寅'},hour:{stem:'乙',branch:'亥'}};assert(codes(p).includes('FOLLOW_POWER'));});
test('S009-12: 從強 구조 검토 후보',()=>{const p:Pillars={year:{stem:'壬',branch:'子'},month:{stem:'癸',branch:'卯'},day:{stem:'甲',branch:'子'},hour:{stem:'甲',branch:'子'}};assert(codes(p).includes('FOLLOW_STRENGTH'));});
test('S009-13: 종격 후보와 건록 동시에 가능해도 후보 보존',()=>{const p=P('甲','寅','戊','戊','戊','申','申','酉');assert(codes(p).includes('JIANLU'));});
test('S009-14: 비격 생성 원칙: 모든 테스트에서 final_pattern null',()=>{for(const s of stems){for(const b of branches){eq(analyzeR009(P(s,b)).final_pattern,null)}}});
test('S009-15: 10간 x 12지 120조합 오류 없이 후보 탐지',()=>{for(const s of stems){for(const b of branches){const r=analyzeR009(P(s,b));eq(r.day_stem,s);eq(r.month_branch,b)}}});
test('S009-16: 천간 10x10 관계 기본 분류',()=>{for(const a of stems){for(const b of stems){assert(familyOf(a,b));assert(tenGod(a,b))}}});
test('S009-17: 입력 오류 검증',()=>{let thrown=false;try{analyzeR009(P('甲','寅','庚','己','壬','申','자' as Branch,'丑'))}catch{thrown=true}assert(thrown)});
console.log(`${passed} TEST GROUPS PASSED`);
