import { Link, NavLink, Outlet } from 'react-router-dom';
import { CoinBalance } from './Common';
import { useSession } from '../lib/mock/hooks';

export function Header() {
  const { user, balance } = useSession();
  return (
    <header className="header">
      <Link to="/" className="logo" aria-label="오행 친구들 홈"><span aria-hidden>🏮</span> 오행 친구들</Link>
      <div className="header-actions">
        {user ? <CoinBalance amount={balance} /> : null}
        {user ? <Link className="btn sm ghost" to="/me">MY</Link> : <Link className="btn sm secondary" to="/login">로그인</Link>}
      </div>
    </header>
  );
}

const NAV = [
  { to: '/', label: '홈', ico: '🏠', end: true },
  { to: '/daily', label: '오늘의 운세', ico: '🌤️' },
  { to: '/rewards', label: '업전', ico: '🪙' },
  { to: '/invite', label: '초대', ico: '💌' },
  { to: '/me', label: 'MY', ico: '👤' },
];
export function BottomNavigation() {
  return (
    <nav className="nav" aria-label="주요 메뉴">
      <ul>
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end}>
              <span className="ico" aria-hidden>{n.ico}</span>{n.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Shell() {
  return (
    <>
      <a href="#main" className="sr-only">본문으로 건너뛰기</a>
      <div className="shell">
        <Header />
        <main id="main" style={{ paddingTop: 14 }}>
          <Outlet />
        </main>
        <footer className="footer">
          <p>사주 결과는 재미와 자기이해를 위한 참고 자료이며, 의학·법률·재무 판단을 대체하지 않아요.</p>
          <p><Link to="/legal/terms">이용약관</Link> · <Link to="/legal/privacy">개인정보처리방침</Link> · <Link to="/legal/refund">환불 안내</Link></p>
        </footer>
      </div>
      <BottomNavigation />
    </>
  );
}
