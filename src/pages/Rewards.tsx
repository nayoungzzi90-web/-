import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mutate, track } from '../lib/mock/db';
import { createCoinOrder } from '../lib/mock/payment';
import { ErrorState, MockNotice } from '../components/Common';
import { ArtSvg } from '../components/art';
import { Coin } from '../components/Scene';
import { CATALOG, COIN_PACKS, PRODUCT_LIST, REFERRAL, packPerCoin, won } from '../lib/catalog';
import { useSession } from '../lib/mock/hooks';
import { referralStats } from '../lib/mock/referral';
import { simulateFriendSignup } from '../lib/mock/service';

const REASON_KO: Record<string, string> = { referral_reward: '친구 초대 보상', redeem: '엽전 교환', coin_purchase: '엽전 충전' };

export default function Rewards() {
  const { db, user, balance } = useSession();
  const [sim, setSim] = useState('');
  const nav = useNavigate();
  const [params] = useSearchParams();
  const charged = params.get('charged');
  if (!user) return (<div><h1 className="title">엽전 꾸러미</h1><ErrorState title="로그인이 필요해요" message="엽전은 로그인한 회원에게 적립돼요." action={<Link className="btn" to="/login?next=/rewards">로그인</Link>} /></div>);
  const tx = db.ledger.filter((l) => l.userId === user.id).slice().reverse();
  const stats = referralStats(db, user.id);
  return (
    <div>
      <h1 className="title">엽전 꾸러미</h1>
      <div className="banner">
        <Coin size={56} />
        <div><div style={{ fontSize: '.85rem', opacity: .85 }}>내 엽전</div><div className="bal">{balance}<small>닢</small></div></div>
        <ArtSvg stem="戊" size={84} className="art" />
      </div>
      <p className="muted small" style={{ marginTop: -4 }}>엽전은 서비스 이용에만 쓸 수 있고, 현금으로 바꿀 수 없어요. 충전한 엽전의 환불은 환불 안내를 따라요.</p>
      <Link className="btn secondary block" style={{ marginBottom: 14 }} to="/invite">친구 초대하고 엽전 모으기</Link>
      {charged && <div className="notice ok" role="status">엽전 충전이 완료됐어요. (테스트 결제 · 실제 청구 없음)</div>}
      <section aria-labelledby="charge-h">
        <h2 id="charge-h">엽전 꿰미 고르기</h2>
        <p className="muted small">엽전 1닢은 900원이에요. 가격은 예시이며 실제 결제는 PG 계약과 법률 검토 후 열려요.</p>
        <div className="stack">
          {COIN_PACKS.map((p) => (
            <button key={p.id} className="pack" onClick={() => { const id = mutate((d) => { track(d, 'checkout_started', { method: 'coin_pack' }); return createCoinOrder(d, user.id, p.id).id; }); nav(`/checkout/${id}`); }} aria-label={`${p.name} ${p.coins}닢 ${won(p.priceKrw)} 충전`}>
              <span className="pack-coins">{Array.from({ length: p.coins }, (_, i) => <Coin key={i} size={30} />)}</span>
              <span className="pack-name"><b>{p.name}</b><small>엽전 {p.coins}닢 · 개당 {won(packPerCoin(p))}</small></span>
              <span className="pack-price">{won(p.priceKrw)}{p.badge && <em>{p.badge}</em>}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>교환 안내</h2>
        <table className="tbl"><tbody>
          {PRODUCT_LIST.filter((p) => p.coinCost > 0).map((p) => (
            <tr key={p.id}><td>{p.name}</td><td><b>{p.coinCost}닢</b></td><td>{p.status === 'active' ? <span className="badge ok">교환 가능</span> : <span className="badge soon">준비 중</span>}</td></tr>
          ))}
        </tbody></table>
        <p className="muted small" style={{ marginBottom: 0 }}>상품 화면에서 ‘엽전으로 열람’을 눌러 교환해요.</p>
      </section>
      <section className="card">
        <h2>이번 달 초대 현황</h2>
        <p style={{ margin: 0 }}>오늘 {stats.today}/{REFERRAL.dailyCap}명 · 이번 달 {stats.month}/{REFERRAL.monthlyCap}명 (한국 시간 기준)</p>
      </section>
      <section className="card">
        <h2>적립·사용 내역</h2>
        {tx.length === 0 ? <p className="muted">아직 내역이 없어요.</p> : (
          <ul className="list-plain">
            {tx.map((l) => (
              <li key={l.id} className="row between"><span>{REASON_KO[l.reason] ?? l.reason}<br /><span className="muted small">{l.createdAt.slice(0, 16).replace('T', ' ')}</span></span><b style={{ color: l.delta > 0 ? 'var(--teal)' : 'var(--red)' }}>{l.delta > 0 ? '+' : ''}{l.delta}닢</b></li>
            ))}
          </ul>
        )}
      </section>
      <details className="sandbox">
        <summary><b>샌드박스 도구</b></summary>
        <MockNotice>한 브라우저에서 추천 흐름을 확인하기 위한 시뮬레이션이에요. 실제 지급 규칙(신규·셀프·중복·일 5/월 30 한도)을 그대로 통과해요.</MockNotice>
        <button className="btn sm ghost" onClick={() => { const r = simulateFriendSignup(user.id); setSim(r.status === 'awarded' ? `적립 +${r.coins}닢` : r.status === 'rejected' ? `거절: ${r.reason}` : r.status); }}>친구 1명 가입 시뮬레이션</button>
        {sim && <p role="status" className="small">결과: {sim}</p>}
        <p className="small muted">{CATALOG.basic.name} 교환 4닢 / {CATALOG.compatibility.name} 4닢 / {CATALOG.love_deep.name} 12닢</p>
      </details>
    </div>
  );
}
