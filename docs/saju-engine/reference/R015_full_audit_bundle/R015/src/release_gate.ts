/** OHENG FRIENDS R-015 reference release gate. No client-provided approval is trusted. */
export type RuleId = `R-${string}`;
export type Product = 'free_character' | 'paid_basic_saju' | 'paid_love_fortune';
export type GateStatus = 'NO_GO' | 'LIMITED_GO' | 'GO';
export type Verification = 'missing' | 'reference' | 'verified';
export interface RuleEvidence {
  id: RuleId;
  policyAccepted: boolean;
  implementation: 'missing' | 'reference' | 'production';
  automatedTests: Verification;
  expertReview: Verification;
  ruleDigest: string | null; // production artifact checksum, not human version name
  blockers: readonly string[];
}
export interface CalendarEvidence {
  utcConversionVerified: boolean;
  historicalTimezoneTested: boolean;
  solarTermInstantsVerified: boolean;  // exact UTC instants, NOT dates alone
  termSourceIndependentComparison: boolean;
  leapAndBoundaryCasesTested: boolean;
  dayBoundaryPolicyApproved: boolean;
  hourBoundaryPolicyApproved: boolean;
  locationAndSolarTimePolicyApproved: boolean;
  calendarFixtureDigest: string | null;
}
export interface SecurityEvidence {
  jwtVerifiedOnServer: boolean;
  rlsAndGrantsTested: boolean;
  userIsolationTested: boolean;
  serviceSecretsServerOnly: boolean;
  promptAndResultAccessControlled: boolean;
  noUserControlledRuleApprovals: boolean;
  inputAndRateLimitsTested: boolean;
  accountDeletionTested: boolean;
}
export interface CommerceEvidence {
  paymentWebhookSignatureVerified: boolean;
  creditIdempotencyTested: boolean;
  noNegativeBalanceTested: boolean;
  refundAndDoubleSpendTested: boolean;
  entitlementServerEnforced: boolean;
}
export interface ProductContract {
  product: Product;
  requiredRules: readonly RuleId[];
  requiredResultClaims: readonly string[];
  // map must be approved if this particular product uses character mapping
  characterMappingApproved: boolean;
  aiClaimWhitelistTested: boolean;
  paid: boolean;
}
export interface ReleaseInput {
  issuedByTrustedBackend: boolean;
  rules: readonly RuleEvidence[];
  calendar: CalendarEvidence;
  security: SecurityEvidence;
  commerce: CommerceEvidence;
  contract: ProductContract;
  migrationAndRlsTestsPassed: boolean;
  integrationTestsPassed: boolean;
  rollbackDrillPassed: boolean;
}
export interface GateFinding {
  id: string;
  severity: 'critical' | 'major';
  explanation: string;
}
export interface GateResult {
  gateId: 'R-015';
  status: GateStatus;
  product: Product;
  blockers: readonly GateFinding[];
  canIssuePaidInterpretation: boolean;
  canIssueFinalYongshen: boolean; // controlled separately; current rules never authorize it
}
const fail = (id:string, explanation:string, severity:GateFinding['severity']='critical'):GateFinding =>
 ({id,explanation,severity});
const fields = (o:Record<string,unknown>, prefix:string):GateFinding[] =>
 Object.entries(o).filter(([key,value]) => key!=='calendarFixtureDigest' && value !== true)
 .map(([key])=>fail(prefix+key,`${prefix}${key} 미검증`));
