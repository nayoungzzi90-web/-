import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATALOG, ProductId, won } from '../lib/catalog';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { CoinError, redeemCoins } from '../lib/mock/ledger';
import { createOrder, PayError } from '../lib/mock/payment';
import { createJob, runJob } from '../lib/mock/service';
import { ConfirmationDialog } from './Common';

/**
 * 구매 영역: 현금(테스트 결제) 또는 업전 교환.
 * 가격·업전 수량 표시는 서버 카탈로그 값이고, 주문 금액은 서버가 다시 조회한다.
 */
export function PurchasePanel({ productId, getSubjectId, existingReportId, blockedReason, nextPath }: { productId: ProductId; getSubjectId: () => string; existingReportId?: string; blockedReason?: string; nextPath: string }) {
  const p = CATALOG[productId];
  const { user, balance } = useSession();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (existingReportId) {
    return <Link className="btn teal block" to={`/reports/${existingReportId}`}>내 리포트 보기</Link>;
  }
  const needLogin = () => nav(`/login?next=${encodeURIComponent(nextPath)}`);

  function buyCash() {
    setError('');
    if (!user) return needLogin();
    try {
      const subject = getSubjectId();
      const orderId = mutate((db) => { const o = createOrder(db, user.id, productId, subject); track(db, 'checkout_started', { product_id: productId, method: 'cash' }); return o.id; });
      nav(`/checkout/${orderId}`);
    } catch (e) { setError(e instanceof PayError || e instanceof Error ? e.message : '주문을 만들지 못했어요.'); }
  }
  function redeem() {
    setConfirm(false);
    if (!user || busy) return;
    setBusy(true); // 중복 클릭 방지 (서버에서도 idempotency key 로 한 번만 처리)
    try {
      const subject = getSubjectId();
      const { reportId, jobId } = mutate((db) => {
        const r = redeemCoins(db, user.id, productId, subject);
        const job = createJob(db, r.entitlement);
        if (!r.duplicate) track(db, 'coin_redeemed', { product_id: productId });
        return { reportId: db.entitlements[r.entitlement.id].reportId!, jobId: job.id };
      });
      void runJob(jobId);
      nav(`/reports/${reportId}`);
    } catch (e) {
      setError(e instanceof CoinError ? e.message : e instanceof Error ? e.message : '교환하지 못했어요.');
      setBusy(false);
    }
  }
  const short = user && balance < p.coinCost;
  return (
    <div className="card" style={{ borderColor: 'var(--red)' }}>
      <div className="row between"><h2 style={{ margin: 0 }}>{p.name}</h2><span className="price">{won(p.priceKrw)}<small>또는 업전 {p.coinCost}냥</small></span></div>
      {blockedReason ? <div className="notice" style={{ marginTop: 12 }}>{blockedReason}</div> : (
        <div className="stack" style={{ marginTop: 12 }}>
          <button className="btn block" onClick={buyCash} disabled={busy}>{p.name} {won(p.priceKrw)}에 보기</button>
          <button className="btn secondary block" onClick={() => (user ? setConfirm(true) : needLogin())} disabled={busy || !!short}>업전 {p.coinCost}냥으로 열람</button>
          {user ? <p className="muted small" style={{ margin: 0 }}>보유 업전 {balance}냥 {short && <>· {p.coinCost - balance}냥 부족해요. <Link to="/invite">친구 초대로 모으기</Link></>}</p> : <p className="muted small" style={{ margin: 0 }}>결제·교환 직전에 로그인이 필요해요. 무료 체험 결과는 그대로 이어져요.</p>}
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      <ConfirmationDialog open={confirm} title="업전으로 열람할까요?" confirmLabel={`${p.coinCost}냥 사용`} onConfirm={redeem} onCancel={() => setConfirm(false)}>
        <p>업전 {p.coinCost}냥이 차감되고 바로 리포트 생성이 시작돼요. (현재 {balance}냥 → {balance - p.coinCost}냥) 업전은 현금으로 환급되지 않아요.</p>
      </ConfirmationDialog>
    </div>
  );
}
