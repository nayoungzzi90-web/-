import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmationDialog, ErrorState, MockNotice } from '../components/Common';
import { CATALOG, ProductId, orderItemName, won } from '../lib/catalog';
import { flags } from '../lib/flags';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { confirmPayment, mockProvider, PayError } from '../lib/mock/payment';
import { createJob, runJob } from '../lib/mock/service';

export default function Checkout() {
  const { orderId = '' } = useParams();
  const { db, user } = useSession();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [cancel, setCancel] = useState(false);
  const order = db.orders[orderId];

  if (!user) return <ErrorState title="로그인이 필요해요" message="결제는 로그인 후 진행돼요." action={<Link className="btn" to={`/login?next=${encodeURIComponent(`/checkout/${orderId}`)}`}>로그인</Link>} />;
  if (!order || order.userId !== user.id) return <ErrorState title="주문을 찾을 수 없어요" message="내 주문이 아니거나 존재하지 않는 주문이에요." action={<Link className="btn" to="/">홈으로</Link>} />;
  const isCoin = order.productId === 'coin_pack';
  const itemName = orderItemName(order.productId, order.subjectId);
  const backPath = isCoin ? '/rewards' : CATALOG[order.productId as ProductId].path;
  const ent = Object.values(db.entitlements).find((e) => e.orderId === order.id);

  async function pay(amount = order.amountKrw) {
    if (busy) return; // 중복 클릭 방지
    setBusy(true); setMsg(null);
    try {
      const { paymentKey } = await mockProvider.authorize(order); // 인증 단계(승인 아님)
      // 서버 승인: orderId·amount·paymentKey 를 주문과 대조한 뒤에만 열람 권한 생성
      const res = mutate((d) => {
        const r = confirmPayment(d, { orderId: order.id, userId: user!.id, paymentKey, amount });
        if (!r.duplicate) track(d, 'payment_approved', { product_id: order.productId });
        if (!r.entitlement) return null; // 엽전 충전: 리포트 없음
        const job = createJob(d, r.entitlement);
        return { reportId: d.entitlements[r.entitlement.id].reportId!, jobId: job.id };
      });
      if (!res) { nav('/rewards?charged=' + order.id); return; }
      void runJob(res.jobId);
      nav(`/reports/${res.reportId}`);
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof PayError ? `${e.message} (${e.code})` : '결제를 처리하지 못했어요. 결제가 되지 않았으니 다시 시도해 주세요.' });
      setBusy(false);
    }
  }

  return (
    <div>
      <MockNotice>테스트 모드 결제예요. 실제로 청구되지 않고, 승인 로직(주문 번호·금액 검증)만 시뮬레이션해요.</MockNotice>
      <h1>결제</h1>
      <section className="card">
        <div className="row between"><b>{itemName}</b><b>{won(order.amountKrw)}</b></div>
        <p className="muted small" style={{ marginBottom: 0 }}>주문 번호 {order.id} · 상태 {order.status === 'paid' ? '결제 완료' : order.status === 'pending' ? '결제 대기' : order.status}</p>
      </section>
      {order.status === 'paid' && isCoin ? (
        <Link className="btn teal block" to="/rewards">내 엽전 보기</Link>
      ) : order.status === 'paid' && ent?.reportId ? (
        <Link className="btn teal block" to={`/reports/${ent.reportId}`}>리포트 보기</Link>
      ) : order.status === 'pending' ? (
        <div className="stack">
          <button className="btn block" onClick={() => pay()} disabled={busy}>{busy ? '처리 중…' : `테스트 결제 ${won(order.amountKrw)}`}</button>
          <button className="btn ghost block" onClick={() => setCancel(true)} disabled={busy}>결제 취소하고 돌아가기</button>
          {flags.livePayment ? null : <p className="muted small">실제 결제(PG)는 계약과 심사가 끝난 뒤 관리자 승인으로 켜져요.</p>}
          <details className="sandbox"><summary><b>샌드박스 검증 도구</b></summary>
            <p className="muted small">클라이언트가 금액을 바꿔 보내도 서버가 거절하는지 확인해요.</p>
            <button className="btn sm ghost" onClick={() => pay(1)} disabled={busy}>금액을 1원으로 변조해 결제 시도</button>
          </details>
        </div>
      ) : <div className="notice">이 주문은 더 이상 결제할 수 없어요 ({order.status}).</div>}
      {msg && <div className={`notice ${msg.kind}`} role="alert">{msg.text}</div>}
      <ConfirmationDialog open={cancel} title="결제를 취소할까요?" confirmLabel="취소하기" cancelLabel="계속 결제" onCancel={() => setCancel(false)} onConfirm={() => { mutate((d) => { d.orders[order.id].status = 'cancelled'; }); nav(backPath); }}>
        <p>아직 결제되지 않았어요. 취소하면 주문이 닫혀요.</p>
      </ConfirmationDialog>
    </div>
  );
}
