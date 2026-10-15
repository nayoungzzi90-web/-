import { COMPAT_RETENTION_DAYS, MAX_REPORT_ATTEMPTS, ProductId } from '../catalog';
import { buildCharacter } from '../content/characters';
import { generateReport } from '../content/report';
import { kstParts } from '../kst';
import { uid } from '../hash';
import { calculator } from '../saju/calculator';
import type { BirthInput } from '../saju/types';
import { Db, Entitlement, Job, StoredChart, User, getDb, mutate, track } from './db';
import { captureReferral, completeReferral, newReferralCode, ReferralOutcome } from './referral';

/** 무료 체험: 계산 → 캐릭터 → 저장 (게스트도 가능). 계산 불가 입력은 CalcError 로 전파. */
export function createChart(input: BirthInput): StoredChart {
  const facts = calculator.calculate(input);
  return mutate((db) => {
    const cid = `${facts.chartId}_${db.guestId.slice(-6)}`;
    const existing = db.charts[cid];
    if (existing) { db.activeChartId = existing.id; return existing; }
    const chart: StoredChart = {
      id: cid, guestId: db.guestId, ownerUserId: db.sessionUserId ?? undefined,
      input: { ...input, alias: input.alias?.trim() || undefined }, facts, character: buildCharacter(facts), createdAt: new Date().toISOString(),
    };
    db.charts[chart.id] = chart;
    db.activeChartId = chart.id;
    track(db, 'guest_trial_completed', { step: 'character' });
    return chart;
  });
}

/** 샌드박스 로그인: 실제 서비스에서는 Supabase Auth(카카오·구글·이메일)가 이 자리를 대체한다. */
export function signInMock(email: string, nickname?: string): { user: User; isNew: boolean; referral: ReferralOutcome } {
  return mutate((db) => {
    const clean = email.trim().toLowerCase();
    let user = Object.values(db.users).find((u) => u.email === clean);
    const isNew = !user;
    if (!user) {
      user = { id: uid('usr_'), email: clean, nickname: nickname?.trim() || clean.split('@')[0], referralCode: newReferralCode(), createdAt: new Date().toISOString() };
      db.users[user.id] = user;
      track(db, 'signup_completed');
    }
    db.sessionUserId = user.id;
    // 비회원 결과를 계정에 연결 (/api/guest/link): 같은 게스트 세션의 결과만 대상
    Object.values(db.charts).filter((c) => c.guestId === db.guestId && !c.ownerUserId).forEach((c) => (c.ownerUserId = user!.id));
    const referral = completeReferral(db, user, { isNewUser: isNew });
    if (referral.status === 'awarded' && !referral.duplicate) track(db, 'referral_reward_approved');
    if (referral.status === 'rejected') track(db, 'referral_reward_rejected');
    return { user, isNew, referral };
  });
}
export const signOut = () => mutate((db) => { db.sessionUserId = null; });

export function currentUser(db: Db): User | null {
  return db.sessionUserId ? db.users[db.sessionUserId] ?? null : null;
}

export const aiFailureSimulated = () => { try { return localStorage.getItem('ohaeng.sim.aifail') === '1'; } catch { return false; } };
export const setAiFailureSimulated = (on: boolean) => { try { on ? localStorage.setItem('ohaeng.sim.aifail', '1') : localStorage.removeItem('ohaeng.sim.aifail'); } catch { /* ignore */ } };

