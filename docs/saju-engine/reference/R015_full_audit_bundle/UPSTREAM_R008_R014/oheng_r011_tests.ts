import assert from 'node:assert/strict';
import {analyzeR008, type Pillars} from './oheng_r008';
import {analyzeR009} from './oheng_r009';
import {analyzeR010, type Pattern, type R010Input, type Signal} from './oheng_r010';
import {analyzeR011, ROUTE_XIANG_POLICY, type Actor, type RouteActorBinding, type DamageEdge, type MitigationEdge, type R011Input} from './oheng_r011';

const base:Pillars={year:{stem:'壬',branch:'申'},month:{stem:'辛',branch:'酉'},day:{stem:'甲',branch:'寅'},hour:{stem:'丁',branch:'亥'}};
const trusted=['RULE_OK'];
function fixture(patterns:Pattern[]=['OFFICER'], activeSignals:string[]=[]):R011Input {
 const signals:Signal[]=activeSignals.map(key=>({key,state:'confirmed',evidenceIds:[`E:${key}`],approvedByRule:'RULE_OK'}));
 const ri:R010Input={pillars:base,
   r008:analyzeR008({pillars:base,r007BaseCandidate:'정관격',ruleVersions:{r003:'R003',r005:'R005',r007:'R007'}}),
   r009:analyzeR009(base),
   candidates:patterns.map((pattern,i)=>({candidateId:`C${i}`,pattern,origin:'R-007',evidenceIds:[`C:${pattern}`]})),
   signals,upstreamValidated:true};
 return {r010:analyzeR010(ri),actors:[],bindings:[],damages:[],mitigations:[],trustedRuleIds:trusted,upstreamValidated:true};
}
function actor(actorId:string,family:Actor['family'], value:string,type:Actor['type']='stem'):Actor {
 return {actorId,family,value,type,evidenceIds:[`ACT:${actorId}`],sourceNodeIds:[`NODE:${actorId}`]};
}
function bind(actorId:string, routeId:string, effect:RouteActorBinding['effect']='confirmed',candidateId='C0'):RouteActorBinding {
 return {candidateId,routeId,actorId,effect,approvedByRule:effect==='unknown'?null:'RULE_OK',evidenceIds:[`LINK:${routeId}:${actorId}`]};
}
function attack(attackId:string,targetActorId:string,effect:DamageEdge['effect']):DamageEdge {
 return {attackId,targetActorId,kind:'stem_combination',effect,approvedByRule:effect==='unknown'?null:'RULE_OK',evidenceIds:[`ATTACK:${attackId}`]};
}
function mitigation(mitigationId:string,attackId:string,effect:MitigationEdge['effect']):MitigationEdge {
 return {mitigationId,attackId,effect,approvedByRule:effect==='unknown'?null:'RULE_OK',evidenceIds:[`MITIGATION:${mitigationId}`]};
}
let passed=0;
function check(name:string,f:()=>void){f();passed++;console.log(`PASS ${String(passed).padStart(2,'0')} ${name}`)}
check('R010 승인 이전에는 격국용신/상신 최종값 null',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01')];
 const y=analyzeR011(x);assert.equal(y.gejuYongshen,null);assert.equal(y.finalXiangshen,null);assert.equal(y.finalGeju,null);assert.equal(y.modelMayClaimEstablished,false);
});
check('정관+재생관 재성 상신 후보 및 경로 근거',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01')];
 const y=analyzeR011(x);assert.equal(y.xiangCandidates[0].status,'route_supported_candidate');assert.deepEqual(y.xiangCandidates[0].qualifyingRoutes,['O-EST-01']);
});
check('정관+상관 손상+인성 구응: 인성 상신 후보만 해당 손상에 연결',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','hurting_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];
 const y=analyzeR011(x);assert.equal(y.xiangCandidates[0].status,'route_supported_candidate');assert.deepEqual(y.xiangCandidates[0].qualifyingRoutes,['O-RES-01']);
});
check('정관 2개의 손상 중 구응 1개: 남은 미해결 손상 유지',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','hurting_officer_effective','officer_mixed_with_killing_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];
 assert.deepEqual(analyzeR011(x).xiangCandidates[0].unresolvedPatternObstructions,['O-OBS-02']);
});
check('상신 癸에 戊癸 합의 후보만 있을 때 효력 손상 확정 금지',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','hurting_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];x.damages=[attack('戊癸候補','a','unknown')];
 const y=analyzeR011(x).xiangCandidates[0];assert.equal(y.status,'damage_review_required');assert.deepEqual(y.damageIds,[]);
});
check('상신 효력 손상 승인된 경우에도 최종 파격 단정 금지',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','hurting_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];x.damages=[attack('戊癸成立','a','confirmed')];
 const r=analyzeR011(x);assert.equal(r.xiangCandidates[0].status,'damage_supported_review');assert.equal(r.finalGeju,null);
});
check('손상에 대한 독립 구응이 있으면 손상 ID에만 연결',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','hurting_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];x.damages=[attack('A1','a','confirmed')];x.mitigations=[mitigation('M1','A1','confirmed')];
 const c=analyzeR011(x).xiangCandidates[0];assert.deepEqual(c.mitigatedDamageIds,['A1']);assert.deepEqual(c.damageIds,[]);
});
check('구응 후보는 R010 원인 손상 없을 때 단독 자격 미부여',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-RES-01')];
 const y=analyzeR011(x);assert.equal(y.xiangCandidates.length,0);
});
check('관련 actor가 없어도 route 자체를 자동 선정하지 않음',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);const y=analyzeR011(x);
 assert.equal(y.xiangCandidates.length,0);assert.deepEqual(y.unboundSupportingRoutes,[{candidateId:'C0',routeId:'O-EST-01'}]);
});
check('인성 actor를 재생관 경로에 연결 불가',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','RESOURCE','癸')];x.bindings=[bind('a','O-EST-01')];
 assert.throws(()=>analyzeR011(x),/R011_INVALID_BINDING/);
});
check('존재하지만 아직 검증되지 않은 경로는 후보 대기',()=>{
 const x=fixture(['OFFICER'],[]);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01','unknown')];
 const c=analyzeR011(x).xiangCandidates[0];assert.equal(c.status,'candidate_pending');assert.equal(c.qualifyingRoutes.length,0);
});
check('승인되지 않은 confirmed 효력 입력은 거부',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[{...bind('a','O-EST-01'),approvedByRule:'USER_SUPPLIED'}];
 assert.throws(()=>analyzeR011(x),/R011_UNTRUSTED_EFFECT/);
});
check('상신 공격 confirmed도 trusted 승인 없으면 거부',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01')];x.damages=[{...attack('A','a','confirmed'),approvedByRule:null}];
 assert.throws(()=>analyzeR011(x),/R011_UNTRUSTED_EFFECT/);
});
check('정관격 경로 2개가 존재해도 단일 상신 자동 선택 안 함',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective','resource_protects_officer_effective']);
 x.actors=[actor('a','WEALTH','戊'),actor('b','RESOURCE','癸')];x.bindings=[bind('a','O-EST-01'),bind('b','O-EST-02')];
 const y=analyzeR011(x);assert.equal(y.xiangCandidates.length,2);assert.equal(y.finalXiangshen,null);
});
check('칠살격 식신제살 식상 actor 연결',()=>{
 const x=fixture(['KILLING'],['day_strong_approved','food_controls_killing_effective']);
 x.actors=[actor('f','OUTPUT','丙')];x.bindings=[bind('f','K-EST-01')];
 assert.equal(analyzeR011(x).xiangCandidates[0].status,'route_supported_candidate');
});
check('식신격 F-EST-02는 식신 스스로 성립 -> 상신 자동 생성 안 함',()=>{
 const x=fixture(['FOOD'],['food_controls_killing_effective','wealth_not_feed_killing_effective']);
 assert.equal(analyzeR011(x).xiangCandidates.length,0);
});
check('지지 결합 상신 후보를 표현할 수 있음',()=>{
 const x=fixture(['OFFICER'],['hurting_officer_effective','resource_restrains_hurting_effective']);
 x.actors=[actor('combo','COMBINATION','丁壬合','interaction')];x.bindings=[bind('combo','O-RES-01')];
 assert.equal(analyzeR011(x).xiangCandidates[0].actorType,'interaction');
});
check('branch_group 타입과 sourceNodeIds 보존',()=>{
 const x=fixture(['WEALTH'],['wealth_generates_officer_effective']);
 x.actors=[actor('a','OFFICER','卯未','branch_group')];x.bindings=[bind('a','W-EST-01')];
 const y=analyzeR011(x).xiangCandidates[0];assert.equal(y.actorType,'branch_group');assert.deepEqual(y.evidenceIds,['ACT:a','LINK:W-EST-01:a']);
});
check('종격 후보가 있어도 R010·R011 최종 용신 없음',()=>{
 const x=fixture(['KILLING'],['killing_transforms_through_resource_effective']);
 x.actors=[actor('a','RESOURCE','壬')];x.bindings=[bind('a','K-EST-02')];
 const y=analyzeR011(x);assert.equal(y.balanceYongshen,null);assert.equal(y.climateYongshen,null);
});
check('중복 바인딩을 거부',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01'),bind('a','O-EST-01')];
 assert.throws(()=>analyzeR011(x),/R011_DUPLICATE_BINDING/);
});
check('잘못된 mitigation 타겟 거부',()=>{
 const x=fixture(['OFFICER'],[]);x.mitigations=[mitigation('M','DOES_NOT_EXIST','confirmed')];
 assert.throws(()=>analyzeR011(x),/R011_BAD_MITIGATION/);
});
check('빈 source node와 근거 없는 actor 거부',()=>{
 const x=fixture(['OFFICER'],[]);x.actors=[{...actor('a','WEALTH','戊'),sourceNodeIds:[]}];
 assert.throws(()=>analyzeR011(x),/R011_BAD_ACTORS_OR_CANDIDATES/);
});
check('R010 상태가 정상 아니면 R011 차단',()=>{
 const x=fixture(['OFFICER'],[]);x.upstreamValidated=false;assert.throws(()=>analyzeR011(x),/R011_UPSTREAM_NOT_READY/);
});
check('8개 격국 모두 상신 후보 경로를 갖되 무조건 상신 부여하지 않음',()=>{
 assert.equal(new Set(ROUTE_XIANG_POLICY.map(x=>x.pattern)).size,8);
 assert.equal(new Set(ROUTE_XIANG_POLICY.map(x=>x.routeId)).size,ROUTE_XIANG_POLICY.length);
});
check('동일 입력 재현성',()=>{
 const x=fixture(['OFFICER'],['wealth_supports_officer_effective']);x.actors=[actor('a','WEALTH','戊')];x.bindings=[bind('a','O-EST-01')];
 assert.deepEqual(analyzeR011(x),analyzeR011(x));
});
console.log(`TOTAL ${passed} test groups passed`);
