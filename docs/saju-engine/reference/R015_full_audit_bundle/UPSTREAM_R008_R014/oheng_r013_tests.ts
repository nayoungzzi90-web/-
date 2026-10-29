import assert from 'node:assert/strict';
import {MONTHS,MONTHLY_INDEX,lookupMonthly,analyzeR013,channelMediator,
  type Branch,type R013Input} from './oheng_r013';
import {ALL_STEMS,ALL_ELEMENTS,CONTROLS,GENERATES,type Stem,type Element} from './oheng_r012';
const trusted=['VERIFIED_CLIMATE','VERIFIED_ISSUE','VERIFIED_EDGE'];
const approval=(ruleId:string,evidenceIds:string[]=['E:1'])=>({status:'approved' as const,ruleId,evidenceIds});
function fixture(dayStem:Stem='甲',monthBranch:Branch='寅'):R013Input{return {
 dayStem,monthBranch,upstreamValidated:true,
 policyVersions:{R001:'v1',R002:'v1',R003:'v1',R004:'v1',R005:'v2',R006:'v1',R007:'v1',R008:'v1',R009:'v1',R010:'v1',R011:'v1',R012:'v1'},
 actors:[],climateAssessment:{status:'candidate',ruleId:null,evidenceIds:[]},
 materialInteractionsUnresolved:false,controllingEdges:[],issues:[],trustedRuleIds:trusted
};}
let passed=0;function test(label:string,fn:()=>void){fn();passed++;console.log(`PASS ${String(passed).padStart(2,'0')} ${label}`);}
test('120 index entries from 10 stems x 12 solar months',()=>{assert.equal(MONTHLY_INDEX.length,120);assert.equal(new Set(MONTHLY_INDEX.map(x=>x.key)).size,120);});
test('Each day stem x month resolves uniquely, no final',()=>{for(const s of ALL_STEMS)for(const m of MONTHS){const i=lookupMonthly(s,m);assert.equal(i.decision,'historical_index_only');assert.equal(i.dayStem,s);assert.equal(i.monthBranch,m);}});
test('No monthly reference is production-approved',()=>{assert(MONTHLY_INDEX.every(x=>['primary_text_checked','secondary_digest_unverified'].includes(x.sourceTier)));});
test('All historical token stems in 10 heavenly stems',()=>{for(const x of MONTHLY_INDEX)for(const s of x.historicalMentionStems)assert(ALL_STEMS.includes(s));});
test('甲酉 primary text correct order 丁 before 丙 before 庚',()=>{const i=lookupMonthly('甲','酉');assert.deepEqual(i.historicalMentionStems,['丁','丙','庚']);assert.equal(i.sourceTier,'primary_text_checked');});
test('乙寅 text primary 丙 then 癸',()=>{assert.deepEqual(lookupMonthly('乙','寅').historicalMentionStems,['丙','癸']);});
test('癸卯 text primary 庚 then 辛',()=>{assert.deepEqual(lookupMonthly('癸','卯').historicalMentionStems,['庚','辛']);});
test('Summary ambiguities remain incomplete (丁戌, 辛辰, 癸辰)',()=>{for(const key of [['丁','戌'],['辛','辰'],['癸','辰']] as [Stem,Branch][])assert(!lookupMonthly(...key).transcriptionComplete);});
test('Seasonal subperiod ambiguities flagged, no hard-coded 50%',()=>{assert(lookupMonthly('甲','未').splitPeriodNeedsReview);assert(lookupMonthly('乙','午').splitPeriodNeedsReview);});
test('10 day stems each 12 months keep no final selection',()=>{for(const s of ALL_STEMS)for(const m of MONTHS){const r=analyzeR013(fixture(s,m));assert.equal(r.finalYongshen,null);assert.equal(r.finalApproval,false);}});
test('Five Ke cycles: all mediator paths generate attacker->mediator->target',()=>{for(const x of ALL_ELEMENTS){const t=CONTROLS[x];const m=channelMediator(x,t);assert(m);assert.equal(m,GENERATES[x]);assert.equal(GENERATES[m!],t);}});
test('No mediator for non-control pair',()=>{assert.equal(channelMediator('木','火'),null);assert.equal(channelMediator('土','木'),null);});
test('金克木 mediator 水 but without water actor only theoretical',()=>{const i=fixture();i.controllingEdges=[{id:'EDGE1',attacker:'金',target:'木',evidence:approval('VERIFIED_EDGE')}];const r=analyzeR013(i);assert.equal(r.tongguan[0].mediator,'水');assert.equal(r.tongguan[0].pathStatus,'theoretical_only');});
test('Mediator actor present but channel remains unconfirmed',()=>{const i=fixture();i.controllingEdges=[{id:'EDGE1',attacker:'金',target:'木',evidence:approval('VERIFIED_EDGE')}];i.actors=[{id:'HS1',element:'水',layer:'hidden_stem',position:'month',evidenceIds:['R003:a']}];const r=analyzeR013(i);assert.equal(r.tongguan[0].pathStatus,'actor_present_review');assert.equal(r.tongguan[0].effectiveness,'not_evaluated');});
test('Unapproved mediator edge is not promoted to actual channel',()=>{const i=fixture();i.controllingEdges=[{id:'EDGE1',attacker:'水',target:'火',evidence:{status:'candidate',ruleId:null,evidenceIds:['E']}}];const r=analyzeR013(i);assert.equal(r.tongguan[0].mediator,'木');assert.equal(r.finalYongshen,null);});
test('Invalid Ke edge rejected',()=>{const i=fixture();i.controllingEdges=[{id:'BAD',attacker:'木',target:'金',evidence:approval('VERIFIED_EDGE')}];assert.throws(()=>analyzeR013(i),/R013_BAD_EDGE/);});
test('Unknown issue cannot be assumed real disease',()=>{const i=fixture();i.issues=[{id:'ISSUE1',label:'편인도식 후보',harmfulElement:'水',protectedElement:'火',evidence:{status:'candidate',ruleId:null,evidenceIds:['R010']}}];const r=analyzeR013(i);assert.equal(r.bingyao[0].state,'unverified_issue');});
test('Approved issue 水 harms 火: 土 is theoretical medicine',()=>{const i=fixture();i.issues=[{id:'ISSUE1',label:'편인도식',harmfulElement:'水',protectedElement:'火',evidence:approval('VERIFIED_ISSUE')}];const r=analyzeR013(i);assert.equal(r.bingyao[0].medicineElement,'土');assert.equal(r.bingyao[0].state,'remedy_absent');});
test('Earth actor as remedy still pending not guaranteed cure',()=>{const i=fixture();i.issues=[{id:'ISSUE1',label:'편인도식',harmfulElement:'水',protectedElement:'火',evidence:approval('VERIFIED_ISSUE')}];i.actors=[{id:'ST1',element:'土',layer:'visible_stem',position:'year',evidenceIds:['R005:1']}];const r=analyzeR013(i);assert.equal(r.bingyao[0].state,'possible_remedy_review');assert.equal(r.bingyao[0].effectiveness,'not_evaluated');});
test('Indirect structural issue cannot invent direct-control remedy',()=>{const i=fixture();i.issues=[{id:'ISSUE-INDIRECT',label:'간접 훼손',harmfulElement:'水',protectedElement:'金',evidence:approval('VERIFIED_ISSUE')}];const r=analyzeR013(i);assert.equal(r.bingyao[0].state,'mechanism_review_required');assert.equal(r.bingyao[0].medicineElement,null);});
test('Rule ID alone without trusted registry cannot assert approval',()=>{const i=fixture();i.issues=[{id:'ISSUE1',label:'x',harmfulElement:'金',protectedElement:'木',evidence:approval('MADE_UP')}];assert.throws(()=>analyzeR013(i),/R013_UNTRUSTED_ISSUE/);});
test('Untrusted climate approval rejected',()=>{const i=fixture();i.climateAssessment=approval('UNTRUSTED');assert.throws(()=>analyzeR013(i),/R013_UNTRUSTED_CLIMATE/);});
test('Upstream invalidated blocks final; provides reason',()=>{const i=fixture();i.upstreamValidated=false;const r=analyzeR013(i);assert(r.blockReasons.includes('unvalidated_pillars'));assert.equal(r.finalApproval,false);});
test('Missing version is not silently accepted',()=>{const i=fixture();i.policyVersions.R003='';assert.throws(()=>analyzeR013(i),/R013_MISSING_VERSION/);});
test('Unresolved interactions remain visible',()=>{const i=fixture();i.materialInteractionsUnresolved=true;assert(analyzeR013(i).blockReasons.includes('material_interactions_unresolved'));});
test('Even approved climate diagnosis + primary checked cannot declare yongshen',()=>{const i=fixture();i.climateAssessment=approval('VERIFIED_CLIMATE');const r=analyzeR013(i);assert.equal(r.finalApproval,false);assert.equal(r.climateYongshen,null);});
test('Distinct actors are not merged by equal element',()=>{const i=fixture();i.actors=[{id:'Y-STEM',element:'水',layer:'visible_stem',position:'year',evidenceIds:['E:1']},{id:'M-HIDDEN',element:'水',layer:'hidden_stem',position:'month',evidenceIds:['E:2']}];i.controllingEdges=[{id:'EDGE1',attacker:'金',target:'木',evidence:approval('VERIFIED_EDGE')}];assert.deepEqual(analyzeR013(i).tongguan[0].mediatorActorIds,['Y-STEM','M-HIDDEN']);});
test('Duplicate actor ID rejected',()=>{const i=fixture();i.actors=[{id:'dup',element:'水',layer:'hidden_stem',position:'month',evidenceIds:['E']},{id:'dup',element:'水',layer:'hidden_stem',position:'year',evidenceIds:['E']}];assert.throws(()=>analyzeR013(i),/R013_BAD_ACTOR/);});
test('Deterministic repeat outputs',()=>{const i=fixture('庚','子');assert.deepEqual(analyzeR013(i),analyzeR013(i));});
console.log(`R-013: ${passed} test groups passed; 120 reference combinations indexed; no automatic yongshen approvals`);
