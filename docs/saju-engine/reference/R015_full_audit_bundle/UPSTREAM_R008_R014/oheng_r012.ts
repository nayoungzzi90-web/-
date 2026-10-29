/**
 * OHENG FRIENDS · R-012 扶抑用神 — deterministic screening / audit, DRAFT-1.
 * Does NOT assert the final 用神, empirical predictive validity, or a proven
 * strength determination. Verified prerequisite judgments must come from a
 * server-side approval registry; caller-provided strings are not trusted there.
 * Source: 滴天髓 / 衰旺论; 滴天髓阐微 / 形象; 子平真诠 / 论用神.
 */
import type {R011Result} from './oheng_r011';

export type Element = '木'|'火'|'土'|'金'|'水';
export type Stem = '甲'|'乙'|'丙'|'丁'|'戊'|'己'|'庚'|'辛'|'壬'|'癸';
export type Strength = 'strong'|'weak'|'balanced'|'undetermined';
export type Family = 'PEER'|'RESOURCE'|'OUTPUT'|'WEALTH'|'OFFICER_KILLING';
export type AssessmentState = 'approved'|'candidate'|'not_evaluated';
export type Structure = 'WEALTH_HEAVY'|'KILLING_HEAVY'|'PEER_HEAVY'|'OFFICER_WEAK'|'MIXED'|'OTHER'|'UNKNOWN';
export type SpecialState = 'cleared'|'candidate'|'confirmed'|'unknown';

export const ELEMENT_OF:Record<Stem,Element> = {
  甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'
};
export const GENERATES:Record<Element,Element> = {木:'火',火:'土',土:'金',金:'水',水:'木'};
export const CONTROLS:Record<Element,Element> = {木:'土',火:'金',土:'水',金:'木',水:'火'};
export const ALL_ELEMENTS:readonly Element[]=['木','火','土','金','水'];
export const ALL_STEMS:readonly Stem[]=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

export function familyOf(dayStem:Stem, candidate:Element):Family {
  const self=ELEMENT_OF[dayStem];
  if(self===candidate) return 'PEER';
  if(GENERATES[candidate]===self) return 'RESOURCE';
  if(GENERATES[self]===candidate) return 'OUTPUT';
  if(CONTROLS[self]===candidate) return 'WEALTH';
  if(CONTROLS[candidate]===self) return 'OFFICER_KILLING';
  throw new Error('R012_BAD_ELEMENT');
}

export interface Assessment<T> {
  value:T;
  status:AssessmentState;
  /** Authorized IDs are verified by the server, not merely supplied by client. */
  approvedByRule:string|null;
  evidenceIds:string[];
}
export interface SpecialCheck {
  state:SpecialState;
  pattern:string|null;
  approvedByRule:string|null;
  evidenceIds:string[];
}
export type ComparisonState='confirmed_harm'|'possible_harm'|'cleared';
export interface DependencyComparison {
  /** Linked to R-010 / R-011 mechanisms, not a simplistic element inequality. */
  element:Element;
  target:'GEJU_CORE'|'XIANGSHEN';
  targetId:string;
  state:ComparisonState;
  approvedByRule:string|null;
  evidenceIds:string[];
}
export interface R012Input {
  dayStem:Stem;
  strength:Assessment<Strength>;
  dominantStructure:Assessment<Structure>;
  special:SpecialCheck;
  comparisons:DependencyComparison[];
  /** R-011's actual output is always candidate-level at this stage. */
  r011: Pick<R011Result,'ruleId'|'finalGeju'|'finalXiangshen'|'gejuYongshen'>;
  /** Server-side registry snapshot; real production must revalidate IDs. */
  trustedRuleIds:readonly string[];
  upstreamValidated:boolean;
  upstreamVersions:Record<'R006'|'R009'|'R010'|'R011',string>;
}
export type Preference='context_preferred'|'initial_candidate'|'not_ranked';
export type ScreenStatus='screen_candidate'|'harm_review'|'harm_observed';
export interface ElementScreen {
  element:Element;
  family:Family;
  /** The starting pool comes only from strength direction. */
  role:'support'|'adjust';
  preference:Preference;
  status:ScreenStatus;
  comparisonIds:string[];
  evidenceIds:string[];
  limitations:string[];
}
export interface R012Result {
  ruleId:'R-012';
  version:'DRAFT-1';
  status:'strength_review'|'special_review'|'candidate_review'|'await_R014';
  dayStem:Stem;
  strength:Strength;
  rawCandidates:ElementScreen[];
  reviewReasons:string[];
  provenance:string[];
  fuyiYongshen:null;
  singleRecommendedElement:null;
  finalApproval:false;
  modelMayClaimFinal:false;
}

