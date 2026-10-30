// 판단 카드 문장 검토표를 만든다: npx vite-node scripts/dump-card-catalog.ts
// → docs/saju-engine/CARD_TEXT_REVIEW.md (사람이 보는 표), docs/saju-engine/card_text_catalog.json (기계용)
// 문장 원본은 src/lib/report/cards.ts 의 CARD_TEXT 하나뿐이다. 표를 고치지 말고 원본을 고친 뒤 다시 만든다.
import { writeFileSync } from 'node:fs';
import { calculate } from '../engine/manse/src/engine';
import { toSajuFacts } from '../engine/manse/src/adapter';
import { analyzeR002toR005, fromManse } from '../engine/saju-rules/src';
import { buildRuleCards, CARDS_VERSION, cardTextCatalog } from '../src/lib/report/cards';
import { buildInterpretation } from '../src/lib/report/interpretation';

const cat = cardTextCatalog();
const toRe = (t: string) => new RegExp('^' + t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '(나무|불|흙|쇠|물)') + '$');

// 1900~2050 무작위 1,000명(시간 모름 15%)에서 각 문장이 몇 명에게 나오는지 센다
let s = 20261030;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const N = 1000;
const freq = new Map<string, number>();
for (let i = 0; i < N; i++) {
  const y = 1900 + Math.floor(rnd() * 151), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
  const h = rnd() < 0.15 ? null : Math.floor(rnd() * 24);
  const r = calculate({ calendar: 'solar', year: y, month: m, day: d, ...(h === null ? { timeUnknown: true } : { hour: h, minute: 0 }), gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
  if (!r.ok) continue;
  const { chart, monthTerm, birth } = fromManse(r.value);
  const rules = analyzeR002toR005(chart, { monthTerm, birth });
  const claims = [...buildRuleCards(rules).claims, ...buildInterpretation('basic', toSajuFacts(r.value), { rules }).claims.filter((c) => c.ruleId === 'SJ-BRANCH-PAIRS-DRAFT')];
  const seen = new Set<string>();
  for (const c of claims) {
    const e = cat.find((x) => x.ruleId === c.ruleId && toRe(x.thesis).test(c.thesis) && x.condition === c.condition && x.limitation === c.limitation);
    if (!e) throw new Error(`검토표에 없는 문장: ${c.ruleId} ${c.thesis}`);
    seen.add(e.key);
  }
  for (const k of seen) freq.set(k, (freq.get(k) ?? 0) + 1);
}

const GROUP: Array<[string, string]> = [
  ['SJ-R002-SEASON', '1. 태어난 계절과 나의 기운 (R-002)'],
  ['SJ-R004-ROOT', '2. 나와 같은 기운이 땅 쪽에도 있는가 (R-004)'],
  ['SJ-R005-ROLE', '3. 곁에 드러난 기운 (R-005)'],
  ['SJ-R005-WORK-ABSENT', '4. 일·돈과 연결되는 기운이 없을 때 (R-005)'],
  ['SJ-R005-STRUCT', '5. 기운끼리 작용할 수 있는 배치 — 후보 (R-005)'],
  ['SJ-R005-COMBINE', '6. 서로 끌리는 짝 (R-005)'],
  ['SJ-BRANCH-PAIRS', '7. 땅 쪽 자리끼리 부딪히거나 묶이는 짝 (기존 규칙을 쉬운 말로)'],
];
// 작성자(Claude)가 스스로 덜 확신하는 곳. 검토자가 먼저 봐 주면 좋은 점.
const NOTE: Record<string, string> = {
  'season.handling': '"손이 가는" 이 관계(내가 계절의 기운을 누름)의 뜻과 맞는지',
  'season.pressed': '"익숙해지는 시간이 필요" 가 지나친 단정이 아닌지',
  'root.absent': '뿌리 없음 → "주변의 도움을 활용" 으로 옮긴 것이 기준서(개수·유무로 힘을 정하지 않음)를 넘지 않는지',
  'role.peer': '같은 기운 → "함께하는 사람을 챙김" 이 일반론으로 맞는지(경쟁 쪽 뜻이 빠짐)',
  'role.officer': '"자주 생기는" 이 빈도를 단정하는지',
  'work_absent': '드러난 글자만 본 판단이라 땅 속 글자까지 보면 뒤집힐 수 있음. 아예 빼는 것도 방법',
  'struct.wealth_controls_resource': '"배움·쉼의 시간을 줄임" 이 이 배치의 뜻으로 적절한지',
  'struct.output_controls_officer': '부딪힘으로만 썼는데, 좋게 쓰이는 경우(규칙을 다듬음)도 넣을지',
  'combine': '"마음이 묶이는" 이 연애로만 읽히지 않는지',
  'branch_pairs.present': '부딪히는 짝과 묶이는 짝을 한 문장으로 합쳤음. 나눌지',
  'branch_pairs.absent': '"출렁임이 적다" 가 지나친 단정이 아닌지',
};
const cell = (t: string) => t.replace(/\|/g, '\\|').replace(/\{([^}]+)\}/g, '**[$1]**');
const pct = (k: string) => `${Math.round(((freq.get(k) ?? 0) / N) * 1000) / 10}%`;

const out: string[] = [];
out.push(`# 판단 카드 문장 검토표 (자동 생성)

- 카드 버전 \`${CARDS_VERSION}\` · 문장 ${cat.length}개 · 상태: **모두 초안(DRAFT), 전문가 승인 전**
- 이 표는 \`scripts/dump-card-catalog.ts\` 가 \`src/lib/report/cards.ts\` 의 \`CARD_TEXT\` 에서 만든다. 표를 직접 고치지 말고, 고칠 문장을 아래 "검토" 칸에 적어 주면 원본을 고친 뒤 다시 만든다.
- **[나의기운]**, **[계절기운]** 자리에는 나무·불·흙·쇠·물 중 하나가 들어간다.
- "나오는 비율"은 1900~2050년 무작위 ${N}명(출생 시간 모름 15%)에서 그 문장이 나온 사람의 비율이다. 비율이 높은 문장부터 보면 효율적이다.
- "확인할 점"은 작성자(Claude)가 스스로 덜 확신하는 곳이다. 명리 전문가가 아닌 작성자의 메모이므로 검토를 대신하지 않는다.
- 이 문장들은 AI 가 풀이를 쓸 때 참고하는 **근거 문장**이다. 고객에게 그대로 보이지 않고, AI 가 이 뜻을 벗어나지 않게 다시 쓴다.

## 검토하는 법

각 줄의 **검토** 칸에 셋 중 하나를 적는다.

- **승인** — 이대로 써도 됨
- **수정: (고친 문장)** — 문장·조건·한계 중 고칠 것을 적음
- **보류: (이유)** — 명리 근거가 부족하거나 해석이 틀림. 보류된 문장은 풀이에 쓰지 않게 막는다.

함께 볼 것:
- 문장이 **계산 사실보다 앞서 나가지 않는가**(예: 뿌리가 있다 → "강하다"로 단정하지 않는가)
- 후보·잠정인 것을 **"여지가 있어요"처럼 조건부로** 말하는가
- 초보자가 읽고 바로 이해되는가, 쓸데없는 말이 없는가

`);
for (const [prefix, title] of GROUP) {
  const rows = cat.filter((e) => e.ruleId.startsWith(prefix));
  out.push(`## ${title}\n`);
  out.push('| 번호 | 언제 쓰이나 | 문장 | 조건(언제 드러나나) | 한계(덧붙이는 말) | 나오는 비율 | 확인할 점 | 검토 |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const e of rows) out.push(`| \`${e.key}\` | ${cell(e.when)} | ${cell(e.thesis)} | ${cell(e.condition)} | ${cell(e.limitation)} | ${pct(e.key)} | ${cell(NOTE[e.key] ?? '')} | |`);
  out.push('');
}
out.push(`## 이 표에 없는 것

- 신강·신약, 격국, 용신 판단 문장: 해당 기준서(R-006 이후)가 검증 전이라 **만들지 않았다.**
- 땅 속 글자(지장간)의 계절별 당번(사령) 문장: 분일 수치 원문이 없어 **만들지 않았다**(UNVERIFIED).
- 연애·궁합·올해 운 전용 카드: 아직 없다. 지금은 기존 명제를 쓴다.
`);
writeFileSync('docs/saju-engine/CARD_TEXT_REVIEW.md', out.join('\n'));
writeFileSync('docs/saju-engine/card_text_catalog.json', JSON.stringify({ version: CARDS_VERSION, sample: N, entries: cat.map((e) => ({ ...e, sampleRate: (freq.get(e.key) ?? 0) / N })) }, null, 2) + '\n');
console.log(`문장 ${cat.length}개, 표본에서 한 번도 안 나온 문장: ${cat.filter((e) => !freq.get(e.key)).map((e) => e.key).join(', ') || '없음'}`);
