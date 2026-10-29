import assert from 'node:assert/strict';
import {analyzeR012,ALL_STEMS,ALL_ELEMENTS,ELEMENT_OF, familyOf,
  type Stem,type Structure,type SpecialState,type DependencyComparison,type R012Input} from './oheng_r012';

const blessed=['R006_APPROVED','R009_APPROVED','STRUCTURE_APPROVED','HARM_APPROVED'];
function fixture(dayStem:Stem='甲', strength:'strong'|'weak'|'balanced'|'undetermined'='weak',
  structure:Structure='UNKNOWN', special:SpecialState='cleared'):R012Input {
 return {dayStem,strength:{value:strength,status:'approved',approvedByRule:'R006_APPROVED',evidenceIds:['E:STR']},
   dominantStructure:{value:structure,status:'approved',approvedByRule:'STRUCTURE_APPROVED',evidenceIds:['E:STRUCT']},
   special:{state:special,pattern:null,approvedByRule:special==='cleared'?'R009_APPROVED':null,
     evidenceIds:special==='cleared'?['E:SPECIAL']:[]},comparisons:[],
   r011:{ruleId:'R-011',finalGeju:null,finalXiangshen:null,gejuYongshen:null},
   trustedRuleIds:blessed,upstreamValidated:true,
   upstreamVersions:{R006:'POLICY',R009:'POLICY',R010:'POLICY',R011:'DRAFT-1'}};
}
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log(`PASS ${String(passed).padStart(2,'0')} ${name}`)}
test('10 x 5 day-master and target element mappings form complete partition',()=>{
 for(const stem of ALL_STEMS){
   const groups=ALL_ELEMENTS.map(x=>familyOf(stem,x));
   assert.equal(new Set(groups).size,5);
 }
});
test('All 10 day stems x 2 strength directions (20 scenarios) produce 2 vs 3 candidate groups',()=>{
 for(const stem of ALL_STEMS){
  const weak=analyzeR012(fixture(stem,'weak'));
  const strong=analyzeR012(fixture(stem,'strong'));
  assert.deepEqual(new Set(weak.rawCandidates.map(c=>c.family)),new Set(['PEER','RESOURCE']));
  assert.deepEqual(new Set(strong.rawCandidates.map(c=>c.family)),new Set(['OUTPUT','WEALTH','OFFICER_KILLING']));
  assert.equal(weak.rawCandidates.length,2);assert.equal(strong.rawCandidates.length,3);
  assert.equal(weak.fuyiYongshen,null);assert.equal(strong.finalApproval,false);
 }
});
test('Weak Wood candidates: Water resource, Wood peer',()=>{
 const r=analyzeR012(fixture('甲','weak'));
 assert.deepEqual(r.rawCandidates.map(c=>c.element),['木','水']);
});
test('Strong Wood candidates: Fire output, Earth wealth, Metal control',()=>{
 const r=analyzeR012(fixture('乙','strong'));
 assert.deepEqual(r.rawCandidates.map(c=>c.element),['火','土','金']);
});
test('Weak and wealth-heavy prefers peer but retains resource',()=>{
 const r=analyzeR012(fixture('甲','weak','WEALTH_HEAVY'));
 assert.equal(r.rawCandidates.find(c=>c.family==='PEER')?.preference,'context_preferred');
 assert.equal(r.rawCandidates.length,2);
});
test('Weak and killing-heavy prefers resource but retains peer',()=>{
 const r=analyzeR012(fixture('甲','weak','KILLING_HEAVY'));
 assert.equal(r.rawCandidates.find(c=>c.family==='RESOURCE')?.preference,'context_preferred');
});
test('Strong and peer-heavy prefers output but retains other candidates',()=>{
 const r=analyzeR012(fixture('丙','strong','PEER_HEAVY'));
 assert.equal(r.rawCandidates.find(c=>c.family==='OUTPUT')?.preference,'context_preferred');
 assert.equal(r.rawCandidates.length,3);
});
test('Strong with weak official force flags officer candidate for consideration only',()=>{
 const r=analyzeR012(fixture('庚','strong','OFFICER_WEAK'));
 assert.equal(r.rawCandidates.find(c=>c.family==='OFFICER_KILLING')?.preference,'context_preferred');
 assert.equal(r.singleRecommendedElement,null);
});
test('Strength not approved: no candidates',()=>{
 const x=fixture();x.strength={value:'weak',status:'candidate',approvedByRule:null,evidenceIds:['E']};
 const r=analyzeR012(x);assert.equal(r.status,'strength_review');assert.equal(r.rawCandidates.length,0);
});
test('Balanced: withhold automatic fuyi selection',()=>{
 const r=analyzeR012(fixture('甲','balanced'));assert.equal(r.status,'strength_review');assert.equal(r.rawCandidates.length,0);
});
test('Undetermined: withhold',()=>{
 const r=analyzeR012(fixture('甲','undetermined'));assert.equal(r.status,'strength_review');
});
test('Special candidate blocks general fuyi recommendations',()=>{
 const r=analyzeR012(fixture('甲','weak','WEALTH_HEAVY','candidate'));
 assert.equal(r.status,'special_review');assert.equal(r.rawCandidates.length,0);
});
test('Confirmed follow pattern redirects away from ordinary fuyi',()=>{
 const x=fixture('甲','weak','WEALTH_HEAVY','confirmed');x.special={state:'confirmed',pattern:'FOLLOW_WEALTH',approvedByRule:'R009_APPROVED',evidenceIds:['E:FOLLOW']};
 assert.equal(analyzeR012(x).status,'special_review');
});
test('Unknown special assessment blocks ordinary fuyi',()=>{
 assert.equal(analyzeR012(fixture('甲','strong','UNKNOWN','unknown')).status,'special_review');
});
test('No dominance approval: candidates have no context ranking',()=>{
 const x=fixture();x.dominantStructure={value:'WEALTH_HEAVY',status:'candidate',approvedByRule:null,evidenceIds:[]};
 const r=analyzeR012(x);assert.equal(r.status,'candidate_review');
 assert(r.rawCandidates.every(c=>c.preference==='not_ranked'));
});
test('Geju core difference alone is not asserted a conflict',()=>{
 const r=analyzeR012(fixture());assert(r.rawCandidates.every(c=>c.status==='screen_candidate'));
});
test('Confirmed harm to xiangshen attaches only to affected element',()=>{
 const x=fixture();x.comparisons=[{element:'水',target:'XIANGSHEN',targetId:'ACT-1',state:'confirmed_harm',approvedByRule:'HARM_APPROVED',evidenceIds:['E:HARM']}];
 const r=analyzeR012(x);assert.equal(r.rawCandidates.find(c=>c.element==='水')?.status,'harm_observed');
 assert.equal(r.rawCandidates.find(c=>c.element==='木')?.status,'screen_candidate');
});
test('Possible harm remains pending, not automatically confirmed',()=>{
 const x=fixture();x.comparisons=[{element:'木',target:'GEJU_CORE',targetId:'CORE-1',state:'possible_harm',approvedByRule:null,evidenceIds:['E:POSSIBLE']}];
 const r=analyzeR012(x);assert.equal(r.rawCandidates.find(c=>c.element==='木')?.status,'harm_review');
});
test('Cleared edge retains candidate, does not make final yongshen',()=>{
 const x=fixture();x.comparisons=[{element:'水',target:'XIANGSHEN',targetId:'A1',state:'cleared',approvedByRule:'HARM_APPROVED',evidenceIds:['E:CLEAR']}];
 const r=analyzeR012(x);assert.equal(r.rawCandidates.find(c=>c.element==='水')?.status,'screen_candidate');
 assert.equal(r.fuyiYongshen,null);
});
test('Unauthorized strength cannot be marked approved',()=>{
 const x=fixture();x.strength.approvedByRule='BOGUS';assert.throws(()=>analyzeR012(x),/UNTRUSTED_STRENGTH/);
});
test('Unauthorized special clearance cannot unlock fuyi',()=>{
 const x=fixture();x.special.approvedByRule='BOGUS';assert.throws(()=>analyzeR012(x),/UNTRUSTED_SPECIAL/);
});
test('Untrusted confirmed harm rejected',()=>{
 const x=fixture();x.comparisons=[{element:'木',target:'XIANGSHEN',targetId:'A1',state:'confirmed_harm',approvedByRule:'FAKE',evidenceIds:['E']}];
 assert.throws(()=>analyzeR012(x),/UNTRUSTED_COMPARISON/);
});
test('Duplicate comparison ID rejected',()=>{
 const x=fixture();const d:DependencyComparison={element:'水',target:'GEJU_CORE',targetId:'A',state:'possible_harm',approvedByRule:null,evidenceIds:[]};
 x.comparisons=[d,d];assert.throws(()=>analyzeR012(x),/BAD_COMPARISON/);
});
test('Corrupt R011 input rejected',()=>{
 const x=fixture();x.r011={...x.r011,ruleId:'BOGUS' as 'R-011'};
 assert.throws(()=>analyzeR012(x),/BAD_UPSTREAM/);
});
test('Unvalidated upstream blocked',()=>{
 const x=fixture();x.upstreamValidated=false;assert.throws(()=>analyzeR012(x),/BAD_UPSTREAM/);
});
test('Missing version blocked',()=>{
 const x=fixture();x.upstreamVersions.R006='';assert.throws(()=>analyzeR012(x),/MISSING_VERSION/);
});
test('Same inputs yield stable deterministic result',()=>{
 const x=fixture('辛','strong','PEER_HEAVY');assert.deepEqual(analyzeR012(x),analyzeR012(x));
});
test('Cannot convert element candidate into a single stem recommendation',()=>{
 const x=fixture('甲','weak');const r=analyzeR012(x);
 assert.equal(r.singleRecommendedElement,null);assert.equal(r.modelMayClaimFinal,false);
});
console.log(`ALL PASS: ${passed} groups; 50 relation mappings + 20 strength scenarios inside tests.`);
