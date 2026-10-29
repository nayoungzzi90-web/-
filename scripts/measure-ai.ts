// AI 풀이 비용·품질 측정(수동 실행): npx vite-node scripts/measure-ai.ts [건수] [basic|love_deep] [모델]
// 키는 코드에 넣지 않는다. OPENAI_API_KEY 환경변수 또는 네트워크 비밀(프록시 주입)을 쓴다. 가격은 공식 페이지 값으로 환경변수에서 읽는다.
import { buildInterpretation } from '../src/lib/report/interpretation';
import { buildPlan } from '../src/lib/report/plan';
import { runReportPipeline } from '../src/lib/report/pipeline';
import { OpenAiLlm } from '../src/lib/report/openaiClient';
import { BudgetedLlm, costFromUsage } from '../src/lib/report/budget';
import { calculator } from '../src/lib/saju/sampleCalculator';

const n = Number(process.argv[2] ?? 1);
const product = (process.argv[3] ?? 'basic') as 'basic' | 'love_deep';
const model = process.argv[4] ?? 'gpt-5.4-mini';
const pricing = { inPerM: Number(process.env.LLM_PRICE_IN_PER_M ?? 0.75), outPerM: Number(process.env.LLM_PRICE_OUT_PER_M ?? 4.5) }; // 기본값은 제3자 집계(미확인)
const samples = [
  [1995, 5, 17, 14], [1990, 4, 19, 1], [1984, 9, 3, 9], [2001, 12, 25, 22], [1978, 2, 8, 6],
  [1993, 3, 9, 14], [1988, 10, 30, 18], [1999, 7, 7, 12], [1972, 11, 21, 3], [2005, 1, 15, 20],
] as const;
const years = [2026, 2027, 2028, 2029, 2030];

let total = 0;
for (let i = 0; i < n; i++) {
  const [y, m, d, h] = samples[i % samples.length]!;
  const facts = calculator.calculate({ calendar: 'solar', leapMonth: false, year: y, month: m, day: d, hour: h, minute: 0, timeUnknown: false, country: 'KR' });
  const interp = buildInterpretation(product, facts, product === 'love_deep' ? { years, yearPillar: (yr) => calculator.yearPillar(yr) } : {});
  const plan = buildPlan(product, interp);
  const budget = new BudgetedLlm(new OpenAiLlm({ apiKey: process.env.OPENAI_API_KEY ?? 'proxy-injected', model }), {
    pricing, maxReportUsd: 0.5, dailyBudgetUsd: 3, maxInputTokensPerCall: 40000, maxOutputTokensPerCall: 4000, tokensPerChar: 1.5,
  } as never);
  const t0 = Date.now();
  const r = await runReportPipeline(plan, interp, { llm: budget, model, allowDraftClaims: true });
  const cost = costFromUsage(r.usage, pricing);
  total += cost;
  const chars = r.sections.reduce((a, s) => a + s.body.replace(/\s/g, '').length, 0);
  console.log(JSON.stringify({ sample: `${y}-${m}-${d} ${h}시`, status: r.status, report: r.reportStatus, calls: r.calls, in: r.usage.inputTokens, out: r.usage.outputTokens, chars, usd: +cost.toFixed(4), krw: Math.round(cost * 1400), sec: Math.round((Date.now() - t0) / 1000), issues: r.issues.length, failure: r.failure?.code }));
  if (r.issues.length) console.log('QA 사유:', JSON.stringify(r.issues, null, 1).slice(0, 1500));
  if (i === 0 && r.sections[0]) console.log('--- 첫 섹션 ---\n' + r.sections[0].body.slice(0, 600));
}
console.log(`합계 $${total.toFixed(4)} (≈${Math.round(total * 1400)}원, 환율 1,400원 가정)`);
