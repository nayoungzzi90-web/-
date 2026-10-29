import assert from 'node:assert/strict';
import {analyzeR014, type R014Input, type CrossMethodReview} from './oheng_r014';
import {lookupMonthly} from './oheng_r013';
import type {R011Result} from './oheng_r011';
import type {R012Result} from './oheng_r012';
import type {R013Result} from './oheng_r013';

const manifest=Object.fromEntries(Array.from({length:13},(_,i)=>[`R${String(i+1).padStart(3,'0')}`,'POLICY'])) as Record<string,string>;
manifest.R011='DRAFT-1';manifest.R012='DRAFT-1';manifest.R013='DRAFT-1';
function input():R014Input{
const r011:R011Result={ruleId:'R-011',version:'DRAFT-1',gejuCoreCandidates:[
 {candidateId:'PATTERN_A',pattern:'OFFICER',status:'unconfirmed'}],
 xiangCandidates:[{candidateId:'PATTERN_A',pattern:'OFFICER',actorId:'STEM_Y',actorType:'stem',actorValue:'癸',
 supportingRoutes:['O-RES-01'],qualifyingRoutes:['O-RES-01'],pendingRoutes:[],
 damageIds:[],pendingDamageIds:['HE_GAN'],mitigatedDamageIds:[],unresolvedPatternObstructions:['OBS_02'],
 evidenceIds:['R011:1','R010:1'],status:'damage_review_required',indispensable:'not_assessed',finalApproved:false}],
 unboundSupportingRoutes:[],unresolvedDependencies:['R010 격국 성패 미완료'],
 gejuYongshen:null,finalXiangshen:null,balanceYongshen:null,climateYongshen:null,
 finalGeju:null,modelMayClaimEstablished:false};
const r012:R012Result={ruleId:'R-012',version:'DRAFT-1',status:'await_R014',
 dayStem:'甲',strength:'strong',rawCandidates:[
 {element:'火',family:'OUTPUT',role:'adjust',preference:'context_preferred',status:'harm_review',
  comparisonIds:['GEJU_CORE:p1'],evidenceIds:['R006:S01'],limitations:['상관극관 검토']},
 {element:'土',family:'WEALTH',role:'adjust',preference:'initial_candidate',status:'screen_candidate',
  comparisonIds:[],evidenceIds:['R006:S01'],limitations:['격국 효력 미검증']},
 {element:'金',family:'OFFICER_KILLING',role:'adjust',preference:'initial_candidate',status:'screen_candidate',
  comparisonIds:[],evidenceIds:['R006:S01'],limitations:['격국 효력 미검증']}
 ],reviewReasons:[],provenance:['R006:POLICY'],fuyiYongshen:null,singleRecommendedElement:null,
 finalApproval:false,modelMayClaimFinal:false};
const index=lookupMonthly('甲','酉');
const r013:R013Result={ruleId:'R-013',version:'DRAFT-1',
 climate:{index,status:'historical_lookup_only',historicalCandidates:['丁','丙','庚'],yongshen:null,unresolved:['역사적 표기 조건부']},
 tongguan:[{edgeId:'E1',attacker:'金',target:'木',mediator:'水',mediatorActorIds:['STEM_Y'],
  pathStatus:'actor_present_review',effectiveness:'not_evaluated',evidenceIds:['R005:Ke']}],
 bingyao:[{issueId:'I1',harmfulElement:'水',protectedElement:'火',medicineElement:'土',
 medicineActorIds:['H_STEM'],state:'possible_remedy_review',effectiveness:'not_evaluated',evidenceIds:['R010:I1']}],
 status:'review_required',blockReasons:['climate_diagnosis_not_approved'],climateYongshen:null,
 tongguanYongshen:null,bingyaoYongshen:null,finalYongshen:null,finalApproval:false};
return {r011,r012,r013,manifest:{...manifest},registrySnapshot:{approvedRuleIds:['RULE:C1'],validatedByServer:true},
 canonicalChartId:'TEST:甲酉',chartValidated:true,crossMethodReviews:[]};
}
let count=0;
function test(name:string,f:()=>void){f();++count;console.log(`PASS ${String(count).padStart(2,'0')} ${name}`);}
const get=(method:string)=>analyzeR014(input()).recommendations.filter(x=>x.domain===method);
test('namespaces preserve five analytic domains',()=>{
 const x=analyzeR014(input()); assert.deepEqual(Object.keys(x.methodSummaries).sort(),['BINGYAO','CLIMATE','FUYI','GEJU','TONGGUAN'].sort());});
