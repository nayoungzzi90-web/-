// 화면에 보이는 풀이 문장을 한글만으로 바꾼다(2026-11-12 사용자 요청: 풀이에서는 한자를 쓰지 않는다).
// 계산·시험 데이터는 그대로 두고, 화면에 그릴 때만 변환한다.
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const BRANCH_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ELEMENT: Record<string, string> = { 木: "나무", 火: "불", 土: "흙", 金: "쇠", 水: "물" };

export function hangulOnly(s: string): string {
  let t = s;
  // 1) 한글 뒤에 괄호로 붙은 한자 설명은 지운다: 쇠(金) → 쇠
  t = t.replace(/([가-힣])\([一-鿿·]+\)/g, "$1");
  // 2) 오행 글자 + 숫자: 木2 → 나무 2
  t = t.replace(/([木火土金水])(\d)/g, (_, c: string, d: string) => `${ELEMENT[c]} ${d}`);
  // 3) 남은 간지·오행 한자를 한글 읽기로
  t = t.replace(/[甲乙丙丁戊己庚辛壬癸]/g, (c) => STEM_KO[STEMS.indexOf(c)]!);
  t = t.replace(/[子丑寅卯辰巳午未申酉戌亥]/g, (c) => BRANCH_KO[BRANCHES.indexOf(c)]!);
  t = t.replace(/[木火土金水]/g, (c) => ELEMENT[c]!);
  // 4) 병오(병오) 처럼 같은 글자가 괄호로 되풀이되면 한 번만
  t = t.replace(/([가-힣]+)\(\1\)/g, "$1");
  return t;
}
