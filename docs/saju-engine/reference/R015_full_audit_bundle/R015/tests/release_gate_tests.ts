import {evaluateRelease, type ReleaseInput, type RuleEvidence, type RuleId} from '../src/release_gate';
const eq=(a:unknown,b:unknown,msg:string)=>{if(a!==b)throw new Error(`${msg}: ${String(a)} != ${String(b)}`)};
const yes=(ok:boolean,msg:string)=>{if(!ok)throw new Error(msg)};
const GOOD_DIGEST='a'.repeat(64);
const rules:RuleEvidence[]=Array.from({length:14},(_,i)=>({id:`R-${String(i+1).padStart(3,'0')}` as RuleId,
 policyAccepted:true,implementation:'production',automatedTests:'verified',expertReview:'verified',ruleDigest:GOOD_DIGEST,blockers:[]}));
const make=(product:ReleaseInput['contract']['product']='paid_basic_saju'):ReleaseInput=>({
 issuedByTrustedBackend:true,
 rules:rules.map(x=>({...x,blockers:[]})),
 calendar:{utcConversionVerified:true,historicalTimezoneTested:true,solarTermInstantsVerified:true,
 termSourceIndependentComparison:true,leapAndBoundaryCasesTested:true,dayBoundaryPolicyApproved:true,
 hourBoundaryPolicyApproved:true,locationAndSolarTimePolicyApproved:true,calendarFixtureDigest:'verified-hash'},
 security:{jwtVerifiedOnServer:true,rlsAndGrantsTested:true,userIsolationTested:true,
 serviceSecretsServerOnly:true,promptAndResultAccessControlled:true,noUserControlledRuleApprovals:true,
 inputAndRateLimitsTested:true,accountDeletionTested:true},
 commerce:{paymentWebhookSignatureVerified:true,creditIdempotencyTested:true,noNegativeBalanceTested:true,
 refundAndDoubleSpendTested:true,entitlementServerEnforced:true},
 contract:{product,requiredRules:product==='free_character'?['R-001','R-002']:
   Array.from({length:14},(_,i)=>`R-${String(i+1).padStart(3,'0')}` as RuleId),
 requiredResultClaims:product==='free_character'?['element_character']:['validated_interpretation'],
 characterMappingApproved:true,aiClaimWhitelistTested:true,paid:product!=='free_character'},
 migrationAndRlsTestsPassed:true,integrationTestsPassed:true,rollbackDrillPassed:true
});
let tests=0;
function test(label:string,run:()=>void){run();tests++;console.log(`PASS ${String(tests).padStart(2,'0')} ${label}`)}
test('paid passes only with complete synthetic evidence',()=>eq(evaluateRelease(make()).status,'GO','go'));
test('free becomes scoped limited go',()=>eq(evaluateRelease(make('free_character')).status,'LIMITED_GO','free'));
test('no trust -> no go',()=>{const x=make();x.issuedByTrustedBackend=false;eq(evaluateRelease(x).status,'NO_GO','trust')});
test('reference code cannot be released',()=>{const x=make();x.rules[0].implementation='reference';yes(evaluateRelease(x).blockers.some(b=>b.id==='rule.implementation.R-001'),'reference')});
test('no expert -> no go',()=>{const x=make();x.rules[2].expertReview='missing';eq(evaluateRelease(x).status,'NO_GO','expert')});
test('draft solar term date API is insufficient',()=>{const x=make();x.calendar.solarTermInstantsVerified=false;yes(evaluateRelease(x).blockers.some(b=>b.id==='calendar.solarTermInstantsVerified'),'terms')});
test('IANA historic timezone untested blocks',()=>{const x=make();x.calendar.historicalTimezoneTested=false;eq(evaluateRelease(x).status,'NO_GO','timezone')});
test('manifest checksum required',()=>{const x=make();x.rules[0].ruleDigest='v1';eq(evaluateRelease(x).status,'NO_GO','checksum')});
test('duplicate rule id rejected',()=>{const x=make();x.rules=[...x.rules,{...x.rules[0]}];yes(evaluateRelease(x).blockers.some(b=>b.id==='manifest.duplicate'),'duplicate')});
test('missing rule metadata rejected',()=>{const x=make();x.rules=x.rules.slice(0,-1);eq(evaluateRelease(x).status,'NO_GO','missing')});
test('free has narrower dependencies',()=>{const x=make('free_character');x.rules[13].implementation='reference';eq(evaluateRelease(x).status,'LIMITED_GO','scope')});
test('free mapping must be reviewed',()=>{const x=make('free_character');x.contract.characterMappingApproved=false;eq(evaluateRelease(x).status,'NO_GO','mapping')});
test('unprotected RLS blocks payment',()=>{const x=make();x.security.rlsAndGrantsTested=false;eq(evaluateRelease(x).status,'NO_GO','rls')});
test('service secret client exposure blocks',()=>{const x=make();x.security.serviceSecretsServerOnly=false;eq(evaluateRelease(x).status,'NO_GO','secrets')});
test('payment idempotency blocks',()=>{const x=make();x.commerce.creditIdempotencyTested=false;eq(evaluateRelease(x).status,'NO_GO','ledger')});
test('unverified AI claim whitelist blocks',()=>{const x=make();x.contract.aiClaimWhitelistTested=false;eq(evaluateRelease(x).status,'NO_GO','claims')});
test('rollback missing blocks',()=>{const x=make();x.rollbackDrillPassed=false;eq(evaluateRelease(x).status,'NO_GO','rollback')});
test('non-client approval safeguard',()=>{const x=make();x.security.noUserControlledRuleApprovals=false;eq(evaluateRelease(x).status,'NO_GO','approval')});
test('final yongshen not automatically approved even on go',()=>{const x=evaluateRelease(make());eq(x.canIssueFinalYongshen,false,'yongshen')});
test('product metadata contradiction blocks',()=>{const x=make();x.contract.paid=false;eq(evaluateRelease(x).status,'NO_GO','product')});
test('per-rule blocker stops release',()=>{const x=make();x.rules[1].blockers=['사령 검증'];eq(evaluateRelease(x).status,'NO_GO','blocker')});
test('free fails core R-002 even when paid-only modules pass',()=>{const x=make('free_character');x.rules[1].automatedTests='missing';eq(evaluateRelease(x).status,'NO_GO','core')});

test('paid five-year love cannot launch without transit rules',()=>{const x=make('paid_love_fortune');x.contract.requiredResultClaims=['five_year_love'];
  yes(evaluateRelease(x).blockers.some(b=>b.id==='claim.unsupported.five_year_love'),'transit');});
test('paid five-year love cannot masquerade as general natal reading',()=>{
 const x=make('paid_love_fortune');eq(evaluateRelease(x).status,'NO_GO','missing transit');});
test('missing transitive rule dependency blocks even if owner ignores it',()=>{
 const x=make('free_character');x.contract.requiredRules=['R-002'];
 yes(evaluateRelease(x).blockers.some(b=>b.id==='dependency.missing.R-002.R-001'),'closure');});
console.log(`${tests} R015 gate tests passed (synthetic evidence only).`);
