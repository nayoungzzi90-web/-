import assert from 'node:assert/strict';
import {analyzeR010, R010_ROUTES, type Pattern, type Signal, type R010Input} from './oheng_r010';
import {analyzeR008, type Pillars} from './oheng_r008';
import {analyzeR009} from './oheng_r009';

const p:Pillars={
 year:{stem:'戊',branch:'寅'},month:{stem:'辛',branch:'酉'},
 day:{stem:'甲',branch:'寅'},hour:{stem:'丁',branch:'亥'}
};
let passed=0;
function check(name:string,fn:()=>void){fn();passed++;console.log('PASS',name);}
function facts(keys:string[]):Signal[]{return keys.map(key=>({key,state:'confirmed',evidenceIds:[`E:${key}`],approvedByRule:`POLICY:APPROVED:${key}`}));}
function input(patterns:Pattern[],keys:string[],pillars:Pillars=p):R010Input{
 return {pillars,r008:analyzeR008({pillars,r007BaseCandidate:'정관격',ruleVersions:{r003:'R003',r005:'R005',r007:'R007'}}),
  r009:analyzeR009(pillars), upstreamValidated:true,
  candidates:patterns.map((pattern,i)=>({pattern,candidateId:`C:${pattern}:${i}`,origin:'R-007',evidenceIds:[`E:base:${pattern}`]})),signals:facts(keys)};
}
function one(pattern:Pattern,keys:string[]){return analyzeR010(input([pattern],keys)).reviews[0];}

