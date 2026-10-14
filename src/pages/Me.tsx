import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmationDialog, ErrorState } from '../components/Common';
import { CATALOG, won } from '../lib/catalog';
import { resetDb } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { aiFailureSimulated, setAiFailureSimulated, signOut } from '../lib/mock/service';

const ORDER_KO: Record<string, string> = { pending: '결제 대기', paid: '결제 완료', failed: '실패', cancelled: '취소됨', refund_requested: '환불 요청됨' };

export default function Me() {
  const { db, user, chart } = useSession();
  const nav = useNavigate();
  const [del, setDel] = useState(false);
  const [fail, setFail] = useState(aiFailureSimulated());
  if (!user) {
    return (
      <div>
        <h1>MY</h1>
        <ErrorState title="로그인이 필요해요" message="구매 내역과 리포트는 로그인 후 볼 수 있어요." action={<Link className="btn" to="/login?next=/me">로그인 · 가입</Link>} />
        {chart && <Link className="btn secondary block" to={`/character/result/${chart.id}`}>무료 캐릭터 결과 보기</Link>}
      </div>
    );
  }
  const orders = Object.values(db.orders).filter((o) => o.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reports = Object.values(db.reports).filter((r) => r.userId === user.id).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const myCharts = Object.values(db.charts).filter((c) => c.ownerUserId === user.id);
  return (
    <div>
      <h1>MY</h1>
      <div className="card"><b>{user.nickname}</b><br /><span className="muted small">{user.email}</span></div>

      <section className="card">
        <h2>내 캐릭터</h2>
        {myCharts.length === 0 ? <p className="muted">저장된 캐릭터가 없어요.</p> : (
          <ul className="list-plain">{myCharts.map((c) => (
            <li key={c.id}><Link to={`/character/result/${c.id}`}>{c.character.name}</Link> <span className="muted small">· {c.input.alias || '별칭 없음'}</span></li>
          ))}</ul>
        )}
        <p className="muted small" style={{ marginBottom: 0 }}>출생 정보를 바꾸면 새로운 계산 결과가 만들어지고, 이미 구매한 리포트는 변경되지 않아요.</p>
      </section>

      <section className="card">
        <h2>내 리포트</h2>
        {reports.length === 0 ? <p className="muted">구매한 리포트가 없어요.</p> : (
          <ul className="list-plain">{reports.map((r) => (
            <li key={r.id} className="row between"><Link to={`/reports/${r.id}`}>{CATALOG[r.productId].name}</Link>
              <span className={`badge ${r.report ? 'ok' : r.deletedAt ? '' : 'mock'}`}>{r.report ? '열람 가능' : r.deletedAt ? '기간 만료' : '생성 중/지연'}</span></li>
          ))}</ul>
        )}
      </section>

      <section className="card">
        <h2>주문 내역</h2>
        {orders.length === 0 ? <p className="muted">주문 내역이 없어요.</p> : (
          <ul className="list-plain">{orders.map((o) => (
            <li key={o.id}><div className="row between"><span>{CATALOG[o.productId].name}</span><span>{o.method === 'coin' ? `${o.coinCost}냥` : won(o.amountKrw)}</span></div>
              <span className="muted small">{o.createdAt.slice(0, 10)} · {o.method === 'coin' ? '업전 교환' : '현금 결제'} · {ORDER_KO[o.status]}</span>
              {o.status === 'pending' && <> · <Link to={`/checkout/${o.id}`}>결제 이어가기</Link></>}</li>
          ))}</ul>
        )}
      </section>

      <section className="card">
        <h2>계정</h2>
        <div className="stack">
          <button className="btn secondary block" onClick={() => { signOut(); nav('/'); }}>로그아웃</button>
          <button className="btn ghost block" onClick={() => setDel(true)}>데이터 삭제 · 탈퇴</button>
        </div>
        <p className="muted small">정식 서비스에서는 삭제 요청이 접수되면 처리 기한과 법적 보존 항목(주문·결제 기록)을 안내해요.</p>
      </section>

      <details className="sandbox"><summary><b>샌드박스 도구</b></summary>
        <label className="check"><input type="checkbox" checked={fail} onChange={(e) => { setFail(e.target.checked); setAiFailureSimulated(e.target.checked); }} />AI 리포트 생성 실패 시뮬레이션 (결제 후 실패·재시도·환불 요청 동선 확인)</label>
      </details>

      <ConfirmationDialog open={del} title="정말 삭제할까요?" confirmLabel="삭제하기" onCancel={() => setDel(false)} onConfirm={() => { resetDb(); setDel(false); nav('/'); }}>
        <p>이 브라우저에 저장된 모든 샌드박스 데이터(캐릭터, 주문, 리포트, 업전)가 지워져요. 되돌릴 수 없어요.</p>
      </ConfirmationDialog>
    </div>
  );
}