const uniq=(values:string[]):string[]=>[...new Set(values)];
const approved=(x:{status:AssessmentState,approvedByRule:string|null,evidenceIds:string[]}, trusted:Set<string>)=>
  x.status==='approved' && !!x.approvedByRule && trusted.has(x.approvedByRule) && x.evidenceIds.length>0;

function validate(i:R012Input):void {
  if(!i.upstreamValidated || i.r011.ruleId!=='R-011' || i.r011.finalGeju!==null ||
    i.r011.finalXiangshen!==null || i.r011.gejuYongshen!==null)
    throw new Error('R012_BAD_UPSTREAM');
  if(!ALL_STEMS.includes(i.dayStem) || !i.strength || !i.dominantStructure || !i.special || !Array.isArray(i.comparisons))
    throw new Error('R012_BAD_INPUT');
  const trusted=new Set(i.trustedRuleIds);
  for(const [name,x] of [['strength',i.strength],['structure',i.dominantStructure]] as const) {
    if(x.status==='approved' && !approved(x,trusted)) throw new Error(`R012_UNTRUSTED_${name.toUpperCase()}`);
    if(x.status!=='approved' && x.approvedByRule!==null) throw new Error(`R012_BAD_${name.toUpperCase()}_STATE`);
  }
  if(['cleared','confirmed'].includes(i.special.state) &&
    (!i.special.approvedByRule || !trusted.has(i.special.approvedByRule) || !i.special.evidenceIds.length))
    throw new Error('R012_UNTRUSTED_SPECIAL');
  if(['candidate','unknown'].includes(i.special.state) && i.special.approvedByRule!==null)
    throw new Error('R012_BAD_SPECIAL_STATE');
  if(i.special.state==='confirmed' && !i.special.pattern) throw new Error('R012_MISSING_SPECIAL_PATTERN');
  const keys=new Set<string>();
  for(const edge of i.comparisons) {
    const key=`${edge.element}|${edge.target}|${edge.targetId}`;
    if(keys.has(key)||!edge.targetId||!ALL_ELEMENTS.includes(edge.element))throw new Error('R012_BAD_COMPARISON');
    keys.add(key);
    if(['confirmed_harm','cleared'].includes(edge.state) &&
      (!edge.approvedByRule || !trusted.has(edge.approvedByRule) || !edge.evidenceIds.length))
      throw new Error('R012_UNTRUSTED_COMPARISON');
    if(edge.state==='possible_harm' && edge.approvedByRule!==null)
      throw new Error('R012_BAD_COMPARISON_STATE');
  }
  for(const rule of ['R006','R009','R010','R011'] as const)
    if(!i.upstreamVersions[rule])throw new Error('R012_MISSING_VERSION');
}

function contextPref(strength:Strength, structure:Structure, family:Family):Preference {
  if(strength==='weak' && structure==='WEALTH_HEAVY' && family==='PEER')return 'context_preferred';
  if(strength==='weak' && structure==='KILLING_HEAVY' && family==='RESOURCE')return 'context_preferred';
  if(strength==='strong' && structure==='PEER_HEAVY' && family==='OUTPUT')return 'context_preferred';
  if(strength==='strong' && structure==='OFFICER_WEAK' && family==='OFFICER_KILLING')return 'context_preferred';
  return 'initial_candidate';
}

