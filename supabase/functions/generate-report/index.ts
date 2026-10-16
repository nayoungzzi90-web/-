// ⚠️ 설계 구현 — 이 환경에는 Deno/Supabase 가 없어 실행·배포해 보지 못했다. 배포 전 `npm run sync:functions` 와 스테이징 검증이 필요하다.
// 역할: 결제/엽전 교환으로 권한(entitlement)이 생긴 뒤, 서버에서만 AI 리포트를 생성해 reports 에 저장한다.
// 비밀값(OPENAI_API_KEY / ANTHROPIC_API_KEY, SERVICE_ROLE_KEY)은 이 함수의 환경변수에만 존재한다 (브라우저로 나가지 않음).
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { AnthropicLlm } from '../_shared/lib/report/anthropicClient.ts';
import { OpenAiLlm } from '../_shared/lib/report/openaiClient.ts';
import { buildInterpretation } from '../_shared/lib/report/interpretation.ts';
import { runReportPipeline } from '../_shared/lib/report/pipeline.ts';
import { buildPlan } from '../_shared/lib/report/plan.ts';
import { kstParts } from '../_shared/lib/kst.ts';
import { calculator } from '../_shared/lib/saju/sampleCalculator.ts';
import type { SajuFacts } from '../_shared/lib/saju/types.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };
const MAX_JOB_ATTEMPTS = 3; // generation_jobs.attempt_count CHECK 와 동일(최초 + 재시도 2회)
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' };
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const err = (status: number, code: string, message: string, retryable = false) => json(status, { error_code: code, message, retryable, request_id: crypto.randomUUID() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return err(405, 'METHOD_NOT_ALLOWED', 'POST 만 지원해요.');

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return err(401, 'UNAUTHENTICATED', '로그인이 필요해요.');

  let entitlementId: string;
  try { entitlementId = String((await req.json()).entitlement_id ?? ''); } catch { return err(400, 'BAD_REQUEST', '요청 형식이 올바르지 않아요.'); }
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1) 권한: 내 entitlement 만. (가격·권한은 서버가 다시 확인한다)
  const { data: ent } = await admin.from('entitlements').select('id,user_id,order_id,product_id,subject_id,report_id,status').eq('id', entitlementId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!ent || !ent.report_id) return err(404, 'ENTITLEMENT_NOT_FOUND', '열람 권한을 찾을 수 없어요.');
  if (ent.product_id !== 'basic' && ent.product_id !== 'love_deep') return err(501, 'PRODUCT_NOT_SUPPORTED', '이 상품의 AI 생성은 아직 준비 중이에요. (궁합은 제3자 정보 암호화·삭제 설계 후 지원)');

  // 2) 이미 만들어졌다면 재호출 금지 (AC-08)
  const { data: report } = await admin.from('reports').select('id,status').eq('id', ent.report_id).single();
  if (report?.status === 'ready') return json(200, { status: 'ready', report_id: report.id });

  // 3) 시도 횟수 상한
  const { data: job } = await admin.from('generation_jobs').select('id,status,attempt_count').eq('order_id', ent.order_id).maybeSingle();
  if (!job) return err(404, 'JOB_NOT_FOUND', '생성 작업을 찾을 수 없어요.');
  if (job.status === 'running') return json(202, { status: 'running', job_id: job.id });
  if (job.attempt_count >= MAX_JOB_ATTEMPTS) return err(409, 'ATTEMPTS_EXHAUSTED', '자동 재시도 횟수를 모두 사용했어요. 복구 또는 환불 요청으로 이어져요.');
  await admin.from('generation_jobs').update({ status: 'running', attempt_count: job.attempt_count + 1 }).eq('id', job.id);

  // 4) 백그라운드로 생성하고 즉시 202 (클라이언트는 generation_jobs 상태를 조회)
  EdgeRuntime.waitUntil(generate(admin, user.id, ent, job.id).catch(async (e) => {
    await admin.from('generation_jobs').update({ status: 'failed', last_error: `UNEXPECTED:${String(e).slice(0, 200)}` }).eq('id', job.id);
  }));
  return json(202, { status: 'running', job_id: job.id });
});

