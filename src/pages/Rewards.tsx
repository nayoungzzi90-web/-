import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, MockNotice } from '../components/Common';
import { CATALOG, PRODUCT_LIST, REFERRAL } from '../lib/catalog';
import { useSession } from '../lib/mock/hooks';
import { referralStats } from '../lib/mock/referral';
import { simulateFriendSignup } from '../lib/mock/service';

const REASON_KO: Record<string, string> = { referral_reward: '친구 초대 보상', redeem: '업전 교환' };

export default function Rewards() {
  const { db, user, balance } = useSession();
  const [sim, setSim] = useState('');
  if (!user) return (<div><h1>업전</h1><ErrorState title="로그인이 필요해요" message="업전은 로그인한 회원에게 적립돼요." action={<Link className="btn" to="/login?next=/rewards">로그인</Link>} /></div>);
  const tx = db.ledger.filter((l) => l.userId === user.id).slice().reverse();
  const stats = referralStats(db, user.id);
  return (
    <div>
      <h1>내 업전 🪙</h1>
      <div className="card center">
        <p className="muted" style={{ margin: 0 }}>보유 업전</p>
        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--gold-text)', margin: 0 }}>{balance}냥</p>
        <p className="muted small">업전은 서비스 이용에만 쓸 수 있고, 현금으로 바꿀 수 없어요.</p>
        <Link className="btn teal" to="/invite">친구 초대하고 모으기</Link>
      </div>
      <section className="card">
        <h2>교환 안내</h2>
        <table className="tbl"><tbody>
          {PRODUCT_LIST.filter((p) => p.coinCost > 0).map((p) => (
            <tr key={p.id}><td>{p.name}</td><td><b>{p.coinCost}냥</b></td><td>{p.status === 'active' ? <span className="badge ok">교환 가능</span> : <span className="badge soon">준비 중</span>}</td></tr>
          ))}
        </tbody></table>
        <p className="muted small" style={{ marginBottom: 0 }}>상품 화면에서 ‘업전으로 열람’을 눌러 교환해요.</p>
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
              <li key={l.id} className="row between"><span>{REASON_KO[l.reason] ?? l.reason}<br /><span className="muted small">{l.createdAt.slice(0, 16).replace('T', ' ')}</span></span><b style={{ color: l.delta > 0 ? 'var(--teal)' : 'var(--red)' }}>{l.delta > 0 ? '+' : ''}{l.delta}냥</b></li>
            ))}
          </ul>
        )}
      </section>
      <details className="sandbox">
        <summary><b>샌드박스 도구</b></summary>
        <MockNotice>한 브라우저에서 추천 흐름을 확인하기 위한 시뮬레이션이에요. 실제 지급 규칙(신규·셀프·중복·일 5/월 30 한도)을 그대로 통과해요.</MockNotice>
        <button className="btn sm ghost" onClick={() => { const r = simulateFriendSignup(user.id); setSim(r.status === 'awarded' ? `적립 +${r.coins}냥` : r.status === 'rejected' ? `거절: ${r.reason}` : r.status); }}>친구 1명 가입 시뮬레이션</button>
        {sim && <p role="status" className="small">결과: {sim}</p>}
        <p className="small muted">{CATALOG.basic.name} 교환 4냥 / {CATALOG.compatibility.name} 4냥 / {CATALOG.love_deep.name} 12냥</p>
      </details>
    </div>
  );
}