const VALID_IDS = new Set(Array.from({length:14},(_,i)=>`R-${String(i+1).padStart(3,'0')}`));
const DEPENDENCIES: Record<string, readonly RuleId[]> = {
  'R-001': [], 'R-002':['R-001'], 'R-003':['R-001'],
  'R-004':['R-002','R-003'], 'R-005':['R-001','R-003'],
  'R-006':['R-002','R-003','R-004','R-005'],
  'R-007':['R-001','R-003','R-005'],
  'R-008':['R-003','R-005','R-007'],
  'R-009':['R-002','R-004','R-005','R-006','R-007','R-008'],
  'R-010':['R-005','R-006','R-008','R-009'],
  'R-011':['R-008','R-009','R-010'],
  'R-012':['R-006','R-009','R-010','R-011'],
  'R-013':['R-001','R-002','R-003','R-005','R-010','R-011','R-012'],
  'R-014':['R-001','R-011','R-012','R-013']
};
const KNOWN_CLAIMS: Record<string, readonly RuleId[]> = {
  element_character: ['R-001','R-002'],
  validated_interpretation: Array.from({length:14},(_,i)=>`R-${String(i+1).padStart(3,'0')}` as RuleId)
  // Five-year love requires NEW 대운·세운·연애운 rules; intentionally unsupported here.
};
export function evaluateRelease(input: ReleaseInput): GateResult {
  const errors:GateFinding[]=[];
  const add=(finding:GateFinding)=>{ if(!errors.some(x=>x.id===finding.id))errors.push(finding); };
  const {contract} = input;
  if(!input.issuedByTrustedBackend)add(fail('backend.trust','서버의 승인 스냅샷이 검증되지 않음'));
  if(contract.paid !== (contract.product !== 'free_character'))add(fail('contract.product','상품/유료 플래그 불일치'));
  if(!contract.requiredRules.length)add(fail('contract.empty_rules','상품 필수 규칙 누락'));
  if(!contract.requiredResultClaims.length)add(fail('contract.claims','상품 설명의 허용 판단 목록 누락'));
  const required = new Set(contract.requiredRules);
  for(const claim of contract.requiredResultClaims){
    if(!Object.hasOwn(KNOWN_CLAIMS,claim)){
      add(fail(`claim.unsupported.${claim}`,`아직 검증된 분석 모듈이 없는 상품 주장: ${claim}`));
      continue;
    }
    for(const dep of KNOWN_CLAIMS[claim])if(!required.has(dep))
      add(fail(`claim.dependency.${claim}.${dep}`,`상품 주장 ${claim}의 필수 규칙 ${dep} 누락`));
  }
  for(const ruleId of contract.requiredRules){
    if(!VALID_IDS.has(ruleId))add(fail(`dependency.unknown.${ruleId}`,'상품에서 지원하지 않는 규칙을 요구함'));
    for(const dep of DEPENDENCIES[ruleId]??[])if(!required.has(dep))
      add(fail(`dependency.missing.${ruleId}.${dep}`,`${ruleId}의 선행 규칙 ${dep} 누락`));
  }
  if(contract.product==='paid_love_fortune' && !contract.requiredResultClaims.includes('five_year_love'))
    add(fail('claim.missing.five_year_love','5년 연애운 상품에 세운·대운 분석의 승인 범위가 명시되지 않음'));
  const ids = input.rules.map(r=>r.id);
  if(new Set(ids).size!==ids.length)add(fail('manifest.duplicate','규칙 ID 중복'));
  for(const id of VALID_IDS)if(!ids.includes(id as RuleId))add(fail(`manifest.missing.${id}`,`${id} 메타데이터 누락`));
  for(const rule of input.rules)if(!VALID_IDS.has(rule.id))add(fail(`manifest.unknown.${rule.id}`,'지원하지 않는 규칙 ID'));
  for(const required of contract.requiredRules){
    const r=input.rules.find(x=>x.id===required);
    if(!r){add(fail(`rule.missing.${required}`,'상품 의존 규칙 누락'));continue;}
    if(!r.policyAccepted)add(fail(`rule.policy.${required}`,'기본 정책 미채택'));
    if(r.implementation!=='production')add(fail(`rule.implementation.${required}`,'운영용 구현 미완료'));
    if(r.automatedTests!=='verified')add(fail(`rule.tests.${required}`,'자동 테스트 미검증'));
    if(r.expertReview!=='verified')add(fail(`rule.expert.${required}`,'전문가 교차 검증 미완료'));
    if(!r.ruleDigest || !/^[a-f0-9]{64}$/.test(r.ruleDigest))add(fail(`rule.digest.${required}`,'불변 소스 다이제스트 누락'));
    for(const blocker of r.blockers)add(fail(`rule.blocker.${required}.${blocker}`,`미해결 항목: ${blocker}`));
  }
  for(const e of fields(input.calendar as unknown as Record<string,unknown>,'calendar.'))add(e);
  if(!input.calendar.calendarFixtureDigest)add(fail('calendar.digest','정확한 절입 시각 기준자료 다이제스트 누락'));
  for(const e of fields(input.security as unknown as Record<string,unknown>,'security.'))add(e);
  if(!input.migrationAndRlsTestsPassed)add(fail('database.migration_tests','DB 마이그레이션·RLS 테스트 미완료'));
  if(!input.integrationTestsPassed)add(fail('integration.e2e','End-to-end 테스트 미완료'));
  if(!input.rollbackDrillPassed)add(fail('operations.rollback','실제 복구 훈련 미완료'));
  if(contract.product==='free_character' && !contract.characterMappingApproved)
    add(fail('character.mapping','캐릭터 분류·공유 정책 미검증'));
  if(contract.paid){
    for(const e of fields(input.commerce as unknown as Record<string,unknown>,'commerce.'))add(e);
    if(!contract.aiClaimWhitelistTested)add(fail('ai.claims','검증된 해석 주장 화이트리스트 미검증'));
  }
  errors.sort((a,b)=>a.id.localeCompare(b.id));
  const status:GateStatus=errors.length?'NO_GO':contract.paid?'GO':'LIMITED_GO';
  return {gateId:'R-015',status,product:contract.product,blockers:errors,
    canIssuePaidInterpretation:errors.length===0&&contract.paid,
    canIssueFinalYongshen:false};
}
