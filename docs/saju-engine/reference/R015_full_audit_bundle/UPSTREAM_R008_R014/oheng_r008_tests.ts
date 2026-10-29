function assert(value: unknown): asserts value { if (!value) throw new Error('Assertion failed'); }
function assertEqual(a: unknown, b: unknown) { if (a !== b) throw new Error(`Expected ${String(b)}, got ${String(a)}`); }
import { analyzeR008, type Pillars, type Stem, type Branch } from './oheng_r008';
const VERSIONS={r003:'R-003-POLICY',r005:'R-005-DRAFT-2',r007:'R-007-POLICY'};
function P(day:Stem, month:Branch, yearStem:Stem, monthStem:Stem, hourStem:Stem,
 yearBranch:Branch='子',dayBranch:Branch='寅',hourBranch:Branch='午'):Pillars {
  // 구조 탐지 단위 테스트용 구성. 실제 만세력에서 유효한 연월시 조합이라는 뜻은 아니다.
  return {year:{stem:yearStem,branch:yearBranch},month:{stem:monthStem,branch:month},
    day:{stem:day,branch:dayBranch},hour:{stem:hourStem,branch:hourBranch}};
}
function run(p:Pillars){return analyzeR008({pillars:p,r007BaseCandidate:'R-007 base',ruleVersions:VERSIONS});}
let passed=0;
const test=(name:string,action:()=>void)=>{action();passed++;console.log('PASS',name)};

test('G008-01: 辰에서 癸 정확 투출',()=>{
 const r=run(P('甲','辰','癸','庚','丙'));
 assert(r.exposures.some(x=>x.kind==='exact_exposure'&&x.visibleStem==='癸'&&x.tenGod==='정인'));
});
test('G008-02: 辰에서 壬은 정확 癸 투출 아님',()=>{
 const r=run(P('甲','辰','壬','庚','丙'));
 assert(!r.exposures.some(x=>x.visibleStem==='壬'&&x.kind==='exact_exposure'));
 assert(r.exposures.some(x=>x.visibleStem==='壬'&&x.kind==='related_element_visible'));
});
test('G008-03: 戊·癸 복수 투출 보존, 간합 후보',()=>{
 const r=run(P('甲','辰','戊','庚','癸'));
 assert(r.exposures.some(x=>x.visibleStem==='戊'&&x.kind==='exact_exposure'));
 assert(r.exposures.some(x=>x.visibleStem==='癸'&&x.kind==='exact_exposure'));
 assert(r.heavenlyCombinationCandidates.some(x=>x.stems.includes('戊')&&x.stems.includes('癸')));
 assertEqual(r.finalPattern,null);
});
test('G008-04: 申子辰 완전 삼합',()=>{
 const r=run(P('甲','辰','甲','丙','庚','申','子','寅'));
 assert(r.groups.some(x=>x.groupId==='申子辰'&&x.kind==='full_trine'&&x.tenGodFamily==='인성'));
});
test('G008-05: 子辰만 있을 때는 반합 후보',()=>{
 const r=run(P('甲','辰','甲','丙','庚','子','寅','巳'));
 assert(r.groups.some(x=>x.groupId==='申子辰'&&x.kind==='partial_trine'));
 assert(!r.groups.some(x=>x.groupId==='申子辰'&&x.kind==='full_trine'));
});
test('G008-06: 寅卯辰 삼회 목',()=>{
 const r=run(P('甲','辰','甲','丙','庚','寅','卯','巳'));
 assert(r.groups.some(x=>x.groupId==='寅卯辰'&&x.kind==='full_meeting'&&x.element==='木'));
});
test('G008-07: 丁亥 + 卯未는 목 인성',()=>{
 const r=run(P('丁','亥','庚','辛','戊','卯','子','未'));
 assert(r.groups.some(x=>x.groupId==='亥卯未'&&x.kind==='full_trine'&&x.tenGodFamily==='인성'));
});
test('G008-08: 辰戌 충은 개고 확정이 아님',()=>{
 const r=run(P('甲','辰','庚','戊','丙','戌','寅','午'));
 assert(r.monthlyClashCandidates.some(x=>x.with==='戌'));
 assertEqual(r.finalPattern,null);
});
test('G008-09: 일간만 동일 지장간이어도 투출 아님',()=>{
 const r=run(P('癸','辰','庚','丙','辛'));
 assert(!r.exposures.some(x=>x.visibleStem==='癸'));
});
test('G008-10: 잡기월 기초 후보만 유지',()=>{
 const r=run(P('甲','未','庚','辛','戊','申','酉','子'));
 assert(r.mixedQiReview);
 assertEqual(r.r007BaseCandidate,'R-007 base');
 assertEqual(r.status,'candidate');
});
test('G008-11: 월지 포함 없는 다른 삼합은 R008 취격 제외',()=>{
 const r=run(P('甲','丑','壬','癸','庚','申','子','辰'));
 assert(!r.groups.some(x=>x.groupId==='申子辰'));
});
test('G008-12: 원국에 삼합지지가 있어도 합화 자동 확정 금지',()=>{
 const r=run(P('甲','辰','丙','乙','庚','申','子','寅'));
 assert(r.groups.every(x=>x.effectiveTransformation==='not_evaluated'));
});
test('G008-13: 10일간 × 12월지 기초 조합 120건',()=>{
 const stems: Stem[]=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
 const branches: Branch[]=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
 let count=0;
 for(const d of stems) for(const m of branches){
  const r=run(P(d,m,'庚','辛','壬'));
  assertEqual(r.monthBranch,m);
  assertEqual(r.finalPattern,null);
  assertEqual(r.status,'candidate');
  count++;
 }
 assertEqual(count,120);
});
console.log(`Tests passed: ${passed}`);
