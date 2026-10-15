import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MockNotice } from '../components/Common';
import { ReferralOutcome } from '../lib/mock/referral';
import { signInMock } from '../lib/mock/service';
import { useSession } from '../lib/mock/hooks';

const REASON: Record<string, string> = {
  self_referral: '내 초대 링크로는 엽전을 받을 수 없어요.',
  existing_member: '이미 가입한 회원이라 초대 보상 대상이 아니에요.',
  daily_cap: '초대한 분의 하루 보상 한도에 도달해 이번에는 적립되지 않았어요.',
  monthly_cap: '초대한 분의 월 보상 한도에 도달해 이번에는 적립되지 않았어요.',
  unknown_code: '확인할 수 없는 초대 코드예요.',
};

/** 안전한 내부 경로만 허용 (open redirect 방지; 실제 OAuth 에서는 redirect allow-list 사용) */
const safeNext = (n: string | null) => (n && /^\/(?!\/)[\w\-./?=&%]*$/.test(n) ? n : '/');

export default function Login() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const nav = useNavigate();
  const { user } = useSession();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<ReferralOutcome | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('이메일 형식을 확인해 주세요.');
    setErr('');
    const { referral } = signInMock(email);
    if (referral.status === 'none') nav(next, { replace: true });
    else setDone(referral);
  }

  if (done) {
    return (
      <div className="card">
        <h1>로그인 완료</h1>
        {done.status === 'awarded' && <div className="notice ok">초대해 준 친구에게 엽전 {done.coins}닢이 적립됐어요. 고마워요!</div>}
        {done.status === 'rejected' && <div className="notice">{REASON[done.reason]}</div>}
        {done.status === 'pending' && <div className="notice info">무료 캐릭터 체험을 마치면 초대 보상이 확정돼요.</div>}
        <button className="btn block" onClick={() => nav(next, { replace: true })}>계속하기</button>
      </div>
    );
  }
  if (user) {
    return (<div className="card"><h1>이미 로그인했어요</h1><p>{user.email}</p><Link className="btn" to={next}>계속하기</Link></div>);
  }
  return (
    <div>
      <MockNotice>샌드박스 로그인이에요. 실제 서비스에서는 별도 소유의 Supabase Auth(카카오·구글·이메일)로 연결돼요.</MockNotice>
      <h1>로그인 · 가입</h1>
      <p className="muted">저장, 엽전, 결제를 할 때만 필요해요. 무료 체험 결과는 로그인 후에도 그대로 이어져요.</p>
      <div className="card stack">
        <button className="btn block" style={{ background: '#FEE500', color: '#191919', borderColor: '#FEE500' }} disabled aria-disabled="true">카카오로 시작하기 (준비 중)</button>
        <button className="btn secondary block" disabled aria-disabled="true">Google로 시작하기 (준비 중)</button>
        <p className="muted small">소셜 로그인은 운영자가 Kakao Developers·Google Cloud 콘솔에서 OAuth 키와 redirect URI 허용 목록을 설정한 뒤 켜져요.</p>
        <div className="hr" />
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">이메일 (샌드박스 가입)</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} />
            {err && <p className="err" role="alert">{err}</p>}
          </div>
          <button className="btn block" type="submit">이메일로 계속하기</button>
          <p className="muted small">정식 서비스에서는 이메일 인증 메일이 발송돼요.</p>
        </form>
      </div>
    </div>
  );
}
