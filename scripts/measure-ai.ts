// AI 풀이 비용·품질 측정(수동 실행): npx vite-node scripts/measure-ai.ts [건수] [basic|love_deep|compatibility] [모델]
// compatibility 는 각 표본을 3칸 뒤 표본과 짝지어 궁합으로 측정한다(상대 정보는 모델에 보내지 않는 앱 방식 그대로).
// REVIEW_MODEL=<Gemini 모델> 을 주면 쓴 뒤 Gemini 독립 감수까지 한다(GEMINI_API_KEY 또는 네트워크 비밀). REVIEW_PRICE_IN_PER_M·REVIEW_PRICE_OUT_PER_M 로 감수 가격.
// 키는 코드에 넣지 않는다. OPENAI_API_KEY 환경변수 또는 네트워크 비밀(프록시 주입)을 쓴다. 가격은 공식 페이지 값으로 환경변수에서 읽는다.
import { buildCompatInterpretation, buildInterpretation } from '../src/lib/report/interpretation';
import { buildPlan } from '../src/lib/report/plan';
import { runReportPipeline } from '../src/lib/report/pipeline';
import { OpenAiLlm } from '../src/lib/report/openaiClient';
import { BudgetedLlm, costFromUsage } from '../src/lib/report/budget';
import { GeminiLlm } from '../src/lib/report/geminiClient';
import { applyReview, reviewReport } from '../src/lib/report/review';
import { calculator } from '../src/lib/saju/sampleCalculator';
import { calculate } from '../engine/manse/src/engine';
import { toSajuFacts } from '../engine/manse/src/adapter';
import { analyzeR002toR005, fromManse } from '../engine/saju-rules/src';

const n = Number(process.argv[2] ?? 1);
const product = (process.argv[3] ?? 'basic') as 'basic' | 'love_deep' | 'compatibility';
const model = process.argv[4] ?? 'gpt-5.4-mini';
const pricing = { inPerM: Number(process.env.LLM_PRICE_IN_PER_M ?? 0.75), outPerM: Number(process.env.LLM_PRICE_OUT_PER_M ?? 4.5) }; // 기본값은 제3자 집계(미확인)
const samples = [
  [1995, 5, 17, 14], [1990, 4, 19, 1], [1984, 9, 3, 9], [2001, 12, 25, 22], [1978, 2, 8, 6],
  [1993, 3, 9, 14], [1988, 10, 30, 18], [1999, 7, 7, 12], [1972, 11, 21, 3], [2005, 1, 15, 20],
  // 일반화 확인용 추가 표본(11~30): 연대·계절·시간대를 넓히고 절기 경계 부근을 포함
  [1925, 8, 14, 10], [1946, 3, 21, 23], [1957, 12, 2, 7], [1963, 6, 30, 16], [1969, 2, 4, 5],
  [1975, 9, 23, 19], [1981, 1, 20, 11], [1986, 5, 6, 2], [1991, 10, 8, 13], [1996, 4, 4, 9],
  [1998, 11, 7, 21], [2000, 2, 29, 15], [2003, 7, 23, 4], [2008, 8, 8, 8], [2010, 12, 31, 23],
  [2015, 3, 5, 17], [2018, 6, 21, 12], [2022, 9, 9, 1], [2030, 5, 5, 14], [2045, 10, 17, 6],
] as const;
const years = [2026, 2027, 2028, 2029, 2030];