export function createJob(db: Db, ent: Entitlement): Job {
  const ex = Object.values(db.jobs).find((j) => j.entitlementId === ent.id);
  if (ex) return ex;
  const job: Job = { id: uid('job_'), entitlementId: ent.id, status: 'queued', attempts: 0, createdAt: new Date().toISOString() };
  db.jobs[job.id] = job;
  if (!ent.reportId) {
    const rid = uid('rpt_');
    db.reports[rid] = { id: rid, userId: ent.userId, productId: ent.productId, subjectId: ent.subjectId, report: null, generatedAt: '' };
    ent.reportId = rid;
  }
  job.reportId = ent.reportId;
  track(db, 'report_requested', { product_id: ent.productId });
  return job;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inflight = new Set<string>();
/** 새로고침 등으로 'running' 상태만 남고 실제 작업은 없는 경우를 구분 */
export const isJobInflight = (id: string) => inflight.has(id);

/**
 * 비동기 리포트 생성. 최초 시도 + 재시도 2회(총 3회). 이미 저장된 리포트가 있으면 재생성하지 않는다(재열람 시 AI 재호출 금지).
 * 최종 실패 시 주문·권한·오류 이력을 보존하고 복구/환불 요청 동선으로 연결된다.
 */
export async function runJob(jobId: string): Promise<void> {
  const start = getDb().jobs[jobId];
  if (!start || inflight.has(jobId) || start.status === 'succeeded') return;
  inflight.add(jobId);
  mutate((db) => { db.jobs[jobId].status = 'running'; });
  for (let i = 0; i < MAX_REPORT_ATTEMPTS; i++) {
    mutate((db) => { db.jobs[jobId].attempts += 1; });
    await sleep(700);
    try {
      if (aiFailureSimulated()) throw new Error('SIMULATED_MODEL_ERROR');
      mutate((db) => {
        const job = db.jobs[jobId];
        const ent = db.entitlements[job.entitlementId];
        if (ent.reportId && db.reports[ent.reportId]?.report) { job.status = 'succeeded'; job.reportId = ent.reportId; return; } // 재열람/중복 실행 시 AI 재호출 금지
        const now = new Date();
        const baseYear = kstParts(now).year;
        let report;
        let expiresAt: string | undefined;
        if (ent.productId === 'compatibility') {
          const sess = db.compat[ent.subjectId];
          if (!sess?.inputA || !sess.inputB) throw new Error('COMPAT_INPUT_MISSING');
          report = generateReport({ productId: 'compatibility', facts: calculator.calculate(sess.inputA), factsB: calculator.calculate(sess.inputB), baseYear });
          expiresAt = new Date(now.getTime() + COMPAT_RETENTION_DAYS * 86400000).toISOString();
          sess.expiresAt = expiresAt;
        } else {
          const chart = db.charts[ent.subjectId];
          if (!chart) throw new Error('CHART_MISSING');
          report = generateReport({ productId: ent.productId, facts: chart.facts, baseYear });
        }
        const rid = ent.reportId as string;
        const stored = db.reports[rid];
        stored.report = report;
        stored.generatedAt = now.toISOString();
        stored.expiresAt = expiresAt;
        if (ent.productId === 'compatibility') db.compat[ent.subjectId].reportId = rid;
        job.reportId = rid;
        job.status = 'succeeded';
        job.lastError = undefined;
        track(db, 'report_ready', { product_id: ent.productId });
        if (expiresAt) db.deletionJobs.push({ id: uid('del_'), resourceType: 'compat_session', resourceId: ent.subjectId, dueAt: expiresAt });
      });
      inflight.delete(jobId);
      return;
    } catch (e) {
      mutate((db) => { db.jobs[jobId].lastError = (e as Error).message; });
    }
  }
  inflight.delete(jobId);
  mutate((db) => { db.jobs[jobId].status = 'failed'; track(db, 'report_failed'); });
}

export function retryJob(jobId: string) {
  mutate((db) => { const j = db.jobs[jobId]; if (j && j.status === 'failed') { j.status = 'queued'; j.attempts = 0; } });
  return runJob(jobId);
}

/** 궁합 30일 만료 삭제: 상대 출생정보·리포트 본문을 지우고 주문/결제 기록은 그대로 둔다. */
export function purgeExpired(db: Db, now = new Date()): number {
  let n = 0;
  for (const s of Object.values(db.compat)) {
    if (s.deletedAt || !s.expiresAt || new Date(s.expiresAt) > now) continue;
    s.inputA = null; s.inputB = null; s.deletedAt = now.toISOString();
    if (s.reportId && db.reports[s.reportId]) { db.reports[s.reportId].report = null; db.reports[s.reportId].deletedAt = now.toISOString(); }
    db.deletionJobs.filter((j) => j.resourceId === s.id && !j.completedAt).forEach((j) => (j.completedAt = now.toISOString()));
    n++;
  }
  return n;
}

export type ReportAccess = { ok: true; stored: NonNullable<ReturnType<typeof findStored>> } | { ok: false; reason: 'NOT_FOUND' | 'FORBIDDEN' | 'EXPIRED' | 'PENDING' };
const findStored = (db: Db, id: string) => db.reports[id];
/** 소유자만 조회 가능 (RLS 의 `user_id = auth.uid()` 에 대응) */
export function accessReport(db: Db, reportId: string, userId: string | null, now = new Date()): ReportAccess {
  const r = findStored(db, reportId);
  if (!r) return { ok: false, reason: 'NOT_FOUND' };
  if (!userId || r.userId !== userId) return { ok: false, reason: 'FORBIDDEN' };
  if (r.deletedAt || (r.expiresAt && new Date(r.expiresAt) <= now)) return { ok: false, reason: 'EXPIRED' };
  if (!r.report) return { ok: false, reason: 'PENDING' };
  return { ok: true, stored: r };
}

export function entitlementFor(db: Db, userId: string, productId: ProductId, subjectId: string) {
  return Object.values(db.entitlements).find((e) => e.userId === userId && e.productId === productId && e.subjectId === subjectId && e.status === 'active');
}

/** [샌드박스 전용] 친구가 내 링크로 무료 체험 후 가입하는 흐름을 시뮬레이션. 실제 completeReferral 규칙을 그대로 통과한다. */
export function simulateFriendSignup(referrerId: string): ReferralOutcome {
  return mutate((db) => {
    const referrer = db.users[referrerId];
    const keep = { g: db.guestId, s: db.sessionUserId, a: db.activeChartId, p: db.pendingRefCode };
    db.guestId = uid('guest_sim_');
    captureReferral(db, referrer.referralCode);
    const facts = calculator.calculate({ calendar: 'solar', leapMonth: false, year: 1990 + Math.floor(Math.random() * 20), month: 1 + Math.floor(Math.random() * 12), day: 1 + Math.floor(Math.random() * 28), timeUnknown: true, country: 'KR' });
    const cid = `${facts.chartId}_${db.guestId.slice(-6)}`;
    db.charts[cid] = { id: cid, guestId: db.guestId, input: { calendar: 'solar', leapMonth: false, year: 0, month: 0, day: 0, timeUnknown: true, country: 'KR' }, facts, character: buildCharacter(facts), createdAt: new Date().toISOString() };
    const friend: User = { id: uid('usr_sim_'), email: `sim_${uid()}@sandbox.invalid`, nickname: '시뮬레이션 친구', referralCode: newReferralCode(), createdAt: new Date().toISOString() };
    db.users[friend.id] = friend;
    const out = completeReferral(db, friend, { isNewUser: true });
    db.guestId = keep.g; db.sessionUserId = keep.s; db.activeChartId = keep.a; db.pendingRefCode = keep.p;
    return out;
  });
}
