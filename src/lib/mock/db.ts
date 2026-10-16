import { useSyncExternalStore } from 'react';
import type { OrderItem, ProductId } from '../catalog';
import type { CharacterResult } from '../content/characters';
import type { Report } from '../content/report';
import type { BirthInput, SajuFacts } from '../saju/types';
import { uid } from '../hash';

/**
 * ⚠️ MOCK 백엔드: 브라우저 localStorage 에만 저장한다.
 * 실제 서비스에서는 supabase/migrations 의 스키마 + RLS + Edge Function 이 동일한 규칙을 서버에서 강제한다.
 * 여기 있는 비즈니스 규칙 함수(ledger/referral/payment)는 그 서버 로직의 참조 구현이자 테스트 대상이다.
 */
export interface User { id: string; email: string; nickname: string; referralCode: string; createdAt: string; referredBy?: string }
export interface StoredChart { id: string; guestId: string; ownerUserId?: string; input: BirthInput; facts: SajuFacts; character: CharacterResult; createdAt: string; /** 리포트에 반영할 고민(선택, 이 기기에만 저장) */ concern?: string }
export interface LedgerEntry { id: string; userId: string; delta: number; reason: string; sourceId: string; balanceAfter: number; idempotencyKey: string; createdAt: string }
export interface Order { id: string; userId: string; productId: OrderItem; subjectId: string; amountKrw: number; coinCost: number; method: 'cash' | 'coin'; status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_requested'; idempotencyKey: string; createdAt: string }
export interface Payment { id: string; orderId: string; provider: string; paymentKey: string; approvedAmount: number; status: 'approved'; createdAt: string }
export interface Entitlement { id: string; userId: string; orderId: string; productId: ProductId; subjectId: string; reportId?: string; status: 'active'; idempotencyKey: string; createdAt: string }
export interface StoredReport { id: string; userId: string; productId: ProductId; subjectId: string; report: Report | null; generatedAt: string; expiresAt?: string; deletedAt?: string }
export interface Job { id: string; entitlementId: string; reportId?: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; attempts: number; lastError?: string; createdAt: string }
export interface Attribution { id: string; guestId: string; code: string; referrerUserId: string; capturedAt: string; status: 'captured' | 'rewarded' | 'rejected'; referredUserId?: string; reason?: string }
export interface RewardRec { id: string; referrerUserId: string; referredUserId: string; coins: number; status: 'approved' | 'rejected'; reason?: string; kstDate: string; idempotencyKey: string; createdAt: string }
export interface CompatSession { id: string; buyerUserId: string; inputA: BirthInput | null; inputB: BirthInput | null; reportId?: string; expiresAt?: string; deletedAt?: string }
export interface RefundRequest { id: string; orderId: string; userId: string; status: 'requested'; reason: string; createdAt: string }
export interface DeletionJob { id: string; resourceType: string; resourceId: string; dueAt: string; completedAt?: string }
export interface AppEvent { id: string; name: string; at: string; props: Record<string, string | number | boolean> }

export interface Db {
  guestId: string;
  sessionUserId: string | null;
  activeChartId: string | null;
  pendingRefCode: string | null;
  users: Record<string, User>;
  charts: Record<string, StoredChart>;
  daily: Record<string, unknown>;
  ledger: LedgerEntry[];
  orders: Record<string, Order>;
  payments: Record<string, Payment>;
  entitlements: Record<string, Entitlement>;
  reports: Record<string, StoredReport>;
  jobs: Record<string, Job>;
  attributions: Attribution[];
  rewards: RewardRec[];
  compat: Record<string, CompatSession>;
  refunds: RefundRequest[];
  deletionJobs: DeletionJob[];
  events: AppEvent[];
}

export const emptyDb = (): Db => ({
  guestId: uid('guest_'), sessionUserId: null, activeChartId: null, pendingRefCode: null,
  users: {}, charts: {}, daily: {}, ledger: [], orders: {}, payments: {}, entitlements: {}, reports: {}, jobs: {},
  attributions: [], rewards: [], compat: {}, refunds: [], deletionJobs: [], events: [],
});

const KEY = 'ohaeng.mock.db.v1';
let state: Db = load();
let version = 0;
const listeners = new Set<() => void>();

function load(): Db {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return { ...emptyDb(), ...JSON.parse(raw) };
  } catch { /* 저장소 접근 불가 시 메모리로만 동작 */ }
  return emptyDb();
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const getDb = () => state;
export function mutate<T>(fn: (db: Db) => T): T {
  const r = fn(state);
  version++;
  persist();
  listeners.forEach((l) => l());
  return r;
}
export function resetDb() {
  state = emptyDb();
  version++;
  persist();
  listeners.forEach((l) => l());
}
export function useDb(): Db {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return state;
}

/** 분석 이벤트: 출생정보·상대 정보·리포트 본문은 절대 넣지 않는다. */
const ALLOWED_PROP_KEYS = new Set(['product_id', 'source_channel', 'step', 'method', 'status']);
export function track(db: Db, name: string, props: Record<string, string | number | boolean> = {}) {
  const safe: AppEvent['props'] = {};
  for (const [k, v] of Object.entries(props)) if (ALLOWED_PROP_KEYS.has(k)) safe[k] = v;
  db.events.push({ id: uid('ev_'), name, at: new Date().toISOString(), props: safe });
  if (db.events.length > 300) db.events.splice(0, db.events.length - 300);
}