check('01 성립 후보: 정관격 재생관',()=>assert.equal(one('OFFICER',['wealth_supports_officer_effective']).status,'establish_candidate'));
check('02 정관격 재생관 + 상관극관은 혼재 검토',()=>assert.equal(one('OFFICER',['wealth_supports_officer_effective','hurting_officer_effective']).status,'mixed_unresolved'));
check('03 정관격 재생관 + 상관극관 + 인성 구응',()=>{
 const r=one('OFFICER',['wealth_supports_officer_effective','hurting_officer_effective','resource_restrains_hurting_effective']);
 assert.equal(r.status,'rescue_candidate');assert.deepEqual(r.rescuedLinks,[{obstruction:'O-OBS-01',rescue:'O-RES-01'}]);
});
check('04 구응만 있고 손상 규칙이 없으면 rescue_candidate 아님',()=>assert.equal(one('OFFICER',['wealth_supports_officer_effective','resource_restrains_hurting_effective']).status,'establish_candidate'));
check('05 재격 식신생재는 강약 검증 없으면 미확정',()=>assert.equal(one('WEALTH',['food_generates_wealth_effective']).status,'insufficient_evidence'));
check('06 재격 식신생재+일간 강약 승인 확인',()=>assert.equal(one('WEALTH',['food_generates_wealth_effective','day_strength_supports_food_wealth']).status,'establish_candidate'));
check('07 인격 재극인 후보',()=>assert.equal(one('RESOURCE',['wealth_damages_needed_resource_effective']).status,'obstruct_candidate'));
check('08 식신격 편인도식 구응 후보',()=>assert.equal(one('FOOD',['food_generates_wealth_effective','indirect_resource_harms_food_effective','wealth_restrains_indirect_resource_effective']).status,'rescue_candidate'));
check('09 칠살격 신강 미승인-> 성립 미판정',()=>assert.equal(one('KILLING',['food_controls_killing_effective']).status,'insufficient_evidence'));
check('10 상관격 생재 후보',()=>assert.equal(one('HURTING',['hurting_generates_wealth_effective']).status,'establish_candidate'));
check('11 양인격 관살제인 구조 후보',()=>assert.equal(one('YANG_BLADE',['officer_or_killing_controls_blade_effective','wealth_resource_support_balanced']).status,'establish_candidate'));
check('12 건록·월겁 취관, 재인 보조',()=>assert.equal(one('JIANLU_YUEJIE',['officer_supported_by_wealth_resource_effective']).status,'establish_candidate'));
check('13 신호 미제공은 false가 아니라 pending',()=>assert.ok(one('OFFICER',[]).pendingRoutes.includes('O-EST-01')));
check('14 검증되지 않은 confirmed 신호는 거부',()=>{
 const i=input(['OFFICER'],[]);i.signals=[{key:'wealth_supports_officer_effective',state:'confirmed',approvedByRule:null,evidenceIds:[]}];
 assert.throws(()=>analyzeR010(i),/R010_UNVERIFIED_EFFECTIVENESS/);
});
check('15 원국-선행분석 월지 불일치 거부',()=>{
 const i=input(['OFFICER'],[]);i.pillars={...i.pillars,month:{stem:'辛',branch:'子'}};
 assert.throws(()=>analyzeR010(i),/R010_DEPENDENCY_MISMATCH/);
});
check('16 R-008/R-009 후보 보존 + 겸격 확정하지 않음',()=>{
 const r=analyzeR010(input(['OFFICER','RESOURCE'],['wealth_supports_officer_effective','officer_resource_chain_effective']));
 assert.equal(r.reviews.length,2);assert.deepEqual(r.coPattern.candidateIds,['C:OFFICER:0','C:RESOURCE:1']);
 assert.equal(r.coPattern.harmony,'not_evaluated');assert.equal(r.finalPattern,null);
});
check('17 파격 요인 다수 중 구응은 지정된 것만 해소',()=>{
 const r=one('OFFICER',['wealth_supports_officer_effective','hurting_officer_effective','officer_mixed_with_killing_effective','resource_restrains_hurting_effective']);
 assert.deepEqual(r.unresolvedObstructions,['O-OBS-02']); assert.equal(r.status,'mixed_unresolved');
});
check('18 동일 입력/규칙 -> 같은 결과',()=>{
 const i=input(['FOOD'],['food_generates_wealth_effective']);assert.deepEqual(analyzeR010(i),analyzeR010(i));
});
check('19 최종 성격/파격/길흉 확정 없음',()=>{
 const r=analyzeR010(input(['OFFICER'],['wealth_supports_officer_effective']));
 assert.equal(r.modelMayClaimEstablished,false);assert.equal(r.finalSuccess,null);assert.equal(r.reviews[0].finalApproved,false);
});
check('20 8가지 격국 경로 모두 정의',()=>{
 const names=new Set(R010_ROUTES.map(r=>r.pattern));assert.equal(names.size,8);
 for(const name of names) assert.ok(R010_ROUTES.some(r=>r.pattern===name&&r.kind==='establish'));
});
check('21 불일치/미승인 입력은 거부',()=>{
 const i=input(['OFFICER'],[]); i.upstreamValidated=false;assert.throws(()=>analyzeR010(i),/R010_UPSTREAM_UNVALIDATED/);
});
check('22 승인된 absent는 true로 발화하지 않음',()=>{
 const i=input(['OFFICER'],[]);i.signals=[{key:'wealth_supports_officer_effective',state:'absent',evidenceIds:['E:no-wealth'],approvedByRule:'R:tested'}];
 const r=analyzeR010(i).reviews[0];assert.ok(!r.establishedRoutes.includes('O-EST-01'));
});
check('23 중복 신호는 거부',()=>{
 const i=input(['OFFICER'],['wealth_supports_officer_effective','wealth_supports_officer_effective']);
 assert.throws(()=>analyzeR010(i),/R010_DUPLICATE_SIGNAL/);
});
check('24 종격·가종 후보를 격국 성립과 별도로 검토',()=>{
 const q:Pillars={year:{stem:'庚',branch:'申'},month:{stem:'辛',branch:'酉'},day:{stem:'丙',branch:'子'},hour:{stem:'辛',branch:'丑'}};
 const r=analyzeR010(input(['WEALTH'],[],q));
 assert.equal(r.specialReviewRequired,true);assert.ok(r.specialCandidates.includes('FOLLOW_WEALTH'));
 assert.equal(r.finalPattern,null);
});
console.log(`TOTAL: ${passed} groups passed`);
