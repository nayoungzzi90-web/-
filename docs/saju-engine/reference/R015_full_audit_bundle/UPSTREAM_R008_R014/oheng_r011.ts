/**
 * OHENG FRIENDS - R-011  格局用神 / 相神 (candidate and dependency tracker).
 * Version DRAFT-1. Follows R-010; does not establish a 格 or declare a final 相神.
 * Domain claims are *interpretive*, not empirically validated future predictions.
 * Source: 子平真詮 論相神緊要, 論用神成敗救應; sources indexed in the R-011 spec.
 */
import type {Pattern, R010Result} from './oheng_r010';
import type {Stem, Branch} from './oheng_r008';

export type HelperRole =
  'WEALTH' | 'OFFICER' | 'KILLING' | 'RESOURCE' | 'PEER' |
  'OUTPUT' | 'COMBINATION' | 'BRANCH_GROUP';
export type ActorType = 'stem' | 'hidden_stem' | 'branch_group' | 'interaction';
export type Effect = 'confirmed' | 'absent' | 'unknown';

export interface Actor {
  actorId: string;
  type: ActorType;
  value: string;
  family: HelperRole;
  evidenceIds: string[];
  /** 천간 및 지지 원천 고유 ID. 같은 오행/같은 천간 중복을 구별함. */
  sourceNodeIds: string[];
}

interface RoutePolicy {
  routeId: string;
  pattern: Pattern;
  allowedRoles: readonly HelperRole[];
  mechanism: 'generates'|'protects'|'controls'|'rescues'|'channels';
  sourceId: 'ZPZQ_XIANGSHEN'|'ZPZQ_CHENGBAI'|'POLICY_CANDIDATE';
}

/**
 * R-010의 확정된 효과 신호에 붙일 수 있는 '상신 후보 역할'이다.
 * 8격의 모든 성격 규칙이 곧바로 상신을 뜻하지는 않는다.
 * 해당 routeId가 목록에 없으면 R-011은 자동 선정하지 않는다.
 * COMBINATION / BRANCH_GROUP 등도 형식적 주체로 보존한다.
 */