test('R011 geju remains PATTERN, not element',()=>{
 const x=get('GEJU').find(x=>x.scope==='pattern_core')!;assert.equal(x.kind,'pattern');assert.equal(x.value,'OFFICER');});
test('R011 Xiangshen carries actor identity and route',()=>{
 const x=get('GEJU').find(x=>x.scope==='xiangshen')!;
 assert.equal(x.value,'癸');assert(x.trace[0].sourceNodeIds?.includes('STEM_Y'));assert(x.conditions.some(x=>x.includes('O-RES-01')));});
test('R011 pending damage blocks Xiangshen finality',()=>{
 const x=get('GEJU').find(x=>x.scope==='xiangshen')!;assert(x.blockers.some(v=>v.includes('HE_GAN')));assert.equal(x.finalApproved,false);});
test('R012 independent three candidate elements',()=>{assert.deepEqual(get('FUYI').map(x=>x.value).sort(),['火','土','金'].sort());});
test('R012 potential harm not silently removed',()=>{
 const x=get('FUYI').find(x=>x.value==='火')!;assert(x.blockers.some(v=>v.includes('상관극관')));});
test('R013 甲酉 monthly mentions are reference only',()=>{const x=get('CLIMATE');assert.equal(x.length,3);assert(x.every(y=>y.evidenceStatus==='historical_reference'));});
test('R013 monthly historical stem order is not interpreted as verified priority',()=>{
 const x=get('CLIMATE');assert(x.every(v=>v.conditions.includes('원문 120항목 개별 교감')));});
test('R013 mediator actor linked and unconfirmed',()=>{const x=get('TONGGUAN')[0];assert.equal(x.value,'水');assert.equal(x.kind,'element');assert(x.trace[0].sourceNodeIds?.includes('STEM_Y'));});
test('R013 Bingyao is issue-scoped rather than generic',()=>{const x=get('BINGYAO')[0];assert.equal(x.value,'土');assert(x.conditions.some(s=>s.includes('I1')));});
test('equal elements across FU YI and BING YAO not voted',()=>{
 const x=analyzeR014(input());assert.equal(x.noMajorityVote,true);assert.equal(x.singleBestElement,null);});
test('R014 never issues final approval with draft upstream',()=>{
 const x=analyzeR014(input());assert.equal(x.finalYongshen,null);assert.equal(x.finalApproval,false);});
test('no interaction review means no invented conflicts',()=>{
 const x=analyzeR014(input());assert.equal(x.findings.length,0);assert.equal(x.status,'pending_review');});
test('possible harm is recorded not collapsed into failure',()=>{
 const i=input();i.crossMethodReviews=[{id:'C1',leftId:'F:火',rightId:'G:PATTERN_A',state:'potential_harm',
 approvedByRule:null,evidenceIds:['E1'],note:'상관극관 가능성'}];const x=analyzeR014(i);
 assert.equal(x.status,'conflict_review');assert.equal(x.findings[0].state,'potential_harm');});
test('confirmed harm requires approved registry rule',()=>{
 const i=input();i.crossMethodReviews=[{id:'C2',leftId:'F:火',rightId:'G:PATTERN_A',state:'confirmed_harm',
 approvedByRule:null,evidenceIds:['E1'],note:'손상'}];assert.throws(()=>analyzeR014(i),/R014_UNTRUSTED_REVIEW/);});
test('fabricated approved rule rejected',()=>{
 const i=input();i.crossMethodReviews=[{id:'C2',leftId:'F:火',rightId:'G:PATTERN_A',state:'confirmed_harm',
 approvedByRule:'FAKE',evidenceIds:['E1'],note:'손상'}];assert.throws(()=>analyzeR014(i),/R014_UNTRUSTED_REVIEW/);});
test('trusted harm is theory-specific but still not final',()=>{
 const i=input();i.crossMethodReviews=[{id:'C2',leftId:'F:火',rightId:'G:PATTERN_A',state:'confirmed_harm',
 approvedByRule:'RULE:C1',evidenceIds:['E1'],note:'이론상 상관극관'}];const x=analyzeR014(i);
 assert.equal(x.status,'conflict_review');assert.equal(x.finalApproval,false);});