async function generate(admin: ReturnType<typeof createClient>, userId: string, ent: { product_id: string; subject_id: string; report_id: string }, jobId: string) {
  const fail = (code: string, message: string) => admin.from('generation_jobs').update({ status: 'failed', last_error: `${code}:${message}`.slice(0, 300) }).eq('id', jobId);

  // 차트 소유권 확인 후 계산 사실(SajuFacts) 로드. 출생정보 원문은 모델로 보내지 않는다.
  const { data: chart } = await admin.from('saju_charts').select('facts_json,birth_profiles!inner(owner_user_id)').eq('id', ent.subject_id).single();
  if (!chart || (chart as { birth_profiles: { owner_user_id: string } }).birth_profiles.owner_user_id !== userId) return fail('FORBIDDEN', '내 차트가 아니에요.');
  const facts = chart.facts_json as SajuFacts;

  const product = ent.product_id as 'basic' | 'love_deep';
  const baseYear = kstParts().year; // 생성 시점 기준 (구매 후 새해가 되어도 범위가 바뀌지 않도록 reports 에 저장)
  const years = [0, 1, 2, 3, 4].map((i) => baseYear + i);
  // 교체 지점: 검증된 만세력 어댑터가 준비되면 calculator.yearPillar 를 그 어댑터로 바꾼다
  // 승인된 규칙 ID 만 APPROVED 명제가 된다 (상담사 승인 = approved_rules 테이블)
  const { data: approved } = await admin.from('approved_rules').select('rule_id');
  const approvedRuleIds = new Set((approved ?? []).map((r: { rule_id: string }) => r.rule_id));
  const interp = buildInterpretation(product, facts, { approvedRuleIds, ...(product === 'love_deep' ? { years, yearPillar: (y: number) => calculator.yearPillar(y) } : {}) });
  const plan = buildPlan(product, interp);

  // LLM_PROVIDER=openai | anthropic (기본 openai). 모델명은 LLM_MODEL 로 반드시 지정한다.
  const provider = Deno.env.get('LLM_PROVIDER') ?? 'openai';
  const model = Deno.env.get('LLM_MODEL') ?? (provider === 'anthropic' ? 'claude-opus-5-5' : '');
  if (!model) return fail('CONFIG', 'LLM_MODEL 이 설정되지 않았어요.');
  const llm = provider === 'anthropic'
    ? new AnthropicLlm({ client: new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! }), model, effort: (Deno.env.get('LLM_EFFORT') as 'low' | 'medium' | 'high') ?? 'medium' })
    : new OpenAiLlm({ apiKey: Deno.env.get('OPENAI_API_KEY')!, model });
  // 스테이징 전용 스위치: 승인 전 초안 명제로도 생성하되 결과는 NEEDS_REVIEW 로만 저장된다 (운영에서는 설정하지 않는다)
  const allowDraftClaims = Deno.env.get('ALLOW_DRAFT_CLAIMS') === 'true';
  const r = await runReportPipeline(plan, interp, { llm, model, allowDraftClaims });

  // 원가·토큰·시도 기록 (성공/실패 모두)
  const metrics = { tokens_in: r.usage.inputTokens, tokens_out: r.usage.outputTokens, estimated_cost: r.costUsd, model, calls: r.calls, cache_read_tokens: r.usage.cacheReadTokens, cache_write_tokens: r.usage.cacheWriteTokens };
  if (r.status !== 'ok') {
    await admin.from('generation_jobs').update({ ...metrics, status: 'failed', last_error: `${r.failure?.code}:${r.failure?.message}`.slice(0, 300) }).eq('id', jobId);
    return;
  }
  // READY 가 아니면(엔진 미검증·명제 미승인·충돌) 사용자에게 보이지 않는 needs_review 로 저장 — 운영 검수 큐에서 확인
  const visible = r.reportStatus === 'READY' ? 'ready' : 'needs_review';
  const usedEvidence = new Set(r.sections.flatMap((s) => s.evidenceIds));
  await admin.from('reports').update({
    status: visible, cache_key: r.cacheKey, review_reasons: r.reviewReasons, generated_at: new Date().toISOString(),
    body_json: { sections: r.sections.map((s) => ({ id: s.id, title: s.title, body: s.body, evidence_ids: s.evidenceIds, claim_ids: s.claimIds })), years: product === 'love_deep' ? years : null, base_year: baseYear },
    evidence_json: interp.evidence.filter((e) => usedEvidence.has(e.id)),
    qa_json: { issues: r.issues, versions: r.versions }, plan_json: plan,
    rule_version: interp.version, prompt_version: r.versions.prompt, model_version: model, engine_version: `${facts.computation.engine_name}@${facts.computation.engine_version}`,
  }).eq('id', ent.report_id);
  await admin.from('generation_jobs').update({ ...metrics, status: visible === 'ready' ? 'succeeded' : 'failed', last_error: visible === 'ready' ? null : `NEEDS_REVIEW:${r.reviewReasons.join(',')}`.slice(0, 300) }).eq('id', jobId);
}
