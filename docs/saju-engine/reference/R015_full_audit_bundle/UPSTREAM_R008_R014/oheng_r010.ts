/**
 * 오행 친구들 / R-010 격국 성패·파격·구응·겸격 '후보 평가' 참조 엔진.
 *
 * 주의: 이 모듈은 고전적 해석 체계의 규칙 적용을 기록한다.
 * 길흉, 미래, 건강, 직업의 사실 판단이나 격국 최종 확정을 하지 않는다.
 * 해석 효력(value=true/false)은 전문가 승인된 외부 규칙이 제공해야 한다.
 * 존재(present)만으로 효력(effectiveness)을 추정하지 않는다.
 */
import type {R008Result, Pillars} from './oheng_r008';
import type {R009Result} from './oheng_r009';

export type Pattern =
  | 'OFFICER' | 'WEALTH' | 'RESOURCE' | 'FOOD' | 'KILLING'
  | 'HURTING' | 'YANG_BLADE' | 'JIANLU_YUEJIE';
export type SignalState = 'confirmed'|'absent'|'unknown';
export interface Signal {
  key: string;
  state: SignalState;
  evidenceIds: string[];
  approvedByRule: string | null; // null -> 검증되지 않음(무조건 unknown 처리)
}
export interface PatternCandidate {
  candidateId: string;
  pattern: Pattern;
  origin: 'R-007'|'R-008'|'R-009';
  evidenceIds: string[];
}
export interface R010Input {
  pillars: Pillars;
  r008: R008Result;
  r009: R009Result;
  candidates: PatternCandidate[];
  signals: Signal[];
  /** 계산 및 승인 여부. 미완료/미검증인 때는 후보 관찰만 허용 */
  upstreamValidated: boolean;
}

type RouteKind = 'establish'|'obstruct'|'rescue';
interface Route {
  id: string;
  pattern: Pattern;
  kind: RouteKind;
  /** 모든 키가 검증된 참일 때만 발동 */
  needs: readonly string[];
  /** 구응은 자신이 처리하려는 파격 규칙을 정확히 참조해야 함 */
  counters?: string;
  /** 고전 문헌의 해당 장 또는 후속 승인 정책 */
  sourceId: string;
}

/**
 * 문헌의 '관계'를 표현하는 테스트용 규칙집.
 * 모든 ..._effective 신호는 외부 검증 없이는 unknown이므로 자연히 결론 유보.
 * 이 규칙 자체는 운영 승인 전(DRAFT)이므로 최종 성격/파격 확정을 반환하지 않는다.
 */