test('trusted cleared relation does not promote yongshen',()=>{
 const i=input();i.crossMethodReviews=[{id:'C3',leftId:'F:金',rightId:'G:PATTERN_A',state:'cleared',
 approvedByRule:'RULE:C1',evidenceIds:['E2'],note:'충돌 없음'}];const x=analyzeR014(i);
 assert.equal(x.status,'pending_review');assert.equal(x.finalYongshen,null);});
test('untrusted client registry forces blocked state',()=>{
 const i=input();i.registrySnapshot.validatedByServer=false;assert.equal(analyzeR014(i).status,'blocked');});
test('invalid chart blocks final output',()=>{const i=input();i.chartValidated=false;const x=analyzeR014(i);assert.equal(x.status,'blocked');});
test('manifests R001..R013 required',()=>{const i=input();delete i.manifest.R003;assert.throws(()=>analyzeR014(i),/R014_MISSING_MANIFEST:R003/);});
test('source version mismatch rejected',()=>{const i=input();i.manifest.R013='v999';assert.throws(()=>analyzeR014(i),/R014_SOURCE_VERSION_MISMATCH/);});
test('source day master mismatch rejected',()=>{const i=input();i.r012.dayStem='乙';assert.throws(()=>analyzeR014(i),/R014_CHART_INCONSISTENT/);});
test('fake upstream R011 approval rejected',()=>{const i=input(); (i.r011 as any).gejuYongshen='金';assert.throws(()=>analyzeR014(i),/R014_UNEXPECTED_UPSTREAM_FINAL/);});
test('invalid cross-reference rejected',()=>{const i=input();i.crossMethodReviews=[{id:'C1',leftId:'F:火',rightId:'G:MISSING',state:'unknown',approvedByRule:null,evidenceIds:[],note:'x'}];assert.throws(()=>analyzeR014(i),/R014_BAD_REVIEW_REFERENCE/);});
test('same method cannot masquerade as cross-method review',()=>{
 const i=input();i.crossMethodReviews=[{id:'C1',leftId:'F:火',rightId:'F:土',state:'unknown',approvedByRule:null,evidenceIds:[],note:'x'}];assert.throws(()=>analyzeR014(i),/R014_REVIEW_NOT_CROSS_METHOD/);});
test('duplicate review id rejected',()=>{
 const i=input();i.crossMethodReviews=[
 {id:'C1',leftId:'F:火',rightId:'G:PATTERN_A',state:'unknown',approvedByRule:null,evidenceIds:[],note:'x'},
 {id:'C1',leftId:'F:土',rightId:'G:PATTERN_A',state:'unknown',approvedByRule:null,evidenceIds:[],note:'x'}];assert.throws(()=>analyzeR014(i),/R014_BAD_REVIEW_REFERENCE/);});
test('R012 review status remains visible',()=>{
 const i=input();i.r012.status='special_review';i.r012.rawCandidates=[];
 const x=analyzeR014(i);assert(x.reviewReasons.some(r=>r.includes('special_review')));assert.equal(x.singleBestElement,null);});
test('unverified historical data stays unverified',()=>{
 const i=input();i.r013.climate.index={...i.r013.climate.index,sourceTier:'secondary_digest_unverified'};
 const x=analyzeR014(i);assert(x.reviewReasons.includes('조후 원전 대조 미완료'));});
test('repeated call is deterministic',()=>{const i=input();assert.deepEqual(analyzeR014(i),analyzeR014(i));});
test('order of comparison edges does not matter',()=>{
 const i=input();const a:CrossMethodReview={id:'C2',leftId:'F:火',rightId:'G:PATTERN_A',state:'potential_harm',approvedByRule:null,evidenceIds:['Z'],note:'x'};
 const b:CrossMethodReview={id:'C1',leftId:'T:E1:水',rightId:'F:金',state:'unknown',approvedByRule:null,evidenceIds:['Y'],note:'y'};
 i.crossMethodReviews=[a,b];const v=analyzeR014(i);i.crossMethodReviews=[b,a];assert.deepEqual(v,analyzeR014(i));});
console.log(`R-014 ${count} groups passed. No final yongshen approvals (by design).`);
