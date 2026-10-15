-- AI 리포트 파이프라인 지원 (설계안: 실행 전 검토 필요)
alter table reports add column if not exists qa_json jsonb, add column if not exists plan_json jsonb;
alter table generation_jobs
  add column if not exists model text,
  add column if not exists calls integer,
  add column if not exists cache_read_tokens integer,
  add column if not exists cache_write_tokens integer;
comment on column generation_jobs.estimated_cost is 'USD (공식 가격표 기준 추정, src/lib/report/llm.ts PRICING). 환율 적용 전';

-- 생성 진행 상태는 본인 주문의 작업만 조회 가능 (GET /api/jobs/:id). 오류 상세(last_error)는 사용자에게 노출하지 않는 뷰를 앱에서 사용.
create policy generation_jobs_own on generation_jobs for select using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