let total = 0;
for (let i = 0; i < n; i++) {
  const [y, m, d, h] = samples[i % samples.length]!;
  // 검증된 만세력 엔진(engine/manse, DE421)으로 원국 계산. USE_SAMPLE_CALC=1 이면 옛 샘플 계산기(검증 전, 입춘 근사)를 쓴다.
  let facts;
  let rules;
  if (process.env.USE_SAMPLE_CALC === '1') facts = calculator.calculate({ calendar: 'solar', leapMonth: false, year: y, month: m, day: d, hour: h, minute: 0, timeUnknown: false, country: 'KR' });
  else {
    const mr = calculate({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: 0, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
    if (!mr.ok) throw new Error('manse engine error');
    facts = toSajuFacts(mr.value);
    // 판단 카드(R-002~R-005). USE_OLD_CLAIMS=1 이면 옛 십성 개수 기반 명제로 비교할 수 있다
    if (process.env.USE_OLD_CLAIMS !== '1') { const fm = fromManse(mr.value); rules = analyzeR002toR005(fm.chart, { monthTerm: fm.monthTerm, birth: fm.birth }); }
  }
  let interp;
  if (product === 'compatibility') {
    if (process.env.USE_SAMPLE_CALC === '1') throw new Error('compatibility 는 만세력 엔진으로만 측정해요');
    const [y2, m2, d2, h2] = samples[(i + 3) % samples.length]!;
    const mrB = calculate({ calendar: 'solar', year: y2, month: m2, day: d2, hour: h2, minute: 0, gender: 'M' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
    if (!mrB.ok) throw new Error('manse engine error (B)');
    const mrA = calculate({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: 0, gender: 'F' }, { ziHour: 'MIDNIGHT', timeBasis: 'ERA_WALL_CLOCK' } as never);
    if (!mrA.ok) throw new Error('manse engine error (A)');
    const fa = fromManse(mrA.value); const fb = fromManse(mrB.value);
    interp = buildCompatInterpretation(toSajuFacts(mrA.value), toSajuFacts(mrB.value), { rules: { a: analyzeR002toR005(fa.chart, { monthTerm: fa.monthTerm, birth: fa.birth }), b: analyzeR002toR005(fb.chart, { monthTerm: fb.monthTerm, birth: fb.birth }) } });
  } else interp = buildInterpretation(product, facts, { ...(product === 'love_deep' ? { years, yearPillar: (yr: number) => calculator.yearPillar(yr) } : {}), ...(rules ? { rules } : {}) });
  const plan = buildPlan(product, interp);
  const budget = new BudgetedLlm(new OpenAiLlm({ apiKey: process.env.OPENAI_API_KEY ?? 'proxy-injected', model }), {
    pricing, maxReportUsd: 0.5, dailyBudgetUsd: 3, maxInputTokensPerCall: 40000, maxOutputTokensPerCall: 4000, tokensPerChar: 1.5,
  } as never);
  const t0 = Date.now();
  const r = await runReportPipeline(plan, interp, { llm: budget, model, allowDraftClaims: true, ...(process.env.CONCERN ? { concern: process.env.CONCERN } : {}), displayName: process.env.NAME_FOR_TEST ?? '나영' });
  const cost = costFromUsage(r.usage, pricing);
  total += cost;
  const chars = r.sections.reduce((a, s) => a + s.body.replace(/\s/g, '').length, 0);
  console.log(JSON.stringify({ sample: `${y}-${m}-${d} ${h}시`, status: r.status, report: r.reportStatus, calls: r.calls, in: r.usage.inputTokens, out: r.usage.outputTokens, chars, usd: +cost.toFixed(4), krw: Math.round(cost * 1400), sec: Math.round((Date.now() - t0) / 1000), issues: r.issues.length, failure: r.failure?.code }));
  if (process.env.OUT_DIR) { const { writeFileSync } = await import('node:fs'); writeFileSync(`${process.env.OUT_DIR}/${product}-${y}${m}${d}.md`, r.sections.map((x) => `## ${x.title}\n### ${x.headline}\n\n${x.body}\n`).join('\n')); }
  if (process.env.REVIEW_MODEL) {
    const reviewModel = process.env.REVIEW_MODEL;
    const rv = await reviewReport(new GeminiLlm({ apiKey: process.env.GEMINI_API_KEY ?? 'proxy-injected', model: reviewModel }), interp, r.sections, { model: reviewModel, displayName: process.env.NAME_FOR_TEST ?? '나영', ...(process.env.REVIEW_MAX_TOKENS ? { maxTokens: Number(process.env.REVIEW_MAX_TOKENS) } : {}) });
    const rprice = { inPerM: Number(process.env.REVIEW_PRICE_IN_PER_M ?? 0.3), outPerM: Number(process.env.REVIEW_PRICE_OUT_PER_M ?? 2.5) }; // 기본값 미확인. 공식 가격으로 지정
    const rcost = costFromUsage(rv.usage, rprice);
    total += rcost;
    const after = applyReview(r, rv);
    console.log(JSON.stringify({ review: rv.verdict, model: rv.model, findings: rv.findings.length, ignored: rv.ignored.length, error: rv.error, usd: +rcost.toFixed(4), report: after.reportStatus }));
    for (const fd of [...rv.findings, ...rv.ignored.map((x) => ({ ...x, reason: `(본문에 없는 인용, 무시) ${x.reason}` }))]) console.log(`  - [${fd.sectionId}] ${fd.severity} ${fd.kind}: "${fd.quote}" — ${fd.reason}`);
  }
  if (r.issues.length) console.log('QA 사유:', JSON.stringify(r.issues, null, 1).slice(0, 1500));
  if (i === 0 && r.sections[0]) console.log('--- 첫 섹션 ---\n' + r.sections[0].body.slice(0, 600));
}
console.log(`합계 $${total.toFixed(4)} (≈${Math.round(total * 1400)}원, 환율 1,400원 가정)`);
