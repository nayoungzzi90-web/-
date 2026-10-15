import { CATALOG, COIN_PACKS, ProductId } from '../catalog';
import { flags } from '../flags';
import { uid } from '../hash';
import type { Db, Entitlement, Order, Payment } from './db';
import { appendLedger } from './ledger';

export class PayError extends Error {
  constructor(public code: 'PRODUCT_UNAVAILABLE' | 'ORDER_NOT_FOUND' | 'AMOUNT_MISMATCH' | 'LIVE_PAYMENT_DISABLED' | 'FORBIDDEN' | 'INVALID_STATE', message: string) { super(message); }
}

/** PG 추상화. 실제 PG(토스페이먼츠 등)는 계약·900원 결제 가능 여부 확인 후 서버 어댑터로 추가한다. */
export interface PaymentProvider {
  readonly name: string;
  readonly isLive: boolean;
  /** 결제창 인증 단계. 성공해도 이는 "승인"이 아니라 paymentKey 발급일 뿐이다. */
  authorize(order: Pick<Order, 'id' | 'amountKrw'>): Promise<{ paymentKey: string }>;
}

export const mockProvider: PaymentProvider = {
  name: 'mock',
  isLive: false,
  authorize: async (order) => ({ paymentKey: `mock_${order.id}` }),
};

/** 주문 생성: 가격은 서버 카탈로그에서 읽는다. 멱등키가 같으면 기존 주문을 반환. */
export function createOrder(db: Db, userId: string, productId: ProductId, subjectId: string, now = new Date()): Order {
  const p = CATALOG[productId];
  if (p.status !== 'active') throw new PayError('PRODUCT_UNAVAILABLE', '아직 구매할 수 없는 상품이에요.');
  const key = `cash:${userId}:${productId}:${subjectId}`;
  const ex = Object.values(db.orders).find((o) => o.idempotencyKey === key);
  if (ex) return ex;
  const order: Order = { id: uid('ord_'), userId, productId, subjectId, amountKrw: p.priceKrw, coinCost: 0, method: 'cash', status: 'pending', idempotencyKey: key, createdAt: now.toISOString() };
  db.orders[order.id] = order;
  return order;
}

/** 엽전 충전 주문: 팩 가격은 서버 카탈로그에서 읽는다. 같은 팩의 미결제 주문은 재사용(중복 클릭 방지), 결제 완료된 팩은 다시 살 수 있다. */
export function createCoinOrder(db: Db, userId: string, packId: string, now = new Date()): Order {
  const pack = COIN_PACKS.find((c) => c.id === packId);
  if (!pack) throw new PayError('PRODUCT_UNAVAILABLE', '존재하지 않는 엽전 상품이에요.');
  const pending = Object.values(db.orders).find((o) => o.userId === userId && o.productId === 'coin_pack' && o.subjectId === packId && o.status === 'pending');
  if (pending) return pending;
  const id = uid('ord_');
  const order: Order = { id, userId, productId: 'coin_pack', subjectId: packId, amountKrw: pack.priceKrw, coinCost: 0, method: 'cash', status: 'pending', idempotencyKey: `coin:${userId}:${packId}:${id}`, createdAt: now.toISOString() };
  db.orders[id] = order;
  return order;
}

/**
 * 결제 승인 확정(서버 전용 로직). redirect 성공만으로 권한을 주지 않고
 * orderId · amount · paymentKey 를 서버 주문과 대조한 뒤에만 entitlement 를 만든다.
 */
export function confirmPayment(db: Db, args: { orderId: string; userId: string; paymentKey: string; amount: number; now?: Date }): { order: Order; payment: Payment; entitlement: Entitlement | null; duplicate: boolean } {
  const now = args.now ?? new Date();
  const order = db.orders[args.orderId];
  if (!order) throw new PayError('ORDER_NOT_FOUND', '주문을 찾을 수 없어요.');
  if (order.userId !== args.userId) throw new PayError('FORBIDDEN', '내 주문이 아니에요.');
  if (order.method !== 'cash') throw new PayError('INVALID_STATE', '현금 주문이 아니에요.');

  const prior = Object.values(db.payments).find((p) => p.orderId === order.id);
  if (prior && order.status === 'paid') {
    const ent = Object.values(db.entitlements).find((e) => e.orderId === order.id) ?? null;
    return { order, payment: prior, entitlement: ent, duplicate: true }; // 중복 웹훅
  }
  if (args.amount !== order.amountKrw) throw new PayError('AMOUNT_MISMATCH', '결제 금액이 주문과 달라요. 결제가 처리되지 않았어요.');
  if (!flags.livePayment && !args.paymentKey.startsWith('mock_')) throw new PayError('LIVE_PAYMENT_DISABLED', '실제 결제는 아직 비활성화되어 있어요.');
  if (order.status !== 'pending') throw new PayError('INVALID_STATE', '결제할 수 없는 주문 상태예요.');

  const payment: Payment = { id: uid('pay_'), orderId: order.id, provider: flags.livePayment ? 'pg' : 'mock', paymentKey: args.paymentKey, approvedAmount: args.amount, status: 'approved', createdAt: now.toISOString() };
  db.payments[payment.id] = payment;
  order.status = 'paid';
  if (order.productId === 'coin_pack') {
    // 엽전 충전: 승인 후에만 원장에 적립(멱등키 = 주문). 환불·사용분 처리 정책은 법률 검토 대상.
    const pack = COIN_PACKS.find((c) => c.id === order.subjectId)!;
    appendLedger(db, { userId: order.userId, delta: pack.coins, reason: 'coin_purchase', sourceId: order.id, idempotencyKey: `coin_purchase:${order.id}`, now });
    return { order, payment, entitlement: null, duplicate: false };
  }
  const entitlement: Entitlement = { id: uid('ent_'), userId: order.userId, orderId: order.id, productId: order.productId as ProductId, subjectId: order.subjectId, status: 'active', idempotencyKey: `order:${order.id}`, createdAt: now.toISOString() };
  db.entitlements[entitlement.id] = entitlement;
  return { order, payment, entitlement, duplicate: false };
}

/** 환불 *요청*만 기록한다. 실제 환불 완료는 PG 처리 확인 후 관리자가 처리하며, 요청을 '환불 완료'로 표시하지 않는다. */
export function requestRefund(db: Db, userId: string, orderId: string, reason: string, now = new Date()) {
  const order = db.orders[orderId];
  if (!order || order.userId !== userId) throw new PayError('FORBIDDEN', '내 주문이 아니에요.');
  if (db.refunds.some((r) => r.orderId === orderId)) return db.refunds.find((r) => r.orderId === orderId)!;
  const r = { id: uid('rf_'), orderId, userId, status: 'requested' as const, reason, createdAt: now.toISOString() };
  db.refunds.push(r);
  order.status = 'refund_requested';
  return r;
}
