/**
 * 오행 친구들 R-009: 특수격 '후보 탐지' 참조 구현.
 * 실제 출생 일시/간지 정합성은 R-001에서 검증되어 전달되어야 한다.
 * 이 파일은 격국의 성립, 종격의 진위, 합충 효력, 길흉을 확정하지 않는다.
 * R-003 정적 지장간과 R-008 데이터 타입을 재사용한다.
 */
import {HIDDEN, MAIN, type Pillars, type Position, type Stem, type Branch, type Element} from './oheng_r008';

const STEM_ELEMENT: Record<Stem, Element> = {
  甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'
};
const YANG = new Set<Stem>(['甲','丙','戊','庚','壬']);
const PRODUCES: Record<Element, Element> = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS: Record<Element, Element> = {木:'土',火:'金',土:'水',金:'木',水:'火'};
const JIANLU: Record<Stem, Branch> = {
  甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'
};
const YANG_BLADE: Partial<Record<Stem, Branch>> = {甲:'卯',丙:'午',戊:'午',庚:'酉',壬:'子'};

export type Family = 'PEER'|'RESOURCE'|'OUTPUT'|'WEALTH'|'OFFICER';
export type CandidateCode =
  'JIANLU'|'YUEJIE'|'YANG_BLADE'|'FOLLOW_WEALTH'|'FOLLOW_OFFICER'
  |'FOLLOW_OUTPUT'|'FOLLOW_POWER'|'FOLLOW_STRENGTH'|'FOLLOW_MIXED'|'FAKE_FOLLOW_REVIEW';
export interface Candidate {
  code: CandidateCode;
  level: 'structural_match'|'screening_candidate'|'review_candidate';
  evidence: string[];
  reviewFlags: string[];
  status: 'candidate'|'review_required';
}
export interface R009Result {
  rule_id: 'R-009';
  rule_version: 'DRAFT-1';
  status: 'review_required';
  day_stem: Stem;
  month_branch: Branch;
  month_main_ten_god_family: Family;
  structural: {
    jianlu: boolean;
    month_robbery: boolean;
    yang_blade: boolean;
    structural_roots: Array<{position:Position; branch:Branch; hiddenStem:Stem; mainQi:boolean}>;
    visible_families: Record<Family, number>;
    hidden_resource_sites: Position[];
  };
  candidates: Candidate[];
  final_pattern: null;
  final_follow_status: 'not_evaluated';
  hard_limits: string[];
  linked_rules: string[];
}

function familyOf(day: Stem, other: Stem): Family {
  const d = STEM_ELEMENT[day], o = STEM_ELEMENT[other];
  if (d === o) return 'PEER';
  if (PRODUCES[o] === d) return 'RESOURCE';
  if (PRODUCES[d] === o) return 'OUTPUT';
  if (CONTROLS[d] === o) return 'WEALTH';
  return 'OFFICER';
}
function tenGod(day: Stem, other: Stem): string {
  const f = familyOf(day, other), equalPolarity = YANG.has(day) === YANG.has(other);
  if (f === 'PEER') return equalPolarity ? '비견' : '겁재';
  if (f === 'RESOURCE') return equalPolarity ? '편인' : '정인';
  if (f === 'OUTPUT') return equalPolarity ? '식신' : '상관';
  if (f === 'WEALTH') return equalPolarity ? '편재' : '정재';
  return equalPolarity ? '편관' : '정관';
}
export {familyOf, tenGod};

