/**
 * 오행 친구들 R-008 개발용 참조 구현 (candidate detector)
 * 입력은 R-001/R-003/R-007에서 검증한 원국이라고 가정한다.
 * 천간/지지 조합의 실제 출생 시점 적법성은 이 모듈에서 검증하지 않는다.
 * 고전 취격의 성립/합화/격국 성패는 결코 확정하지 않는다.
 */
export type Stem = '甲'|'乙'|'丙'|'丁'|'戊'|'己'|'庚'|'辛'|'壬'|'癸';
export type Branch = '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥';
export type Element = '木'|'火'|'土'|'金'|'水';
export type Position = 'year'|'month'|'day'|'hour';
export type Pillar = {stem: Stem; branch: Branch};
export type Pillars = Record<Position, Pillar>;

const ELEMENTS: Record<Stem, Element> = {
  甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'
};
const GENERATES: Record<Element, Element> = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS: Record<Element, Element> = {木:'土',火:'金',土:'水',金:'木',水:'火'};

// R-003 정적 지장간의 집합. 실제 서비스에서는 이 테이블을 R-003 모듈에서 가져온다.
export const HIDDEN: Record<Branch, readonly Stem[]> = {
  子:['癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'],
  卯:['乙'], 辰:['戊','乙','癸'], 巳:['丙','庚','戊'],
  午:['丁','己'], 未:['己','丁','乙'], 申:['庚','壬','戊'],
  酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲']
};
export const MAIN: Record<Branch, Stem> = {
  子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',
  午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'
};
const MIXED = new Set<Branch>(['辰','戌','丑','未']);

export type Family = '비겁'|'인성'|'식상'|'재성'|'관살';
export function classifyElementFamily(day: Stem, element: Element): Family {
  const d = ELEMENTS[day];
  if (d === element) return '비겁';
  if (GENERATES[element] === d) return '인성';
  if (GENERATES[d] === element) return '식상';
  if (CONTROLS[d] === element) return '재성';
  return '관살';
}

// 정확한 세부 십성은 승인된 R-005 유틸리티를 재사용할 것을 권장한다.
const YANG = new Set<Stem>(['甲','丙','戊','庚','壬']);
export function tenGod(day: Stem, other: Stem): string {
  const sameYang = YANG.has(day) === YANG.has(other);
  switch(classifyElementFamily(day, ELEMENTS[other])) {
    case '비겁': return sameYang ? '비견' : '겁재';
    case '인성': return sameYang ? '편인' : '정인';
    case '식상': return sameYang ? '식신' : '상관';
    case '재성': return sameYang ? '편재' : '정재';
    case '관살': return sameYang ? '편관' : '정관';
  }
}

type GroupKind = 'full_trine'|'partial_trine'|'full_meeting'|'partial_meeting';
type Group = {id:string; kind:'trine'|'meeting'; element:Element; members:readonly Branch[]};
const GROUPS: readonly Group[] = [
  {id:'申子辰',kind:'trine',element:'水',members:['申','子','辰']},
  {id:'寅午戌',kind:'trine',element:'火',members:['寅','午','戌']},
  {id:'亥卯未',kind:'trine',element:'木',members:['亥','卯','未']},
  {id:'巳酉丑',kind:'trine',element:'金',members:['巳','酉','丑']},
  {id:'寅卯辰',kind:'meeting',element:'木',members:['寅','卯','辰']},
  {id:'巳午未',kind:'meeting',element:'火',members:['巳','午','未']},
  {id:'申酉戌',kind:'meeting',element:'金',members:['申','酉','戌']},
  {id:'亥子丑',kind:'meeting',element:'水',members:['亥','子','丑']},
];
const CLASHES: readonly (readonly [Branch,Branch])[] = [
  ['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']
];
const HEAVENLY_COMBINATIONS: readonly (readonly [Stem,Stem])[] = [
  ['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']
];

export type Exposure = {
  kind:'exact_exposure'|'related_element_visible';
  sourceMonthBranch: Branch;
  visiblePosition:'year'|'month'|'hour';
  visibleStem: Stem;
  linkedHiddenStem: Stem;
  tenGod: string;
  evidenceId:string;
  certainty:'structural_fact'|'interpretive_candidate';
};
export type GroupCandidate = {
  groupId:string;
  kind:GroupKind;
  element:Element;
  tenGodFamily:Family;
  presentMembers:Branch[];
  evidenceIds:string[];
  effectiveTransformation:'not_evaluated';
};
export type R008Result = {
  ruleId:'R-008'; version:'DRAFT-1';
  monthBranch:Branch; mixedQiReview:boolean;
  r007BaseCandidate:string|null;
  monthMainStem:Stem;
  exposures:Exposure[];
  groups:GroupCandidate[];
  monthlyClashCandidates:{with:Branch; evidenceId:string}[];
  heavenlyCombinationCandidates:{first:Position;second:Position; stems:[Stem,Stem]}[];
  reviewRoutes:string[];
  candidatePolicy:'preserve_all';
  finalPattern:null;
  status:'candidate';
  dependencies:{r003:string;r005:string;r007:string};
};

