/**
 * OHENG FRIENDS · R-013 調候 / 通關 / 病藥 -- DRAFT-1
 * Historical-reference indexing + structural candidate detection ONLY.
 * Not final yongshen, geju, physical climate, health, or verified prediction.
 * Sources: 窮通寶鑑 ten-stem monthly chapters, 滴天髓闡微 通關,
 * 神峰通考 病藥說類. Historical reference strings are NOT production-approved.
 */
import {ALL_STEMS,ELEMENT_OF,GENERATES,CONTROLS,
  type Stem,type Element} from './oheng_r012';
export {ALL_STEMS};
export type Branch='寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥'|'子'|'丑';
export const MONTHS:readonly Branch[]=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
export type EvidenceState='approved'|'candidate'|'unknown';
export type RuleApproval = {status:EvidenceState;ruleId:string|null;evidenceIds:string[]};
export type CandidateState='historical_reference'|'review_required'|'supported_candidate';

/**
 * SECONDARY DIGEST / PROVISIONAL KEYWORDS ONLY, not authoritative 月用神.
 * Array aligns with 寅卯辰巳午未申酉戌亥子丑. Slash order is UNVERIFIED.
 * ? means summary is incomplete or corrupted: do not invent a replacement.
 * 甲酉 is overridden after checking primary text: 丁 > 丙 > 庚.
 */
const MONTHLY_REFERENCE_TOKENS:Record<Stem,string>={
  甲:'丙癸|庚丙丁戊己|庚丁壬|癸丁庚|癸丁庚|癸庚丁|庚丁壬|丁丙庚|庚甲丁壬癸|庚丁丙戊|丁庚丙|丁庚丙',
  乙:'丙癸|丙癸|癸丙戊|癸|癸丙|癸丙|丙癸己|癸丙丁|癸辛|丙戊|丙|丙',
  丙:'壬庚|壬|壬甲|壬癸庚|壬庚|壬庚|壬戊|壬癸|甲壬|甲戊壬庚|戊己壬|壬甲',
  丁:'庚甲|庚甲|甲庚戊|甲庚|庚壬癸|甲庚|庚甲乙丙戊|庚甲乙丙戊|?|甲庚戊癸|甲庚戊癸|?',
  戊:'丙甲癸|丙甲癸|甲丙癸|甲丙癸|壬甲丙|癸丙甲|丙甲|丙壬|甲丙癸|甲丙|丙甲|丙甲',
  己:'丙戊甲庚|甲癸|丙癸|癸丙|癸丙|丙癸|丙癸|丙癸|甲丙癸|丙戊甲|丙戊甲|甲丙癸',
  庚:'丙甲|丁甲庚|丁甲庚|壬戊丁|壬癸戊己|甲丁|丁甲|丁甲丙|甲壬|丙丁|丁甲丙|丁甲丙',
  辛:'己壬庚|己壬庚|?|壬甲|壬己癸|壬庚甲|壬甲戊|壬甲丁|壬甲|壬丙|丙|丙壬戊己',
  壬:'庚丙戊|戊庚辛|甲庚丙|庚辛壬癸|庚癸辛|辛甲|丁戊|甲庚|甲丙|戊甲庚|戊丙|丙甲',
  癸:'辛庚丙|庚辛|?|辛庚|庚辛丁|?|丁庚|辛丙|辛甲|庚辛戊丁|丙辛|丙丁'
};
const PRIMARY_TEXT_CHECKED = new Set(['甲寅','甲酉','乙寅','丁午','庚子','壬戌','癸寅','癸卯']);
const MONTH_CONDITION_NOTES:Record<string,string>={
  '甲寅':'초봄 잔한, 丙 온후와 癸 윤택의 구분; 丙 우선이라는 해당 원문 확인',
  '甲酉':'원문: 丁 먼저, 丙 다음, 庚 마지막. 온라인 2차 표의 우선순위와 상충',
  '乙寅':'원문: 丙 먼저, 癸 다음. 癸 과다는 오히려 丙의 역할을 제약할 수 있음',
  '丁午':'원문: 甲을 무조건 쓰지 않음; 화국·庚壬·癸 등의 조건에 따라 달라짐',
  '庚子':'원문: 丁甲을 우선 검토하고 丙의 온후 역할을 구분',
  '壬戌':'원문: 甲 중심, 丙 보조라는 조건 확인',
  '癸寅':'원문: 辛을 먼저, 丙의 온후를 함께 검토',
  '癸卯':'원문: 庚 먼저, 辛 다음; 조건에 따라 丁 등의 제약 검토',
  '甲未':'원문 판본마다 계절 내 구간 표현 확인 필요; 반월 경계 자동 환산 금지',
  '乙午':'상순·하순 조건 등장; 정확한 절입 경계 적용 정책 검증 필요',
  '乙酉':'상순·하순 조건 등장; 정확한 절입 경계 적용 정책 검증 필요',
  '壬丑':'상순·하순 요약 등장; 원문 대조 전 구간 확정 금지',
  '丁戌':'2차 표는 조후용신을 명시하지 않아 공란; 원문 확인 필요',
  '丁丑':'2차 표는 조후용신을 명시하지 않아 공란; 원문 확인 필요',
  '辛辰':'2차 표는 조후용신을 명시하지 않아 공란; 원문 확인 필요',
  '癸辰':'2차 표에 다른 월 설명 복제 가능성; 원문 확인 필요',
  '癸未':'2차 표에 구간만 나오고 천간 권고 불명; 원문 확인 필요'
};
const SPLIT_MONTHS=new Set(['甲未','乙午','乙酉','壬丑','癸辰','癸未']);
export interface MonthlyIndexEntry {
  key:string; dayStem:Stem; monthBranch:Branch;
  historicalMentionStems:Stem[];
  transcriptionComplete:boolean;
  sourceTier:'primary_text_checked'|'secondary_digest_unverified';
  sourceId:'QTBG_WIKISOURCE'|'QTBG_5IDOC_SECONDARY';
  note:string; splitPeriodNeedsReview:boolean;
  decision:'historical_index_only';
}
const STEM_SET=new Set<string>(ALL_STEMS);
export const MONTHLY_INDEX:readonly MonthlyIndexEntry[]=ALL_STEMS.flatMap(stem=>{
 const tokens=MONTHLY_REFERENCE_TOKENS[stem].split('|');
 if(tokens.length!==12)throw new Error('R013_BAD_MONTHLY_REFERENCE_LENGTH');
 return MONTHS.map((branch,idx)=>{
  const raw=tokens[idx];const key=`${stem}${branch}`;
  const result=raw==='?'?[]:[...raw].map(x=>x as Stem);
  if(result.some(x=>!STEM_SET.has(x)))throw new Error('R013_BAD_REFERENCE_STEM');
  const primary=PRIMARY_TEXT_CHECKED.has(key);
  return {key,dayStem:stem,monthBranch:branch,historicalMentionStems:result,
   transcriptionComplete:raw!=='?',sourceTier:primary?'primary_text_checked':'secondary_digest_unverified',
   sourceId:primary?'QTBG_WIKISOURCE':'QTBG_5IDOC_SECONDARY',
   note:MONTH_CONDITION_NOTES[key]??'간명 요약 색인일 뿐 원문 조건·서열·분기 대조 전에는 권장값 아님',
   splitPeriodNeedsReview:SPLIT_MONTHS.has(key),decision:'historical_index_only'};
 });
});
export function lookupMonthly(dayStem:Stem, monthBranch:Branch):MonthlyIndexEntry {
 const found=MONTHLY_INDEX.find(x=>x.dayStem===dayStem&&x.monthBranch===monthBranch);
 if(!found)throw new Error('R013_INVALID_DAY_MONTH');return found;
}

