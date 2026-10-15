import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmationDialog, ErrorState, LoadingState, MockNotice, ReportSection } from '../components/Common';
import { CATALOG } from '../lib/catalog';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { requestRefund } from '../lib/mock/payment';
import { accessReport, isJobInflight, purgeExpired, retryJob, runJob } from '../lib/mock/service';

export default function ReportPage() {
  const { id = '' } = useParams();
  const { db, user } = useSession();
  const [refundOpen, setRefundOpen] = useState(false);
  const stored = db.reports[id];
  const ent = Object.values(db.entitlements).find((e) => e.reportId === id);
  const job = ent ? Object.values(db.jobs).find((j) => j.entitlementId === ent.id) : undefined;

  useEffect(() => { mutate((d) => purgeExpired(d)); }, []);
  // 새로고침으로 실행 중 작업이 끊겼다면 이어서 처리 (이미 저장된 리포트는 재생성하지 않음)
  useEffect(() => {
    if (job && (job.status === 'queued' || job.status === 'running') && !isJobInflight(job.id)) void runJob(job.id);
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (stored?.report) mutate((d) => track(d, 'report_view', { product_id: stored.productId })); }, [stored?.report ? stored.id : '']); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <ErrorState title="로그인이 필요해요" message="내 리포트는 로그인 후에 볼 수 있어요." action={<Link className="btn" to={`/login?next=${encodeURIComponent(`/reports/${id}`)}`}>로그인</Link>} />;
  const access = accessReport(db, id, user.id);
  if (!access.ok) {
    if (access.reason === 'PENDING') {
      if (job?.status === 'failed') {
        const order = ent ? db.orders[ent.orderId] : undefined;
        const refunded = order?.status === 'refund_requested';
        return (
          <div>
            <h1>리포트 생성이 지연되고 있어요</h1>
            <div className="notice error" role="alert">자동으로 {job.attempts}번 시도했지만 생성에 실패했어요. 결제(또는 엽전 사용)와 주문 내역은 안전하게 보관돼 있고, <b>다시 결제하지 않아도 돼요.</b></div>
            <div className="stack">
              <button className="btn block" onClick={() => void retryJob(job.id)}>다시 생성 시도</button>
              {order && !refunded && <button className="btn secondary block" onClick={() => setRefundOpen(true)}>환불 요청하기</button>}
              {refunded && <div className="notice ok">환불이 <b>요청</b>되었어요. 운영팀이 확인하고 처리하면 알려 드려요. (처리 완료 전에는 ‘환불 완료’로 표시하지 않아요.)</div>}
              <Link className="btn ghost block" to="/me">주문 내역 보기</Link>
            </div>
            <ConfirmationDialog open={refundOpen} title="환불을 요청할까요?" confirmLabel="환불 요청" onCancel={() => setRefundOpen(false)} onConfirm={() => { mutate((d) => requestRefund(d, user.id, order!.id, 'AI 생성 최종 실패')); setRefundOpen(false); }}>
              <p>요청이 접수되면 운영팀이 결제 수단과 정책에 따라 처리해요. 엽전으로 교환한 주문은 엽전 복구로 안내돼요.</p>
            </ConfirmationDialog>
          </div>
        );
      }
      return (
        <div>
          <h1>리포트를 만들고 있어요</h1>
          <LoadingState label={`생성 중 (시도 ${job?.attempts ?? 0}/3)`} />
          <p className="muted">결제는 다시 하지 않아도 돼요. 이 화면을 닫아도 완료되면 ‘MY’에서 확인할 수 있어요.</p>
        </div>
      );
    }
    const text = { NOT_FOUND: '리포트를 찾을 수 없어요.', FORBIDDEN: '내 리포트가 아니에요. 다른 사람의 리포트는 볼 수 없어요.', EXPIRED: '보관 기간(30일)이 지나 삭제된 리포트예요. 입력 정보와 결과는 복구할 수 없어요.' }[access.reason];
    return <ErrorState title={access.reason === 'EXPIRED' ? '보관 기간이 끝났어요' : '열람할 수 없어요'} message={text} action={access.reason === 'EXPIRED' ? <Link className="btn" to="/products/compatibility">새로 분석하기</Link> : <Link className="btn" to="/me">내 리포트 목록</Link>} />;
  }

  const { report, productId, expiresAt, generatedAt } = access.stored;
  const r = report!;
  const p = CATALOG[productId];
  return (
    <div>
      {r.mode === 'MOCK_SANDBOX' && <MockNotice>이 리포트는 <b>MOCK/SANDBOX 샘플</b>이에요. 실제 AI 해석이 아니며 판매용 품질 검수 전 상태예요.</MockNotice>}
      <p className="muted" style={{ marginBottom: 0 }}>{generatedAt.slice(0, 10)} 생성 · 저장된 리포트 (다시 열어도 같은 내용)</p>
      <h1>{p.name}</h1>
      {r.baseYear && <p className="badge ok">{r.years![0]}~{r.years![4]}년 분석</p>}
      {expiresAt && <div className="notice info">이 궁합 결과와 입력 정보는 <b>{expiresAt.slice(0, 10)}</b>까지 볼 수 있고, 이후 자동 삭제돼요.</div>}
      {r.warnings.includes('hour_pillar_unavailable') && <div className="notice">출생 시간을 몰라 시주 없이 분석했어요. 시간이 필요한 해석은 생략했어요.</div>}
      {r.warnings.includes('engine_unverified') && <div className="notice">샘플 계산기 기준 결과예요. 정식 만세력 검증 전이에요.</div>}

      {r.metrics && (
        <section className="card" aria-labelledby="met-h">
          <h2 id="met-h">관계 지표</h2>
          {r.metrics.map((m) => (
            <div key={m.label} className="metric"><div><b>{m.label}</b><div className="muted small">{m.note}</div></div><span className={`badge ${m.level === '잘 맞아요' ? 'ok' : m.level === '조율이 필요해요' ? 'fail' : ''}`}>{m.level}</span></div>
          ))}
          <p className="muted small" style={{ marginBottom: 0 }}>점수나 확률이 아니라 규칙별 경향을 말로 표현한 거예요.</p>
        </section>
      )}
      <nav className="toc" aria-label="목차">
        {r.sections.map((s, i) => <a key={s.id} href={`#sec-${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}>{i + 1}. {s.title}</a>)}
      </nav>
      {r.sections.map((s, i) => <ReportSection key={s.id} section={s} evidence={r.evidence} index={i} />)}

      <details className="acc">
        <summary>품질 검수 · 버전 정보 (샌드박스)</summary>
        <div className="acc-body">
          <table className="tbl"><tbody>
            {r.qa.map((c) => <tr key={c.id}><td>{c.label}</td><td><span className={`badge ${c.status === 'pass' ? 'ok' : 'fail'}`}>{c.status === 'pass' ? 'PASS' : 'FAIL'}</span></td><td>{c.detail}</td></tr>)}
          </tbody></table>
          <p className="small">규칙 {r.versions.rules} · 프롬프트 {r.versions.prompt} · 모델 {r.versions.model} · 엔진 {r.versions.engine}</p>
        </div>
      </details>
      <p className="muted small">결과는 참고용이며 연애·결혼·금전의 결과를 확정하지 않아요. 의학·법률·재무 판단은 전문가와 상의하세요.</p>
    </div>
  );
}