const POSITIONS: Position[] = ['year','month','day','hour'];
export function analyzeR009(pillars: Pillars): R009Result {
  // 런타임 체크: 실제 만세력 검증은 R-001에서 수행해야 한다.
  for (const pos of POSITIONS) {
    if (!pillars[pos] || !STEM_ELEMENT[pillars[pos].stem] || !HIDDEN[pillars[pos].branch]) {
      throw new Error('R009_INVALID_PILLARS');
    }
  }
  const day = pillars.day.stem, month = pillars.month.branch;
  const visible: Record<Family, number> = {PEER:0,RESOURCE:0,OUTPUT:0,WEALTH:0,OFFICER:0};
  for (const pos of POSITIONS.filter(p => p!=='day')) visible[familyOf(day,pillars[pos].stem)]++;
  const roots: R009Result['structural']['structural_roots'] = [];
  const hiddenResourceSites: Position[] = [];
  for (const pos of POSITIONS) {
    const branch = pillars[pos].branch;
    const hiddenStems = HIDDEN[branch];
    if (hiddenStems.some(h => familyOf(day,h)==='RESOURCE')) hiddenResourceSites.push(pos);
    for (const h of hiddenStems) {
      if (STEM_ELEMENT[h]===STEM_ELEMENT[day]) {
        roots.push({position:pos, branch, hiddenStem:h, mainQi:MAIN[branch]===h});
      }
    }
  }
  const isLu = JIANLU[day]===month;
  const isBlade = YANG_BLADE[day]===month;
  const mainFamily = familyOf(day,MAIN[month]);
  const isRob = tenGod(day,MAIN[month])==='겁재';
  const candidates: Candidate[]=[];
  function add(code:CandidateCode,level:Candidate['level'],evidence:string[],reviewFlags:string[]=[]) {
    candidates.push({code,level,evidence,reviewFlags,status:level==='structural_match'?'candidate':'review_required'});
  }
  if(isLu) add('JIANLU','structural_match',[`R007:lu:${day}:${month}`],['R010:재관살식 취용 검토']);
  if(isRob) add('YUEJIE','structural_match',[`R007:rob:${day}:${month}`],['R010:월겁 취용 검토']);
  if(isBlade) add('YANG_BLADE','structural_match',[`R007:blade:${day}:${month}`],['R010:관살 제어·합간·인성 검토']);

  const hasRoot = roots.length>0;
  const hasVisibleSupport = visible.PEER+visible.RESOURCE>0;
  const weakBase = ['WEALTH','OFFICER','OUTPUT'].includes(mainFamily);
  const kind:Partial<Record<Family,CandidateCode>> = {
    WEALTH:'FOLLOW_WEALTH', OFFICER:'FOLLOW_OFFICER', OUTPUT:'FOLLOW_OUTPUT'
  };
  // 위험도가 낮은 '검토 대상 표시'다. 월지 계열과 천간 노출만으로 세력을 확정하지 않는다.
  if (weakBase && visible[mainFamily]>=1) {
    const flags:string[]=[
      'R006:일간 강약/근기의 실제 효력 미승인',
      'R008:합충·투출·회합의 실제 효력 미승인',
      'R003:사령 분일의 차이 검토',
      'R010:격국 성립/불성립 미승인'
    ];
    if (hasRoot) flags.push('R004:일간 동일오행 지장간 뿌리 존재 (진종 여부에 반증 후보)');
    if (hasVisibleSupport) flags.push('R005:천간 인성 또는 비겁 노출 (가종/불성립 여부 검토)');
    if (hiddenResourceSites.length) flags.push('R003:지장간 인성 기운 존재 (실효성 미확정)');
    add(kind[mainFamily]!, 'screening_candidate', [`R009:month_family:${mainFamily}`,`R005:visible_${mainFamily}:${visible[mainFamily]}`],flags);
    if (hasVisibleSupport || hasRoot || hiddenResourceSites.length) {
      add('FAKE_FOLLOW_REVIEW','review_candidate',[`R009:residual_support:${hasRoot}:${hasVisibleSupport}`],
        ['가종으로 확정하지 않음','반대 근거가 실효성 있는지 전문가 검토']);
    }
  }
  // 從勢: 식상/재성/관살 세 범주가 동시 출현하는 경우에만 예비 단서로 표시.
  // 세력의 동등함이나 한 기운으로 쏠리지 않음은 코드에서 판정하지 않는다.
  if (!hasRoot && !hasVisibleSupport &&
      visible.OUTPUT>0 && visible.WEALTH>0 && visible.OFFICER>0) {
    add('FOLLOW_MIXED','screening_candidate', ['R005:output_wealth_officer_visible'],
      ['진정한 從勢의 세력 비교는 미구현','R006:지원 세력의 잠재적 작용 확인']);
  }
  // 從旺·從強 예비 스크리닝: 확정 절대 금지.
  if (mainFamily==='PEER' && hasRoot && visible.PEER>0 && visible.OFFICER===0 && visible.WEALTH===0) {
    add('FOLLOW_POWER','screening_candidate',[`R007:month_peer`,`R004:roots:${roots.length}`],
      ['R006:비겁 우세 세력 미검증','지장간 재관살·식상의 실제 역할 검토']);
  }
  if (['PEER','RESOURCE'].includes(mainFamily) && hasRoot &&
      visible.PEER>0 && visible.RESOURCE>0 && visible.OFFICER===0 && visible.WEALTH===0) {
    add('FOLLOW_STRENGTH','screening_candidate',[`R005:peer:${visible.PEER}`,`R005:resource:${visible.RESOURCE}`],
      ['R006:인성과 비겁의 실제 우세 정도 미검증','종왕과 종강 후보 경쟁 비교']);
  }
  return {
    rule_id:'R-009',rule_version:'DRAFT-1',status:'review_required',
    day_stem:day,month_branch:month,month_main_ten_god_family:mainFamily,
    structural:{jianlu:isLu,month_robbery:isRob,yang_blade:isBlade,
      structural_roots:roots,visible_families:visible,hidden_resource_sites:hiddenResourceSites},
    candidates,final_pattern:null,final_follow_status:'not_evaluated',
    hard_limits:[
      'R-001에서 출생시각·간지의 실제 유효성 검증 필수',
      '강약/진종/가종/특수격/용신/길흉은 이 모듈에서 결코 확정하지 않음',
      '종격 미검출은 종격 불가능의 증거가 아님',
      '확정적 합화·충·통근 무력화는 별도 승인 규칙 없이는 불가'
    ],linked_rules:['R-003','R-004','R-005','R-006','R-007','R-008','R-010']
  };
}
