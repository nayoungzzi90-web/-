// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
// 한글 전용 출력 보조: 한자를 쓰지 않는다는 제품 규칙을 코드로도 지킨다(모델 지시 + 검수 + 변환).
const STEM_KO = '갑을병정무기경신임계';
const BRANCH_KO = '자축인묘진사오미신유술해';
const STEM_ELEMENT = '목목화화토토금금수수';
const MAP: Record<string, string> = {};
// 천간 한 글자만 나올 때는 "경금"처럼 오행을 붙여 읽는다("경"만 남으면 '경과' 같은 낱말과 헷갈린다)
[...'甲乙丙丁戊己庚辛壬癸'].forEach((c, i) => (MAP[c] = STEM_KO[i]! + STEM_ELEMENT[i]!));
[...'子丑寅卯辰巳午未申酉戌亥'].forEach((c, i) => (MAP[c] = BRANCH_KO[i]!));
Object.assign(MAP, { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' });

const HAN = /\p{Script=Han}/u;
export const hasHanja = (s: string) => HAN.test(s);

/** 알려진 간지·오행 한자를 한글로 바꾸고, "경오(경오)" 같은 중복 표기를 하나로 줄인다. 그 밖의 한자는 그대로 둔다(검수에서 걸러낸다). */
export function toHangul(s: string): string {
  // 간지 두 글자("庚午")는 "경오"로, 남은 한 글자는 개별 규칙으로
  const paired = s.replace(/([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/g, (_m, a: string, b: string) => STEM_KO['甲乙丙丁戊己庚辛壬癸'.indexOf(a)]! + BRANCH_KO['子丑寅卯辰巳午未申酉戌亥'.indexOf(b)]!);
  const converted = [...paired].map((c) => MAP[c] ?? c).join('');
  return converted.replace(/([가-힣]{1,4})\s*\(\s*\1\s*\)/g, '$1');
}