export const ROUTE_XIANG_POLICY: readonly RoutePolicy[] = [
  {routeId:'O-EST-01',pattern:'OFFICER',allowedRoles:['WEALTH'],mechanism:'generates',sourceId:'ZPZQ_XIANGSHEN'},
  {routeId:'O-EST-02',pattern:'OFFICER',allowedRoles:['RESOURCE'],mechanism:'protects',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'O-RES-01',pattern:'OFFICER',allowedRoles:['RESOURCE','COMBINATION'],mechanism:'rescues',sourceId:'ZPZQ_XIANGSHEN'},
  {routeId:'O-RES-02',pattern:'OFFICER',allowedRoles:['COMBINATION'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'W-EST-01',pattern:'WEALTH',allowedRoles:['OFFICER'],mechanism:'protects',sourceId:'ZPZQ_XIANGSHEN'},
  {routeId:'W-EST-02',pattern:'WEALTH',allowedRoles:['OUTPUT'],mechanism:'generates',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'W-RES-01',pattern:'WEALTH',allowedRoles:['OUTPUT'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'W-RES-02',pattern:'WEALTH',allowedRoles:['OUTPUT','COMBINATION'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'I-EST-01',pattern:'RESOURCE',allowedRoles:['OFFICER'],mechanism:'generates',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'I-EST-02',pattern:'RESOURCE',allowedRoles:['KILLING'],mechanism:'generates',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'I-RES-01',pattern:'RESOURCE',allowedRoles:['PEER','COMBINATION'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'F-EST-01',pattern:'FOOD',allowedRoles:['WEALTH'],mechanism:'channels',sourceId:'ZPZQ_CHENGBAI'},
  // F-EST-02의 식신제살은 식신이 중심 그 자체일 수 있어 독립 상신을 자동 생성하지 않는다.
  {routeId:'F-RES-01',pattern:'FOOD',allowedRoles:['WEALTH'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'K-EST-01',pattern:'KILLING',allowedRoles:['OUTPUT'],mechanism:'controls',sourceId:'ZPZQ_XIANGSHEN'},
  {routeId:'K-EST-02',pattern:'KILLING',allowedRoles:['RESOURCE'],mechanism:'channels',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'K-RES-01',pattern:'KILLING',allowedRoles:['OUTPUT'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'H-EST-01',pattern:'HURTING',allowedRoles:['WEALTH'],mechanism:'channels',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'H-EST-02',pattern:'HURTING',allowedRoles:['RESOURCE'],mechanism:'controls',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'H-RES-01',pattern:'HURTING',allowedRoles:['WEALTH','COMBINATION'],mechanism:'rescues',sourceId:'POLICY_CANDIDATE'},
  {routeId:'B-EST-01',pattern:'YANG_BLADE',allowedRoles:['OFFICER','KILLING'],mechanism:'controls',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'B-RES-01',pattern:'YANG_BLADE',allowedRoles:['RESOURCE'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'L-EST-01',pattern:'JIANLU_YUEJIE',allowedRoles:['OFFICER'],mechanism:'controls',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'L-EST-02',pattern:'JIANLU_YUEJIE',allowedRoles:['OUTPUT'],mechanism:'generates',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'L-EST-03',pattern:'JIANLU_YUEJIE',allowedRoles:['OUTPUT'],mechanism:'controls',sourceId:'ZPZQ_CHENGBAI'},
  {routeId:'L-RES-01',pattern:'JIANLU_YUEJIE',allowedRoles:['COMBINATION'],mechanism:'rescues',sourceId:'ZPZQ_CHENGBAI'},
];

export interface RouteActorBinding {
  candidateId: string;
  routeId: string;
  actorId: string;
  /** 효과 확정은 R-010 신호 및 서버 승인과 구분하여 심사 */
  effect: Effect;
  approvedByRule: string | null;
  evidenceIds: string[];
}
export interface DamageEdge {
  attackId: string;
  targetActorId: string;
  kind: 'stem_combination'|'element_control'|'branch_clash'|'resource_suppression'|'other';
  effect: Effect;
  approvedByRule: string | null;
  evidenceIds: string[];
}
export interface MitigationEdge {
  mitigationId: string;
  attackId: string;
  effect: Effect;
  approvedByRule: string | null;
  evidenceIds: string[];
}

export interface R011Input {
  r010: R010Result;
  actors: Actor[];
  bindings: RouteActorBinding[];
  damages: DamageEdge[];
  mitigations: MitigationEdge[];
  /** 서버가 승인 정책 DB에서 제공한다. 클라이언트 입력을 그대로 믿어서는 안 된다. */
  trustedRuleIds: readonly string[];
  upstreamValidated: boolean;
}
export interface XiangCandidate {
  candidateId: string;
  pattern: Pattern;
  actorId: string;
  actorType: ActorType;
  actorValue: string;
  supportingRoutes: string[];
  qualifyingRoutes: string[];
  pendingRoutes: string[];
  damageIds: string[];
  pendingDamageIds: string[];
  mitigatedDamageIds: string[];
  unresolvedPatternObstructions: string[];
  evidenceIds: string[];
  status: 'candidate_pending'|'route_supported_candidate'|'damage_review_required'|'damage_supported_review'|'pattern_obstruction_review';
  indispensable: 'not_assessed';
  finalApproved: false;
}
export interface R011Result {
  ruleId: 'R-011';
  version: 'DRAFT-1';
  gejuCoreCandidates: {candidateId:string;pattern:Pattern;status:'unconfirmed'}[];
  xiangCandidates: XiangCandidate[];
  unboundSupportingRoutes: {candidateId:string; routeId:string}[];
  unresolvedDependencies: string[];
  gejuYongshen: null;
  finalXiangshen: null;
  balanceYongshen: null;
  climateYongshen: null;
  finalGeju: null;
  modelMayClaimEstablished: false;
}

function uniq(values: string[]): string[] { return [...new Set(values)]; }
function needsAuth(e: Effect, rule: string|null, evidenceIds: string[], trusted:Set<string>, context:string) {
  if (e!=='unknown' && (!rule || !trusted.has(rule) || !evidenceIds.length)) {
    throw new Error(`R011_UNTRUSTED_EFFECT:${context}`);
  }
}

export function analyzeR011(input: R011Input): R011Result {
  const {r010,actors,bindings,damages,mitigations,upstreamValidated}=input;
  if (!upstreamValidated || r010.ruleId!=='R-010' || r010.finalPattern!==null || r010.finalSuccess!==null)
    throw new Error('R011_UPSTREAM_NOT_READY');
  const trusted = new Set(input.trustedRuleIds);
  const reviewById = new Map(r010.reviews.map(r=>[r.candidateId,r]));
  const actorById = new Map(actors.map(a=>[a.actorId,a]));
  if (reviewById.size!==r010.reviews.length || actorById.size!==actors.length ||
      actors.some(a=>!a.actorId||!a.evidenceIds.length||!a.sourceNodeIds.length))
    throw new Error('R011_BAD_ACTORS_OR_CANDIDATES');
  const bindingKeys = new Set<string>();
  for (const b of bindings) {
    const key=`${b.candidateId}|${b.routeId}|${b.actorId}`;
    if(bindingKeys.has(key)) throw new Error('R011_DUPLICATE_BINDING');
    bindingKeys.add(key);
    const review=reviewById.get(b.candidateId), actor=actorById.get(b.actorId);
    const policy=ROUTE_XIANG_POLICY.find(p=>p.routeId===b.routeId && p.pattern===review?.pattern);
    if(!review || !actor || !policy || !policy.allowedRoles.includes(actor.family))
      throw new Error('R011_INVALID_BINDING');
    needsAuth(b.effect,b.approvedByRule,b.evidenceIds,trusted,`binding:${key}`);
  }
  const damageKeys = new Set<string>();
  for(const a of damages) {
    if (damageKeys.has(a.attackId) || !actorById.has(a.targetActorId)) throw new Error('R011_BAD_DAMAGE');
    damageKeys.add(a.attackId);
    needsAuth(a.effect,a.approvedByRule,a.evidenceIds,trusted,`damage:${a.attackId}`);
  }
  const mitigationKeys = new Set<string>();
  for (const m of mitigations) {
    if(mitigationKeys.has(m.mitigationId)||!damageKeys.has(m.attackId)) throw new Error('R011_BAD_MITIGATION');
    mitigationKeys.add(m.mitigationId);
    needsAuth(m.effect,m.approvedByRule,m.evidenceIds,trusted,`mitigation:${m.mitigationId}`);
  }
  const xiangCandidates: XiangCandidate[] = [];
  for (const review of r010.reviews) {
    const active = new Set([...review.establishedRoutes,...review.rescuedLinks.map(x=>x.rescue)]);
    const pending = new Set(review.pendingRoutes);
    const byActor=new Map<string,RouteActorBinding[]>();
    for (const binding of bindings.filter(b=>b.candidateId===review.candidateId)) {
      // R-010 경로가 발동했거나 심사 대기인 것만 후보로 인정한다.
      if (!active.has(binding.routeId)&&!pending.has(binding.routeId)) continue;
      const prior=byActor.get(binding.actorId)??[];prior.push(binding);byActor.set(binding.actorId,prior);
    }
    for (const [actorId, edges] of byActor) {
      const actor=actorById.get(actorId)!;
      const qualified=edges.filter(e=>active.has(e.routeId)&&e.effect==='confirmed');
      const awaiting=edges.filter(e=>pending.has(e.routeId)||e.effect==='unknown');
      const attacking=damages.filter(a=>a.targetActorId===actorId);
      const resolvedAttackIds=new Set(attacking.filter(a=>a.effect==='confirmed' &&
        mitigations.some(m=>m.attackId===a.attackId && m.effect==='confirmed')).map(a=>a.attackId));
      const effectiveDamages=attacking.filter(a=>a.effect==='confirmed'&&!resolvedAttackIds.has(a.attackId));
      const pendingDamages=attacking.filter(a=>a.effect==='unknown');
      let status:XiangCandidate['status'] = 'candidate_pending';
      if (qualified.length) status = 'route_supported_candidate';
      if (qualified.length && review.unresolvedObstructions.length) status='pattern_obstruction_review';
      if (qualified.length && pendingDamages.length) status='damage_review_required';
      if (qualified.length && effectiveDamages.length) status='damage_supported_review';
      xiangCandidates.push({candidateId:review.candidateId,pattern:review.pattern,actorId,
        actorType:actor.type,actorValue:actor.value,
        supportingRoutes:uniq(edges.map(e=>e.routeId)),
        qualifyingRoutes:uniq(qualified.map(e=>e.routeId)),
        pendingRoutes:uniq(awaiting.map(e=>e.routeId)),
        damageIds:effectiveDamages.map(a=>a.attackId),
        pendingDamageIds:pendingDamages.map(a=>a.attackId),
        mitigatedDamageIds:[...resolvedAttackIds],
        unresolvedPatternObstructions:review.unresolvedObstructions.slice(),
        evidenceIds:uniq([...actor.evidenceIds,...edges.flatMap(e=>e.evidenceIds),
          ...attacking.flatMap(a=>a.evidenceIds)]),
        status,indispensable:'not_assessed',finalApproved:false});
    }
  }
  const unboundSupportingRoutes: R011Result['unboundSupportingRoutes']=[];
  for(const review of r010.reviews) {
    const active=[...review.establishedRoutes,...review.rescuedLinks.map(x=>x.rescue)];
    for(const routeId of active) {
      const policy=ROUTE_XIANG_POLICY.find(p=>p.routeId===routeId&&p.pattern===review.pattern);
      if (policy && !bindings.some(b=>b.candidateId===review.candidateId&&b.routeId===routeId && b.effect==='confirmed'))
        unboundSupportingRoutes.push({candidateId:review.candidateId,routeId});
    }
  }
  return {
    ruleId:'R-011',version:'DRAFT-1',
    gejuCoreCandidates:r010.reviews.map(r=>({candidateId:r.candidateId,pattern:r.pattern,status:'unconfirmed'})),
    xiangCandidates,unboundSupportingRoutes,
    unresolvedDependencies:uniq([
      ...r010.outstandingDependencies,
      '상신 효력: 주체와 실제 근거의 일대일 연결 및 전문가 검증',
      '파상신·합반·합화: 독립적 유효성 판정 필요',
      'R-010 최종 성패 및 R-011 중요도 비교: 승인 전',
    ]),
    gejuYongshen:null,finalXiangshen:null,balanceYongshen:null,climateYongshen:null,
    finalGeju:null,modelMayClaimEstablished:false,
  };
}
