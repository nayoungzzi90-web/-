// AI 풀이 프롬프트를 사람이 읽는 문서로 내보낸다: npx vite-node scripts/dump-prompt.ts > docs/prompts/BASIC_REPORT_PROMPT.md
import { buildInterpretation } from '../src/lib/report/interpretation';
import { buildPlan } from '../src/lib/report/plan';
import { buildSectionPrompt, buildSystemPrompt, PROMPT_VERSION, SECTION_SCHEMA } from '../src/lib/report/prompt';
import { PLAN_VERSION } from '../src/lib/report/plan';
import { QA_VERSION } from '../src/lib/report/qa';
import { calculate } from '../engine/manse/src/engine';
import { toSajuFacts } from '../engine/manse/src/adapter';

const r = calculate({ calendar: 'solar', year: 1995, month: 5, day: 17, hour: 14, minute: 0, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
if (!r.ok) throw new Error('engine');
const interp = buildInterpretation('basic', toSajuFacts(r.value));
const plan = buildPlan('basic', interp);
console.log(`# 기본 사주 AI 풀이 프롬프트 (자동 생성)\n\n- 프롬프트 ${PROMPT_VERSION} / 계획 ${PLAN_VERSION} / 검수 ${QA_VERSION}\n- 이 문서는 \`scripts/dump-prompt.ts\` 가 코드(\`src/lib/report/prompt.ts\`, \`plan.ts\`)에서 만든다. 직접 고치지 말고 코드를 고친 뒤 다시 만든다.\n- 기준서(docs/saju-engine/source)의 정책을 코드 규칙과 검수로 옮긴 것이다. 전문가 승인 전 초안이다.\n`);
console.log('## 1. 시스템 프롬프트(모든 섹션 공통)\n\n```text\n' + buildSystemPrompt(plan) + '\n```\n');
console.log('## 2. 섹션 요청 예시(첫 섹션)\n\n```text\n' + buildSectionPrompt(plan, plan.sections[0]!, interp, [], [], true, '(고객이 적은 고민이 있으면 여기에 들어간다)') + '\n```\n');
console.log('## 3. 출력 JSON 스키마\n\n```json\n' + JSON.stringify(SECTION_SCHEMA, null, 2) + '\n```\n');
console.log('## 4. 코드가 반려하는 것(자동 검수)\n\n- 분량 미달·초과(섹션별 범위)\n- 한자(간지·오행 한자는 자동으로 한글 변환, 그 밖의 한자는 반려)\n- 사주 전문용어(일간·월지·십성·신강·신약·통근·투출·사령·월령·용신·격국 등)\n- 오행 분포를 틀리게 말한 문장("X 기운이 없다/가장 많다")\n- 제공되지 않은 간지·사실 ID·명제 ID\n- 단정적 예언, 의학·심리 진단, 점수·확률\n- 출생 시간을 모를 때 시주 언급\n- 같은 문장 반복(섹션 간 중복)\n- 이름 자리표시({{이름}})는 서버가 실제 이름으로 바꿈, 모델에는 이름을 보내지 않음\n');
