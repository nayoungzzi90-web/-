import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../components/Common';
import { REFERRAL } from '../lib/catalog';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { referralStats } from '../lib/mock/referral';

export default function Invite() {
  const { db, user } = useSession();
  const [msg, setMsg] = useState('');
  if (!user) {
    return (
      <div>
        <h1>친구 초대</h1>
        <ErrorState title="로그인하면 초대 코드가 활성화돼요" message="비회원도 링크를 공유할 수는 있지만, 업전은 로그인한 회원에게만 적립돼요." action={<Link className="btn" to="/login?next=/invite">로그인하고 시작하기</Link>} />
        <Policy />
      </div>
    );
  }
  const stats = referralStats(db, user.id);
  const url = `${location.origin}/?ref=${user.referralCode}`;
  const copy = async () => {
    mutate((d) => track(d, 'invite_click'));
    try { await navigator.clipboard.writeText(url); setMsg('초대 링크를 복사했어요.'); } catch { setMsg(`복사에 실패했어요: ${url}`); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: '오행 친구들', text: '나는 어떤 오행 친구일까? 같이 해봐요!', url }); } catch { /* 취소 */ } } else copy();
  };
  return (
    <div>
      <h1>친구 초대 💌</h1>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>내 초대 링크</p>
        <input className="input" readOnly value={url} aria-label="내 초대 링크" onFocus={(e) => e.currentTarget.select()} />
        <div className="grid2" style={{ marginTop: 10 }}>
          <button className="btn secondary" onClick={copy}>링크 복사</button>
          <button className="btn" onClick={share}>공유하기</button>
        </div>
        <p role="status" className="muted small">{msg}</p>
      </div>
      <section className="card">
        <h2>초대 현황</h2>
        <div className="grid2">
          <div><b>{stats.captured}</b><br /><span className="muted small">링크로 방문</span></div>
          <div><b>{stats.total}</b><br /><span className="muted small">보상 받은 가입</span></div>
          <div><b>{stats.today}/{REFERRAL.dailyCap}</b><br /><span className="muted small">오늘 보상</span></div>
          <div><b>{stats.month}/{REFERRAL.monthlyCap}</b><br /><span className="muted small">이번 달 보상</span></div>
        </div>
        {stats.rejected > 0 && <p className="muted small">보상 제외 {stats.rejected}건 (셀프 초대·기존 회원·한도 초과 등)</p>}
      </section>
      <Policy />
    </div>
  );
}

function Policy() {
  return (
    <section className="card flat">
      <h3>업전 지급 기준</h3>
      <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
        <li>친구가 내 링크로 들어와 <b>무료 캐릭터 체험을 마치고 새로 가입</b>하면 {REFERRAL.rewardCoins}냥이 적립돼요.</li>
        <li>링크를 복사하거나 공유 버튼을 누르는 것만으로는 적립되지 않아요.</li>
        <li>하루 최대 {REFERRAL.dailyCap}명, 한 달 최대 {REFERRAL.monthlyCap}명까지 (한국 시간 기준).</li>
        <li>본인 링크, 이미 가입한 회원, 같은 친구 중복 가입은 제외돼요.</li>
        <li>여러 초대 링크를 거친 경우 가입 직전의 마지막 링크가 적용돼요 (정책 확정 전 안내).</li>
      </ul>
    </section>
  );
}
