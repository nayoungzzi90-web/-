import { CATALOG, ProductId } from '../catalog';
import { uid } from '../hash';
import type { Db, Entitlement, LedgerEntry, Order } from './db';

export class CoinError extends Error {
  constructor(public code: 'INSUFFICIENT_COINS' | 'PRODUCT_UNAVAILABLE' | 'NOT_SIGNED_IN', message: string) { super(message); }
}

export const balanceOf = (db: Db, userId: string) => db.ledger.filter((l) => l.userId === userId).reduce((s, l) => s + l.delta, 0);

/** append-only 원장. idempotency_key 가 같으면 새 행을 만들지 않는다. 잔액이 음수가 되는 차감은 거부. */
export function appendLedger(db: Db, e: { userId: string; delta: number; reason: string; sourceId: string; idempotencyKey: string; now?: Date }): { entry: LedgerEntry; duplicate: boolean } {
  const existing = db.ledger.find((l) => l.idempotencyKey === e.idempotencyKey);
  if (existing) return { entry: existing, duplicate: true };
  const bal = balanceOf(db, e.userId);
  if (bal + e.delta < 0) throw new CoinError('INSUFFICIENT_COINS', `엽전이 부족해요. (보유 ${bal}닢)`);
  const entry: LedgerEntry = { id: uid('led_'), userId: e.userId, delta: e.delta, reason: e.reason, sourceId: e.sourceId, balanceAfter: bal + e.delta, idempotencyKey: e.idempotencyKey, createdAt: (e.now ?? new Date()).toISOString() };
  db.ledger.push(entry);
  return { entry, duplicate: false };
}

/**
 * 엽전 교환: 잔액 검증 → 차감 → 주문 → 열람 권한 생성을 한 번에 처리.
 * (서버에서는 단일 DB 트랜잭션/RPC + 행 잠금으로 구현. supabase/migrations 의 redeem_coins 참고)
 * 가격은 클라이언트 값이 아니라 서버 카탈로그에서만 읽는다.
 */
export function redeemCoins(db: Db, userId: string, productId: ProductId, subjectId: string, now = new Date()): { order: Order; entitlement: Entitlement; duplicate: boolean } {
  const p = CATALOG[productId];
  if (p.status !== 'active') throw new CoinError('PRODUCT_UNAVAILABLE', '아직 교환할 수 없는 상품이에요.');
  const key = `redeem:${userId}:${productId}:${subjectId}`;
  const ex = Object.values(db.entitlements).find((e) => e.idempotencyKey === key);
  if (ex) return { order: db.orders[ex.orderId], entitlement: ex, duplicate: true };

  appendLedger(db, { userId, delta: -p.coinCost, reason: 'redeem', sourceId: key, idempotencyKey: key, now });
  const order: Order = { id: uid('ord_'), userId, productId, subjectId, amountKrw: 0, coinCost: p.coinCost, method: 'coin', status: 'paid', idempotencyKey: key, createdAt: now.toISOString() };
  db.orders[order.id] = order;
  const entitlement: Entitlement = { id: uid('ent_'), userId, orderId: order.id, productId, subjectId, status: 'active', idempotencyKey: key, createdAt: now.toISOString() };
  db.entitlements[entitlement.id] = entitlement;
  return { order, entitlement, duplicate: false };
}
