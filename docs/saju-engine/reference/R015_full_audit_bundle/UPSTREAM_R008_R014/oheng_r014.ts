/**
 * OHENG FRIENDS R-014 DRAFT-1: auditable, scope-preserving integration.
 * Conservative by design: R-011/12/13 upstream modules do not approve a final
 * yongshen, so R-014 cannot promote them to a final decision.
 * Source traditions: 子平真詮 用神/相神/成敗救應, 滴天髓 衰旺,
 * 窮通寶鑑 (month-by-month), 神峰通考 病藥. No empirical prediction claim.
 * THIS CODE IS A REFERENCE IMPLEMENTATION, NOT A PRODUCTION APPROVAL SERVICE.
 */
import type {R011Result} from './oheng_r011';
import type {R012Result, Element, Stem} from './oheng_r012';
import {ELEMENT_OF} from './oheng_r012';
import type {R013Result} from './oheng_r013';

type Domain='GEJU'|'FUYI'|'CLIMATE'|'TONGGUAN'|'BINGYAO';
type Scope='pattern_core'|'xiangshen'|'balance_adjustment'|'climate_reference'|'channel_bridge'|'disease_remedy';
type ValueKind='pattern'|'stem'|'element'|'actor';
type EvidenceStatus='historical_reference'|'structural_candidate'|'conditional_candidate'|'requires_review';
type Verdict='pending_review'|'conflict_review'|'blocked';
export interface TraceRef { sourceRule:string; version:string; evidenceIds:string[]; sourceNodeIds?:string[]; }
export interface Recommendation {
  id:string;domain:Domain;scope:Scope;kind:ValueKind;value:string;
  evidenceStatus:EvidenceStatus;trace:TraceRef[];
  conditions:string[]; blockers:string[];
  /** A method-specific proposal is never intrinsically a worldwide best 'element'. */
  finalApproved:false;
}
export type ReviewState='potential_harm'|'confirmed_harm'|'cleared'|'unknown';
export interface CrossMethodReview {
  id:string;
  leftId:string;rightId:string;
  state:ReviewState;
  /** Verified within the cited theory, NOT empirical causal evidence. */
  approvedByRule:string|null;
  evidenceIds:string[];
  note:string;
}
export interface R014Input {
  r011:R011Result;r012:R012Result;r013:R013Result;
  /** Expected R001..R013 policy/data versions, hashed or immutable in production. */
  manifest:Record<string,string>;
  /** Validated by backend, NOT untrusted end-user input. */
  registrySnapshot:{approvedRuleIds:readonly string[];validatedByServer:boolean};
  canonicalChartId:string; chartValidated:boolean;
  crossMethodReviews:CrossMethodReview[];
}
export interface ReviewFinding {id:string;state:ReviewState;leftId:string;rightId:string;note:string;evidenceIds:string[];}
export interface R014Result {
  ruleId:'R-014';version:'DRAFT-1';chartId:string;
  status:Verdict;recommendations:Recommendation[];
  findings:ReviewFinding[];reviewReasons:string[];
  methodSummaries:Record<Domain,{count:number;referenceOnly:number;candidateCount:number}>;
  /** Deliberate nulls: earlier rule approvals are basic policies only. */
  finalYongshen:null;singleBestElement:null;finalGeju:null;finalApproval:false;
  noMajorityVote:true;sourceManifest:Record<string,string>;
}
const uniq=(v:string[])=>[...new Set(v)].sort();
const clean=(x:string)=>x.replaceAll('|','%7C').replaceAll(':','%3A');
const id=(...parts:string[])=>parts.map(clean).join(':');
const trace=(sourceRule:string,version:string,evidenceIds:string[],sourceNodeIds?:string[]):TraceRef=>({
  sourceRule,version,evidenceIds:uniq(evidenceIds),...(sourceNodeIds?.length?{sourceNodeIds:uniq(sourceNodeIds)}:{})
});
const METHODS:Domain[]=['GEJU','FUYI','CLIMATE','TONGGUAN','BINGYAO'];
export function analyzeR014(i:R014Input):R014Result {
  if(!i.canonicalChartId||!i.r011||!i.r012||!i.r013||!Array.isArray(i.crossMethodReviews))
    throw new Error('R014_BAD_INPUT');
  if(i.r011.ruleId!=='R-011'||i.r012.ruleId!=='R-012'||i.r013.ruleId!=='R-013')
    throw new Error('R014_BAD_SOURCE_KIND');
  if(i.r012.dayStem!==i.r013.climate.index.dayStem ||
     i.r013.climate.index.key!==`${i.r012.dayStem}${i.r013.climate.index.monthBranch}`)
    throw new Error('R014_CHART_INCONSISTENT');
  if(!Object.hasOwn(ELEMENT_OF,i.r012.dayStem as Stem))throw new Error('R014_BAD_DAY_STEM');
  const manifest:Record<string,string>={};
  for(let n=1;n<=13;n++){
    const k=`R${String(n).padStart(3,'0')}`;
    if(!i.manifest[k]||!i.manifest[k].trim())throw new Error(`R014_MISSING_MANIFEST:${k}`);
    manifest[k]=i.manifest[k];
  }
  if(manifest.R011!==i.r011.version||manifest.R012!==i.r012.version||manifest.R013!==i.r013.version)
    throw new Error('R014_SOURCE_VERSION_MISMATCH');
  if(i.r011.gejuYongshen!==null || i.r011.finalXiangshen!==null ||
    i.r012.fuyiYongshen!==null || i.r012.singleRecommendedElement!==null ||
    i.r013.finalYongshen!==null || i.r013.climateYongshen!==null ||
    i.r013.tongguanYongshen!==null || i.r013.bingyaoYongshen!==null)
    throw new Error('R014_UNEXPECTED_UPSTREAM_FINAL');

  const rec:Recommendation[]=[];
  const add=(p:Recommendation)=>{if(rec.some(x=>x.id===p.id))throw new Error('R014_DUPLICATE_RECOMMENDATION');rec.push(p);};
  for(const x of i.r011.gejuCoreCandidates){
    add({id:id('G',x.candidateId),domain:'GEJU',scope:'pattern_core',kind:'pattern',value:x.pattern,
      evidenceStatus:'structural_candidate',trace:[trace('R-011',i.r011.version,[x.candidateId])],
      conditions:['R-010 격국 성패 검증','R-011 격국용신의 역할 확정'],
      blockers:['격국 중심은 오행 투표에 포함하지 않음'],finalApproved:false});
  }
  for(const x of i.r011.xiangCandidates){
    add({id:id('X',x.candidateId,x.actorId),domain:'GEJU',scope:'xiangshen',kind:'actor',value:x.actorValue,
      evidenceStatus:x.qualifyingRoutes.length?'conditional_candidate':'requires_review',
      trace:[trace('R-011',i.r011.version,x.evidenceIds,[x.actorId])],
      conditions:uniq([...x.supportingRoutes.map(r=>`성립/구응 경로:${r}`),'상신의 필수성 검증']),
      blockers:uniq([...x.unresolvedPatternObstructions,...x.pendingDamageIds.map(r=>`파상신 후보:${r}`),
        ...x.damageIds.map(r=>`상신 손상 검토:${r}`),...x.pendingRoutes.map(r=>`미검증 경로:${r}`)]),finalApproved:false});
  }
  for(const x of i.r012.rawCandidates){
    add({id:id('F',x.element),domain:'FUYI',scope:'balance_adjustment',kind:'element',value:x.element,
      evidenceStatus:'conditional_candidate',trace:[trace('R-012',i.r012.version,x.evidenceIds)],
      conditions:uniq([`강약:${i.r012.strength}`,`십성 범주:${x.family}`,`후보 등급:${x.preference}`]),
      blockers:uniq([...x.limitations,...(x.status==='harm_observed'?['격국 또는 상신 손상 관계 확인됨']:[]),
        ...(x.status==='harm_review'?['격국 또는 상신 손상 가능성']:[])]),finalApproved:false});
  }
  // R-013 monthly terms are NOT confirmed recommendations; reference-only.
  for(const stem of uniq(i.r013.climate.historicalCandidates)){
    add({id:id('C',i.r013.climate.index.key,stem),domain:'CLIMATE',scope:'climate_reference',kind:'stem',value:stem,
      evidenceStatus:'historical_reference',trace:[trace('R-013',i.r013.version,[i.r013.climate.index.key])],
      conditions:['원문 120항목 개별 교감','역할/서열/월내 구간/한난조습 진단 승인'],
      blockers:uniq(['역사적 언급은 조후용신 선정 결과가 아님',...i.r013.climate.unresolved]),finalApproved:false});
  }
  for(const x of i.r013.tongguan){
    add({id:id('T',x.edgeId,x.mediator),domain:'TONGGUAN',scope:'channel_bridge',kind:'element',value:x.mediator,
      evidenceStatus:x.pathStatus==='actor_present_review'?'conditional_candidate':'requires_review',
      trace:[trace('R-013',i.r013.version,x.evidenceIds,x.mediatorActorIds)],
      conditions:[`극제 관계:${x.attacker}克${x.target}`,`매개 경로:${x.attacker}→${x.mediator}→${x.target}`],
      blockers:[x.pathStatus==='theoretical_only'?'매개 요소가 원국에서 확인되지 않음':'매개 효력 미확정'],finalApproved:false});
  }
  for(const x of i.r013.bingyao){
    if(!x.medicineElement)continue;
    add({id:id('B',x.issueId,x.medicineElement),domain:'BINGYAO',scope:'disease_remedy',kind:'element',value:x.medicineElement,
      evidenceStatus:x.state==='possible_remedy_review'?'conditional_candidate':'requires_review',
      trace:[trace('R-013',i.r013.version,x.evidenceIds,x.medicineActorIds)],
      conditions:[`구체적 문제:${x.issueId}`,`검토 경로:${x.harmfulElement}→${x.medicineElement}`],
      blockers:[x.state==='unverified_issue'?'문제 구조 자체가 승인되지 않음':'문제 해결 효력 미검증'],finalApproved:false});
  }
  rec.sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const recIds=new Set(rec.map(x=>x.id));
  const seenReview=new Set<string>();const findings:ReviewFinding[]=[];
  for(const r of i.crossMethodReviews){
    if(!r.id||seenReview.has(r.id)||r.leftId===r.rightId||!recIds.has(r.leftId)||!recIds.has(r.rightId))
      throw new Error('R014_BAD_REVIEW_REFERENCE');
    seenReview.add(r.id);
    const l=rec.find(x=>x.id===r.leftId)!,right=rec.find(x=>x.id===r.rightId)!;
    if(l.domain===right.domain)throw new Error('R014_REVIEW_NOT_CROSS_METHOD');
    if(['confirmed_harm','cleared'].includes(r.state)){
      if(!i.registrySnapshot.validatedByServer || !r.approvedByRule ||
         !i.registrySnapshot.approvedRuleIds.includes(r.approvedByRule) || !r.evidenceIds.length)
        throw new Error('R014_UNTRUSTED_REVIEW');
    } else if(r.approvedByRule!==null)throw new Error('R014_UNAPPROVED_REVIEW_WITH_RULE');
    findings.push({id:r.id,state:r.state,leftId:r.leftId,rightId:r.rightId,
      note:r.note,evidenceIds:uniq(r.evidenceIds)});
  }
  findings.sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const reviewReasons=uniq([
    ...(!i.chartValidated?['원국 또는 선행 자료의 검증 미완료']:[]),
    ...(!i.registrySnapshot.validatedByServer?['서버 승인 정책 레지스트리 미검증']:[]),
    ...(i.r012.status!=='await_R014'?[`R-012 단계:${i.r012.status}`]:[]),
    ...(i.r013.status!=='review_required'?['R-013 상태 확인 필요']:[]),
    ...i.r011.unresolvedDependencies,
    ...i.r012.reviewReasons,
    ...i.r013.blockReasons,
    ...i.r013.climate.unresolved,
    ...(i.r013.climate.index.sourceTier!=='primary_text_checked'?['조후 원전 대조 미완료']:[]),
    ...i.r011.unboundSupportingRoutes.map(x=>`상신 근거 주체 미연결:${x.candidateId}/${x.routeId}`),
    ...findings.filter(x=>x.state==='potential_harm'||x.state==='confirmed_harm'||x.state==='unknown')
      .map(x=>`이론 간 관계 검토:${x.id} (${x.state})`),
    'R-014 목적별 우선순위/대체 가능성 승인 규칙 미완료',
    '선행 모듈에 운영 승인된 최종 용신 없음'
  ]);
  const methodSummaries={} as R014Result['methodSummaries'];
  for(const method of METHODS){const x=rec.filter(r=>r.domain===method);
    methodSummaries[method]={count:x.length,
      referenceOnly:x.filter(r=>r.evidenceStatus==='historical_reference').length,
      candidateCount:x.filter(r=>r.evidenceStatus!=='historical_reference').length};
  }
  const status:Verdict=(!i.chartValidated||!i.registrySnapshot.validatedByServer)?'blocked':
    findings.some(x=>x.state==='confirmed_harm'||x.state==='potential_harm')?'conflict_review':'pending_review';
  return {ruleId:'R-014',version:'DRAFT-1',chartId:i.canonicalChartId,status,
    recommendations:rec,findings,reviewReasons,methodSummaries,
    finalYongshen:null,singleBestElement:null,finalGeju:null,finalApproval:false,
    noMajorityVote:true,sourceManifest:manifest};
}