export const R010_ROUTES: readonly Route[] = [
  {id:'O-EST-01', pattern:'OFFICER', kind:'establish',needs:['wealth_supports_officer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'O-EST-02', pattern:'OFFICER', kind:'establish',needs:['resource_protects_officer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'O-OBS-01', pattern:'OFFICER', kind:'obstruct',needs:['hurting_officer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'O-OBS-02', pattern:'OFFICER', kind:'obstruct',needs:['officer_mixed_with_killing_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'O-RES-01', pattern:'OFFICER', kind:'rescue',needs:['resource_restrains_hurting_effective'],counters:'O-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},
  {id:'O-RES-02', pattern:'OFFICER', kind:'rescue',needs:['killing_combined_away_effective'],counters:'O-OBS-02',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'W-EST-01', pattern:'WEALTH',kind:'establish',needs:['wealth_generates_officer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'W-EST-02', pattern:'WEALTH',kind:'establish',needs:['food_generates_wealth_effective','day_strength_supports_food_wealth'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'W-OBS-01', pattern:'WEALTH',kind:'obstruct',needs:['wealth_robbed_by_peer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'W-OBS-02', pattern:'WEALTH',kind:'obstruct',needs:['wealth_drains_to_uncontrolled_killing'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'W-RES-01', pattern:'WEALTH',kind:'rescue',needs:['food_transforms_peer_to_wealth_effective'],counters:'W-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},
  {id:'W-RES-02', pattern:'WEALTH',kind:'rescue',needs:['killing_restrained_effective'],counters:'W-OBS-02',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'I-EST-01', pattern:'RESOURCE',kind:'establish',needs:['officer_resource_chain_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'I-EST-02', pattern:'RESOURCE',kind:'establish',needs:['weak_resource_supported_by_killing_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'I-OBS-01', pattern:'RESOURCE',kind:'obstruct',needs:['wealth_damages_needed_resource_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'I-RES-01', pattern:'RESOURCE',kind:'rescue',needs:['peer_restrains_wealth_to_save_resource_effective'],counters:'I-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'F-EST-01', pattern:'FOOD',kind:'establish',needs:['food_generates_wealth_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'F-EST-02', pattern:'FOOD',kind:'establish',needs:['food_controls_killing_effective','wealth_not_feed_killing_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'F-OBS-01', pattern:'FOOD',kind:'obstruct',needs:['indirect_resource_harms_food_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'F-RES-01', pattern:'FOOD',kind:'rescue',needs:['wealth_restrains_indirect_resource_effective'],counters:'F-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'K-EST-01', pattern:'KILLING',kind:'establish',needs:['day_strong_approved','food_controls_killing_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'K-EST-02', pattern:'KILLING',kind:'establish',needs:['killing_transforms_through_resource_effective'],sourceId:'ZPZQ_PIAN_GUAN'},
  {id:'K-OBS-01', pattern:'KILLING',kind:'obstruct',needs:['wealth_feeds_uncontrolled_killing_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'K-RES-01', pattern:'KILLING',kind:'rescue',needs:['food_controls_killing_effective'],counters:'K-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'H-EST-01', pattern:'HURTING',kind:'establish',needs:['hurting_generates_wealth_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'H-EST-02', pattern:'HURTING',kind:'establish',needs:['hurting_balanced_by_rooted_resource_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'H-OBS-01', pattern:'HURTING',kind:'obstruct',needs:['hurting_officer_unmitigated_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'H-RES-01', pattern:'HURTING',kind:'rescue',needs:['wealth_mediates_hurting_officer_effective'],counters:'H-OBS-01',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'B-EST-01', pattern:'YANG_BLADE',kind:'establish',needs:['officer_or_killing_controls_blade_effective','wealth_resource_support_balanced'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'B-OBS-01', pattern:'YANG_BLADE',kind:'obstruct',needs:['blade_control_absent_confirmed'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'B-OBS-02', pattern:'YANG_BLADE',kind:'obstruct',needs:['hurting_damages_blade_officer_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'B-RES-01', pattern:'YANG_BLADE',kind:'rescue',needs:['resource_protects_blade_officer_effective'],counters:'B-OBS-02',sourceId:'ZPZQ_CHENG_BAI'},

  {id:'L-EST-01', pattern:'JIANLU_YUEJIE',kind:'establish',needs:['officer_supported_by_wealth_resource_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'L-EST-02', pattern:'JIANLU_YUEJIE',kind:'establish',needs:['wealth_supported_by_output_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'L-EST-03', pattern:'JIANLU_YUEJIE',kind:'establish',needs:['killing_controlled_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'L-OBS-01', pattern:'JIANLU_YUEJIE',kind:'obstruct',needs:['officer_damaged_in_jianlu_effective'],sourceId:'ZPZQ_CHENG_BAI'},
  {id:'L-RES-01', pattern:'JIANLU_YUEJIE',kind:'rescue',needs:['hurting_combined_away_effective'],counters:'L-OBS-01',sourceId:'ZPZQ_CHENG_BAI'}
];

export type ResultStatus = 'establish_candidate'|'obstruct_candidate'|'rescue_candidate'|'mixed_unresolved'|'insufficient_evidence';
export interface PatternReview {
  candidateId: string;
  pattern: Pattern;
  status: ResultStatus;
  establishedRoutes: string[];
  obstructedRoutes: string[];
  rescuedLinks: {obstruction: string; rescue: string}[];
  pendingRoutes: string[];
  unresolvedObstructions: string[];
  evidenceIds: string[];
  /** 운영 승인 전이므로 R-010은 finalPattern을 확정하지 않는다 */
  finalApproved: false;
}
export interface R010Result {
  ruleId: 'R-010';
  version: 'DRAFT-1';
  stage: 'candidate_review';
  reviews: PatternReview[];
  coPattern: {candidateIds: string[]; relation: 'multiple_candidates_review'; harmony: 'not_evaluated'};
  finalPattern: null;
  finalSuccess: null;
  specialReviewRequired: boolean;
  specialCandidates: string[];
  modelMayClaimEstablished: false;
  outstandingDependencies: string[];
}

function evalRoute(route:Route, signalMap:Map<string,Signal>): 'satisfied'|'failed'|'pending' {
  let hasUnknown=false;
  for(const key of route.needs){
    const s=signalMap.get(key);
    if(!s || s.state==='unknown' || !s.approvedByRule){hasUnknown=true;continue;}
    if(s.state==='absent') return 'failed';
  }
  return hasUnknown?'pending':'satisfied';
}

function unique(values:string[]):string[]{return [...new Set(values)];}

export function analyzeR010(input:R010Input):R010Result {
  const {pillars,r008,r009,upstreamValidated,candidates,signals}=input;
  if (!upstreamValidated) throw new Error('R010_UPSTREAM_UNVALIDATED');
  if (r008.monthBranch!==pillars.month.branch ||
      r009.month_branch!==pillars.month.branch ||
      r009.day_stem!==pillars.day.stem) throw new Error('R010_DEPENDENCY_MISMATCH');
  if (r008.finalPattern!==null || r009.final_pattern!==null) throw new Error('R010_UPSTREAM_UNEXPECTED_FINAL');
  const cIds=candidates.map(c=>c.candidateId);
  if (cIds.some(id=>!id) || new Set(cIds).size!==cIds.length) throw new Error('R010_BAD_CANDIDATES');
  const signalMap=new Map<string,Signal>();
  for(const s of signals){
    if (!s.key || signalMap.has(s.key)) throw new Error('R010_DUPLICATE_SIGNAL');
    if (s.state!=='unknown' && (!s.approvedByRule || !s.evidenceIds.length))
      throw new Error('R010_UNVERIFIED_EFFECTIVENESS');
    signalMap.set(s.key,s);
  }

  const reviews:PatternReview[] = candidates.map(c=>{
    const relevant=R010_ROUTES.filter(r=>r.pattern===c.pattern);
    const satisfied=relevant.filter(r=>evalRoute(r,signalMap)==='satisfied');
    const pending=relevant.filter(r=>evalRoute(r,signalMap)==='pending');
    const established=satisfied.filter(r=>r.kind==='establish');
    const obstructed=satisfied.filter(r=>r.kind==='obstruct');
    const rescued=satisfied.filter(r=>r.kind==='rescue');
    const resolved=rescued.flatMap(r=>(obstructed.some(o=>o.id===r.counters) && r.counters)
      ? [{obstruction:r.counters!,rescue:r.id}]:[]);
    const unresolved=obstructed.filter(o=>!resolved.some(r=>r.obstruction===o.id)).map(r=>r.id);

    let status:ResultStatus='insufficient_evidence';
    if(established.length && unresolved.length) status='mixed_unresolved';
    else if(established.length && resolved.length) status='rescue_candidate';
    else if(established.length && !obstructed.length) status='establish_candidate';
    else if(unresolved.length) status='obstruct_candidate';
    // 미확정 방해/구응이 있다면 '성립 확정'은 어떤 상황에서도 반환하지 않는다.
    const evidenceIds=unique([...c.evidenceIds,...satisfied.flatMap(r=>r.needs.flatMap(k=>signalMap.get(k)?.evidenceIds??[]))]);
    return {candidateId:c.candidateId,pattern:c.pattern,status,
      establishedRoutes:established.map(r=>r.id),obstructedRoutes:obstructed.map(r=>r.id),
      rescuedLinks:resolved,pendingRoutes:pending.map(r=>r.id),
      unresolvedObstructions:unresolved,evidenceIds,finalApproved:false};
  });
  const specialCandidates=r009.candidates
    .filter(c=>c.code.startsWith('FOLLOW_') || c.code==='FAKE_FOLLOW_REVIEW')
    .map(c=>c.code);
  return {ruleId:'R-010',version:'DRAFT-1',stage:'candidate_review',reviews,
    coPattern:{candidateIds:cIds,relation:'multiple_candidates_review',harmony:'not_evaluated'},
    finalPattern:null,finalSuccess:null,specialReviewRequired:specialCandidates.length>0,
    specialCandidates,modelMayClaimEstablished:false,
    outstandingDependencies:unique([
      'R-006:승인된 강약·세력 조건 필요',
      'R-008:투간·회지·합화 효력 검증 필요',
      'R-009:특수격·종격의 성립 미확정',
      'R-010:성패구응 해석 규칙 전문가 승인 필요',
      'R-011:상신 유효성·격국용신 판단 별도',
    ])};
}
