import { useEffect, useState } from 'react';
import { funnel, kpis } from '../lib/metrics';
import { useSession } from '../lib/mock/hooks';
import { Assumptions, DEFAULTS, simulate, visitorsForTarget } from '../lib/simulator';

/** 운영 지표 화면. 비밀 주소로만 열리는 편의 화면이며 권한 인증이 아니다. 샌드박스에서는 이 브라우저의 이벤트만 보인다. */
export const OPS_PATH = (import.meta.env.VITE_OPS_PATH as string | undefined) ?? 'ops-ohaeng-x9k2';
const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

export default function Ops() {
  const { db } = useSession();
  const [tab, setTab] = useState<'funnel' | 'sim'>('funnel');
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const [target, setTarget] = useState(10_000_000);
  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  const f = funnel(db);
  const k = kpis(f, db.dailyDays);
  const r = simulate(a);
  const need = visitorsForTarget(a, target);
  const num = (key: keyof Assumptions, label: string, step = 1, pct = false) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <input className="input" type="number" step={step} value={pct ? +(a[key] as number * 100).toFixed(2) : (a[key] as number)} onChange={(e) => setA({ ...a, [key]: pct ? Number(e.target.value) / 100 : Number(e.target.value) })} />
    </label>
  );
  return (
    <div>
      <h1>운영 지표</h1>
      <div className="notice info">비밀 주소 화면이에요(인증이 아니에요). 지금은 <b>이 브라우저에 쌓인 샌드박스 이벤트</b>만 보여요. 실서비스에서는 서버 이벤트 테이블과 관리자 권한(MFA)으로 바꿔야 해요.</div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'funnel'} onClick={() => setTab('funnel')}>퍼널 KPI</button>
        <button role="tab" aria-selected={tab === 'sim'} onClick={() => setTab('sim')}>수익성 시뮬레이터</button>
      </div>
      {tab === 'funnel' && (
        <>
          <section className="card">
            <h2>성장 퍼널</h2>
            <table className="tbl"><tbody>
              {[['홈 방문', f.visits], ['입력 시작', f.birthStarts], ['무료 결과 완료', f.completions], ['공유 시도', f.shares], ['가입', f.signups], ['상품 조회', f.productViews], ['결제 시작', f.checkouts], ['유료 주문(현금)', f.paidOrders], ['엽전 교환', f.coinRedeems], ['오늘의 운세 조회', f.dailyViews]].map(([l, v]) => <tr key={l as string}><td>{l}</td><td style={{ textAlign: 'right' }}><b>{v}</b></td></tr>)}
            </tbody></table>
          </section>
          <section className="card">
            <h2>핵심 지표</h2>
            {k.map((x) => (
              <div key={x.id} className="metric"><div><b>{x.label}</b> <span className="badge">{x.priority}</span><div className="muted small">{x.note}</div></div><b>{x.value === null ? '—' : x.unit === '원' ? won(x.value) : `${x.value}${x.unit}`}</b></div>
            ))}
            <p className="muted small">— 표시는 분모가 0이라 계산할 수 없다는 뜻이에요. 매출 {won(f.revenueKrw)}(현금 주문 합계).</p>
          </section>
        </>
      )}
      {tab === 'sim' && (
        <>
          <section className="card">
            <h2>가정값 (직접 바꿔 보세요)</h2>
            <div className="grid2">
              {num('visitors', '월 방문자 수', 1000)}
              {num('completionRate', '무료 결과 완료율(%)', 1, true)}
              {num('conversionRate', '완료자 중 구매 전환율(%)', 0.5, true)}
              {num('avgOrderKrw', '주문당 평균 결제(원)', 100)}
              {num('pgFeeRate', 'PG 수수료(%) — 가정', 0.1, true)}
              {num('refundRate', '환불률(%) — 가정', 0.5, true)}
              {num('aiCostPerOrderKrw', '주문당 AI 비용(원) — 가정', 10)}
              {num('infraFixedKrw', '월 인프라 고정비(원) — 가정', 10000)}
              {num('referralRewardCostKrw', '월 추천 보상 비용(원) — 가정', 10000)}
              {num('otherFixedKrw', '기타 월 고정비(원)', 10000)}
            </div>
            <label className="check"><input type="checkbox" checked={a.vatIncluded} onChange={(e) => setA({ ...a, vatIncluded: e.target.checked })} />결제 금액에 부가세 10%가 포함돼 있다고 가정</label>
          </section>
          <section className="card">
            <h2>결과</h2>
            <table className="tbl"><tbody>
              <tr><td>무료 결과 완료</td><td style={{ textAlign: 'right' }}>{Math.round(r.completions).toLocaleString()}명</td></tr>
              <tr><td>유료 주문</td><td style={{ textAlign: 'right' }}>{Math.round(r.orders).toLocaleString()}건</td></tr>
              <tr><td>매출(비용 차감 전)</td><td style={{ textAlign: 'right' }}><b>{won(r.grossKrw)}</b></td></tr>
              <tr><td>− 환불</td><td style={{ textAlign: 'right' }}>{won(r.refundKrw)}</td></tr>
              <tr><td>− 부가세</td><td style={{ textAlign: 'right' }}>{won(r.vatKrw)}</td></tr>
              <tr><td>− PG 수수료</td><td style={{ textAlign: 'right' }}>{won(r.pgKrw)}</td></tr>
              <tr><td>− AI 비용</td><td style={{ textAlign: 'right' }}>{won(r.aiKrw)}</td></tr>
              <tr><td>− 추천 보상</td><td style={{ textAlign: 'right' }}>{won(r.referralKrw)}</td></tr>
              <tr><td><b>공헌이익</b></td><td style={{ textAlign: 'right' }}><b>{won(r.contributionKrw)}</b></td></tr>
              <tr><td>− 고정비</td><td style={{ textAlign: 'right' }}>{won(r.fixedKrw)}</td></tr>
              <tr><td><b>세전 이익</b></td><td style={{ textAlign: 'right' }}><b>{won(r.profitBeforeTaxKrw)}</b></td></tr>
              <tr><td>방문자당 공헌이익</td><td style={{ textAlign: 'right' }}>{r.contributionPerVisitorKrw.toFixed(1)}원</td></tr>
              <tr><td>주문당 공헌이익</td><td style={{ textAlign: 'right' }}>{won(r.contributionPerOrderKrw)}</td></tr>
            </tbody></table>
            <label className="field" style={{ marginTop: 12 }}><span>월 세전 이익 목표(원)</span><input className="input" type="number" step={1_000_000} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label>
            <p>{need === null ? '이 가정으로는 방문자를 늘려도 이익이 나지 않아요(공헌이익이 0 이하).' : <>목표를 채우려면 월 <b>{need.toLocaleString()}명</b>의 방문자가 필요해요.</>}</p>
            <p className="muted small">시장 전망이 아니라 입력한 가정에 따른 단순 계산이에요. 사주아이의 실제 전환율이 아니고, 무료 체험 후 한 번의 유료 주문만 발생한다고 단순화했어요. 세금(소득세·법인세)은 반영하지 않았어요.</p>
          </section>
        </>
      )}
    </div>
  );
}
