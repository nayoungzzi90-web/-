-- 해석 명제(Claim) 승인 체계 (설계안: 실행 전 검토 필요)
-- 상담사/전문가가 승인한 규칙 ID 만 운영 리포트의 근거로 쓸 수 있다.
create table if not exists approved_rules (
  rule_id text primary key,               -- src/lib/report/claims.ts RULES 의 id (예: R-CLM-POWER)
  rule_version text not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  note text
);
alter table approved_rules enable row level security; -- 정책 없음 = service role 만 접근

-- 검수 대기 상태 추가: needs_review 는 사용자에게 보이지 않는다.
alter table reports drop constraint if exists reports_status_check;
alter table reports add constraint reports_status_check check (status in ('pending','ready','failed','expired','needs_review'));
alter table reports add column if not exists cache_key text, add column if not exists review_reasons jsonb;
create index if not exists reports_cache_key_idx on reports(cache_key);

-- 사용자 조회는 ready 만. (검수 전 초안이 노출되지 않도록 정책에 명시)
drop policy if exists reports_own on reports;
create policy reports_own on reports for select using (user_id = auth.uid() and status = 'ready' and deleted_at is null and (expires_at is null or expires_at > now()));
