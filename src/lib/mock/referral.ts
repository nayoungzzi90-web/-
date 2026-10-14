import { REFERRAL } from '../catalog';
import { uid } from '../hash';
import { kstDate, kstMonthKey } from '../kst';
import type { Db, RewardRec, User } from './db';
import { appendLedger } from './ledger';

export type ReferralOutcome =
  | { status: 'none' }
  | { status: 'pending'; reason: 'trial_incomplete' }
  | { status: 'awarded'; coins: number; duplicate: boolean }
  | { status: 'rejected'; reason: 'self_referral' | 'existing_member' | 'daily_cap' | 'monthly_cap' | 'unknown_code' };

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** 추측이 어려운 10자리 코드 (30^10). 서버에서는 CSPRNG + UNIQUE 제약. */
export function newReferralCode(): string {
  const buf = new Uint8Array(10);
  (globalThis.crypto ?? ({ getRandomValues: (a: Uint8Array) => a.map(() => Math.floor(Math.random() * 256)) } as Crypto)).getRandomValues(buf);
  return Array.from(buf, (b) => CHARS[b % CHARS.length]).join('');
}

/** 링크 방문 시 추천 코드를 방문(게스트)에 귀속. 마지막 유효 링크가 우선. 공유/복사만으로는 업전이 지급되지 않는다. */
export function captureReferral(db: Db, code: string, now = new Date()): boolean {
  const referrer = Object.values(db.users).find((u) => u.referralCode === code);
  db.pendingRefCode = code;
  if (!referrer) return false;
  db.attributions.push({ id: uid('attr_'), guestId: db.guestId, code, referrerUserId: referrer.id, capturedAt: now.toISOString(), status: 'captured' });
  return true;
}

/**
 * 무료 체험 완료 + 신규 가입 확인 후 추천인에게 2냥.
 * 멱등: 같은 (추천인, 피추천인) 조합은 한 번만 지급. 한도: 추천인 기준 KST 일 5건 / 월 30건.
 */
export function completeReferral(db: Db, referred: User, opts: { isNewUser: boolean; now?: Date }): ReferralOutcome {
  const now = opts.now ?? new Date();
  const attr = [...db.attributions].reverse().find((a) => a.guestId === db.guestId);
  if (!attr) return { status: 'none' };

  const prior = db.rewards.find((r) => r.referredUserId === referred.id && r.referrerUserId === attr.referrerUserId);
  if (prior) return prior.status === 'approved' ? { status: 'awarded', coins: prior.coins, duplicate: true } : { status: 'rejected', reason: (prior.reason as 'self_referral') ?? 'existing_member' };

  const reject = (reason: 'self_referral' | 'existing_member' | 'daily_cap' | 'monthly_cap'): ReferralOutcome => {
    record('rejected', 0, reason);
    attr.status = 'rejected';
    attr.reason = reason;
    attr.referredUserId = referred.id;
    return { status: 'rejected', reason };
  };
  const record = (status: RewardRec['status'], coins: number, reason?: string) => {
    db.rewards.push({ id: uid('rwd_'), referrerUserId: attr.referrerUserId, referredUserId: referred.id, coins, status, reason, kstDate: kstDate(now), idempotencyKey: `referral:${attr.referrerUserId}:${referred.id}`, createdAt: now.toISOString() });
  };

  if (attr.referrerUserId === referred.id) return reject('self_referral');
  if (!opts.isNewUser) return reject('existing_member');
  const trialDone = Object.values(db.charts).some((c) => c.guestId === db.guestId);
  if (!trialDone) return { status: 'pending', reason: 'trial_incomplete' };

  const approved = db.rewards.filter((r) => r.referrerUserId === attr.referrerUserId && r.status === 'approved');
  const today = kstDate(now), month = kstMonthKey(now);
  if (approved.filter((r) => r.kstDate === today).length >= REFERRAL.dailyCap) return reject('daily_cap');
  if (approved.filter((r) => r.kstDate.startsWith(month)).length >= REFERRAL.monthlyCap) return reject('monthly_cap');

  const key = `referral:${attr.referrerUserId}:${referred.id}`;
  appendLedger(db, { userId: attr.referrerUserId, delta: REFERRAL.rewardCoins, reason: 'referral_reward', sourceId: referred.id, idempotencyKey: key, now });
  record('approved', REFERRAL.rewardCoins);
  referred.referredBy = attr.referrerUserId;
  attr.status = 'rewarded';
  attr.referredUserId = referred.id;
  return { status: 'awarded', coins: REFERRAL.rewardCoins, duplicate: false };
}

export const referralStats = (db: Db, userId: string, now = new Date()) => {
  const mine = db.rewards.filter((r) => r.referrerUserId === userId);
  const ok = mine.filter((r) => r.status === 'approved');
  return {
    total: ok.length,
    today: ok.filter((r) => r.kstDate === kstDate(now)).length,
    month: ok.filter((r) => r.kstDate.startsWith(kstMonthKey(now))).length,
    rejected: mine.filter((r) => r.status === 'rejected').length,
    captured: db.attributions.filter((a) => a.referrerUserId === userId).length,
  };
};