const POSITIONS:readonly Position[] = ['year','month','day','hour'];
const VISIBLE:readonly ('year'|'month'|'hour')[] = ['year','month','hour'];
function isValidInput(p:Pillars): boolean {
  return POSITIONS.every(pos => p[pos] &&
    Object.hasOwn(ELEMENTS,p[pos].stem) && Object.hasOwn(HIDDEN,p[pos].branch));
}

export function analyzeR008(input:{pillars:Pillars;r007BaseCandidate:string|null;
  ruleVersions:{r003:string;r005:string;r007:string};}):R008Result {
  const {pillars:p,r007BaseCandidate,ruleVersions}=input;
  if(!isValidInput(p)) throw new Error('Invalid pillars; R-001 validation required');
  const month=p.month.branch, day=p.day.stem;
  const hidden=HIDDEN[month];
  const exposures:Exposure[]=[];
  for(const pos of VISIBLE){
    const stem=p[pos].stem;
    if(hidden.includes(stem)){
      exposures.push({kind:'exact_exposure',sourceMonthBranch:month,
        visiblePosition:pos,visibleStem:stem,linkedHiddenStem:stem,
        tenGod:tenGod(day,stem),evidenceId:`month:${month}:hidden:${stem}|${pos}:${stem}`,
        certainty:'structural_fact'});
    } else {
      const related=hidden.find(h => ELEMENTS[h]===ELEMENTS[stem]);
      if(related){
        exposures.push({kind:'related_element_visible',sourceMonthBranch:month,
          visiblePosition:pos,visibleStem:stem,linkedHiddenStem:related,
          tenGod:tenGod(day,stem),evidenceId:`month:${month}:hidden:${related}|${pos}:${stem}`,
          certainty:'interpretive_candidate'});
      }
    }
  }
  const present=new Set<Branch>(POSITIONS.map(pos=>p[pos].branch));
  const groups:GroupCandidate[]=[];
  for(const g of GROUPS){
    if(!g.members.includes(month)) continue; // R-008 월령 중심 취격만
    const found=g.members.filter(b=>present.has(b));
    if(found.length<2) continue;
    const full=found.length===3;
    groups.push({
      groupId:g.id,
      kind:g.kind==='trine'?(full?'full_trine':'partial_trine'):(full?'full_meeting':'partial_meeting'),
      element:g.element,tenGodFamily:classifyElementFamily(day,g.element),
      presentMembers:found.slice(),
      evidenceIds:found.map(b=>`branch:${b}`),
      effectiveTransformation:'not_evaluated'
    });
  }
  const monthlyClashCandidates=CLASHES
    .filter(([a,b])=> (month===a&&present.has(b))||(month===b&&present.has(a)))
    .map(([a,b])=>({with:month===a?b:a,evidenceId:`clash:${a}${b}`}));
  const heavenlyCombinationCandidates:R008Result['heavenlyCombinationCandidates']=[];
  for(let i=0;i<POSITIONS.length;i++){
    for(let j=i+1;j<POSITIONS.length;j++){
      const pa=POSITIONS[i],pb=POSITIONS[j];
      const a=p[pa].stem,b=p[pb].stem;
      if(HEAVENLY_COMBINATIONS.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a))){
        heavenlyCombinationCandidates.push({first:pa,second:pb,stems:[a,b]});
      }
    }
  }
  const reviewRoutes=['R-009_SPECIAL_PATTERN_SCREEN','R-010_PATTERN_VALIDITY'];
  if(MIXED.has(month)) reviewRoutes.push('MIXED_QI_SELECT');
  if(exposures.length) reviewRoutes.push('EXPOSURE_REVIEW');
  if(groups.length) reviewRoutes.push('BRANCH_GROUP_REVIEW');
  if(monthlyClashCandidates.length) reviewRoutes.push('CLASH_INTERPRETATION_PENDING');
  if(heavenlyCombinationCandidates.length) reviewRoutes.push('HEAVENLY_COMBINATION_PENDING');
  return {ruleId:'R-008',version:'DRAFT-1',monthBranch:month,
    mixedQiReview:MIXED.has(month),r007BaseCandidate,
    monthMainStem:MAIN[month],exposures,groups,monthlyClashCandidates,
    heavenlyCombinationCandidates,reviewRoutes,candidatePolicy:'preserve_all',
    finalPattern:null,status:'candidate',dependencies:ruleVersions};
}