export interface ElementActor {
 id:string;element:Element;layer:'visible_stem'|'hidden_stem';
 position:'year'|'month'|'day'|'hour';evidenceIds:string[];
}
export interface ControllingEdge {
 id:string;attacker:Element;target:Element;
 evidence:RuleApproval;
}
export interface StructuralIssue {
 id:string;label:string;harmfulElement:Element;protectedElement:Element;
 evidence:RuleApproval;
}
export interface R013Input {
 dayStem:Stem;monthBranch:Branch;
 upstreamValidated:boolean;
 policyVersions:Record<'R001'|'R002'|'R003'|'R004'|'R005'|'R006'|'R007'|'R008'|'R009'|'R010'|'R011'|'R012',string>;
 actors:ElementActor[];
 climateAssessment:RuleApproval;
 materialInteractionsUnresolved:boolean;
 controllingEdges:ControllingEdge[];
 issues:StructuralIssue[];
 /** Trusted IDs MUST be supplied by server-side, tamper-proof registry. */
 trustedRuleIds:readonly string[];
}
export interface ClimateResult {
 index:MonthlyIndexEntry;
 status:'historical_lookup_only'|'climate_review';
 historicalCandidates:Stem[];
 yongshen:null;unresolved:string[];
}
export interface TongguanResult {
 edgeId:string;attacker:Element;target:Element;mediator:Element;
 mediatorActorIds:string[]; pathStatus:'theoretical_only'|'actor_present_review';
 effectiveness:'not_evaluated'; evidenceIds:string[];
}
export interface BingyaoResult {
 issueId:string;harmfulElement:Element;protectedElement:Element;
 medicineElement:Element|null; medicineActorIds:string[];
 state:'unverified_issue'|'mechanism_review_required'|'remedy_absent'|'possible_remedy_review';
 effectiveness:'not_evaluated';evidenceIds:string[];
}
export interface R013Result {
 ruleId:'R-013';version:'DRAFT-1';
 climate:ClimateResult;tongguan:TongguanResult[];bingyao:BingyaoResult[];
 status:'blocked'|'review_required';blockReasons:string[];
 climateYongshen:null;tongguanYongshen:null;bingyaoYongshen:null;
 finalYongshen:null;finalApproval:false;
}
const approved=(a:RuleApproval,trusted:Set<string>)=>a.status==='approved'&&
 !!a.ruleId&&trusted.has(a.ruleId)&&a.evidenceIds.length>0;