export function analyzeR012(input:R012Input):R012Result {
  validate(input);
  const trusted=new Set(input.trustedRuleIds);
  const strength=input.strength.value;
  const base={ruleId:'R-012' as const,version:'DRAFT-1' as const,dayStem:input.dayStem,
    strength, fuyiYongshen:null,singleRecommendedElement:null,
    finalApproval:false as const,modelMayClaimFinal:false as const,
    provenance:[`R006:${input.upstreamVersions.R006}`,`R009:${input.upstreamVersions.R009}`,
      `R010:${input.upstreamVersions.R010}`,`R011:${input.upstreamVersions.R011}`]};
  if(!approved(input.strength,trusted) || ['undetermined','balanced'].includes(strength)) {
    return {...base,status:'strength_review',rawCandidates:[],reviewReasons:[
      !approved(input.strength,trusted)?'R-006 강약 확정 전':'중화/미결정: 자동 억부 후보 비활성']};
  }
  if(input.special.state!=='cleared') {
    return {...base,status:'special_review',rawCandidates:[],reviewReasons:[
      `R-009 특수격 검토: ${input.special.state}${input.special.pattern?` (${input.special.pattern})`:''}`]};
  }
  const dominantApproved=approved(input.dominantStructure,trusted);
  const pool=ALL_ELEMENTS.map(element=>({element,family:familyOf(input.dayStem,element)}))
    .filter(row=>strength==='weak'?['PEER','RESOURCE'].includes(row.family):
      ['OUTPUT','WEALTH','OFFICER_KILLING'].includes(row.family));
  const rawCandidates:ElementScreen[]=pool.map(({element,family})=>{
    const comp=input.comparisons.filter(x=>x.element===element);
    const hardHarm=comp.some(x=>x.state==='confirmed_harm');
    const uncertain=comp.some(x=>x.state==='possible_harm');
    // Note: the lack of a comparison is NOT proof that the candidate is safe.
    const comprehensive=comp.some(x=>x.state==='cleared');
    return {element,family,role:strength==='weak'?'support':'adjust',
      preference:dominantApproved?contextPref(strength,input.dominantStructure.value,family):'not_ranked',
      status:hardHarm?'harm_observed':uncertain?'harm_review':'screen_candidate',
      comparisonIds:comp.map(x=>`${x.target}:${x.targetId}`),
      evidenceIds:uniq([...input.strength.evidenceIds,...(dominantApproved?input.dominantStructure.evidenceIds:[]),
        ...comp.flatMap(x=>x.evidenceIds)]),
      limitations:uniq([
        ...(!dominantApproved?['지배 세력 확정 미완료']:[]),
        ...(hardHarm?['격국 중심/상신에 승인된 손상 관계 존재']:[]),
        ...(uncertain?['격국 중심/상신 손상 여부 미확정']:[]),
        ...(!comprehensive?['격국·상신 영향의 포괄 검증 미완료']:[]),
        'R-013 조후·통관·병약 검토 전',
        'R-014 종합 충돌 검증 전'
      ])};
  });
  const reasons=uniq([
    ...(!dominantApproved?['원국의 지배 세력 검증 필요']:[]),
    ...(!input.comparisons.length?['격국용신·상신과의 구체적 충돌 검토 미실시']:[]),
    ...(rawCandidates.some(x=>x.status==='harm_observed')?['격국·상신에 미치는 확정된 손상 관계가 일부 후보에 존재']:[]),
    ...(rawCandidates.some(x=>x.status==='harm_review')?['격국·상신 손상 가능성 추가 확인 필요']:[]),
    'R-013 및 R-014의 후속 검토 필요'
  ]);
  return {...base,status:dominantApproved?'await_R014':'candidate_review',rawCandidates,reviewReasons:reasons};
}
