// 샘플 사주(1995-05-17 14:00, 시간 있음)로 수동 평가용 프롬프트 파일을 만든다: npx vite-node scripts/make-sample-prompts.ts
import { writeFileSync } from 'node:fs';
import { buildInterpretation } from '../src/lib/report/interpretation';
import { buildPlan } from '../src/lib/report/plan';
import { buildManualPrompt } from '../src/lib/report/prompt';
import { calculator } from '../src/lib/saju/sampleCalculator';

const facts = calculator.calculate({ calendar: 'solar', leapMonth: false, year: 1995, month: 5, day: 17, hour: 14, minute: 0, timeUnknown: false, country: 'KR' });
const years = [2026, 2027, 2028, 2029, 2030];
for (const product of ['basic', 'love_deep'] as const) {
  const interp = buildInterpretation(product, facts, product === 'love_deep' ? { years, yearPillar: (y) => calculator.yearPillar(y) } : {});
  const text = buildManualPrompt(buildPlan(product, interp), interp);
  writeFileSync(`docs/sample-prompts/${product}.txt`, text);
  console.log(product, text.length, 'chars');
}