const unique=(xs:string[])=>[...new Set(xs)];
export function channelMediator(attacker:Element,target:Element):Element|null {
 if(CONTROLS[attacker]!==target)return null;
 // For all 5 克 pairs, 生(aggressor)→bridge→victim.
 return GENERATES[attacker];
}
export function analyzeR013(input:R013Input):R013Result {
 const entry=lookupMonthly(input.dayStem,input.monthBranch);
 const trusted=new Set(input.trustedRuleIds);
 const missing=Object.entries(input.policyVersions).filter(([,v])=>!v).map(([k])=>k);
 if(missing.length)throw new Error('R013_MISSING_VERSION:'+missing.join(','));
 const ids=new Set<string>();
 for(const a of input.actors){
  if(!a.id||ids.has(a.id)||!a.evidenceIds.length||!Object.hasOwn(GENERATES,a.element))throw new Error('R013_BAD_ACTOR');
  ids.add(a.id);
 }
 for(const e of input.controllingEdges){
  if(!e.id||CONTROLS[e.attacker]!==e.target)throw new Error('R013_BAD_EDGE');
  if(e.evidence.status==='approved'&&!approved(e.evidence,trusted))throw new Error('R013_UNTRUSTED_EDGE');
 }
 for(const x of input.issues){
  if(!x.id||x.harmfulElement===x.protectedElement)throw new Error('R013_BAD_ISSUE');
  if(x.evidence.status==='approved'&&!approved(x.evidence,trusted))throw new Error('R013_UNTRUSTED_ISSUE');
 }
 if(input.climateAssessment.status==='approved'&&!approved(input.climateAssessment,trusted))throw new Error('R013_UNTRUSTED_CLIMATE');
 const blockReasons:string[]=[];
 if(!input.upstreamValidated)blockReasons.push('unvalidated_pillars');
 if(input.materialInteractionsUnresolved)blockReasons.push('material_interactions_unresolved');
 if(entry.splitPeriodNeedsReview)blockReasons.push('month_subperiod_policy_unapproved');
 if(entry.sourceTier==='secondary_digest_unverified')blockReasons.push('primary_source_not_checked');
 if(!entry.transcriptionComplete)blockReasons.push('historical_reference_incomplete');
 if(!approved(input.climateAssessment,trusted))blockReasons.push('climate_diagnosis_not_approved');
 const climate:ClimateResult={index:entry,
  status:!input.upstreamValidated?'climate_review':'historical_lookup_only',
  historicalCandidates:[...entry.historicalMentionStems],yongshen:null,unresolved:unique(blockReasons)};
 const tongguan=input.controllingEdges.map(edge=>{
  const mediator=channelMediator(edge.attacker,edge.target)!;
  const present=input.actors.filter(a=>a.element===mediator).map(a=>a.id);
  return {edgeId:edge.id,attacker:edge.attacker,target:edge.target,mediator,
   mediatorActorIds:present,pathStatus:(present.length?'actor_present_review':'theoretical_only') as TongguanResult['pathStatus'],
   effectiveness:'not_evaluated' as const,evidenceIds:[...edge.evidence.evidenceIds]};
 });
 const bingyao=input.issues.map(issue=>{
  const directlyControls=CONTROLS[issue.harmfulElement]===issue.protectedElement;
  const canControl=directlyControls?(Object.entries(CONTROLS).find(([,v])=>v===issue.harmfulElement)?.[0] as Element|undefined):undefined;
  // Only a single *theoretical* 控病 path. Other remedies must be rule-specific.
  const present=input.actors.filter(a=>a.element===canControl).map(a=>a.id);
  const verified=approved(issue.evidence,trusted);
  return {issueId:issue.id,harmfulElement:issue.harmfulElement,protectedElement:issue.protectedElement,
   medicineElement:canControl??null,medicineActorIds:present,
   state:(!verified?'unverified_issue':!directlyControls?'mechanism_review_required':present.length?'possible_remedy_review':'remedy_absent') as BingyaoResult['state'],
   effectiveness:'not_evaluated' as const,evidenceIds:[...issue.evidence.evidenceIds]};
 });
 return {ruleId:'R-013',version:'DRAFT-1',climate,tongguan,bingyao,
  status:input.upstreamValidated?'review_required':'blocked',blockReasons:unique(blockReasons),
  climateYongshen:null,tongguanYongshen:null,bingyaoYongshen:null,finalYongshen:null,finalApproval:false};
}
