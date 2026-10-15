import { Link, NavLink, Outlet } from 'react-router-dom';
import { CoinBalance } from './Common';
import { ArtSvg } from './art';
import { Coin } from './Scene';
import { useSession } from '../lib/mock/hooks';

export function Header() {
  const { user, balance } = useSession();
  return (
    <header className="header">
      <Link to="/" className="logo" aria-label="오행 친구들 홈"><ArtSvg stem="戊" size={30} /> 오행 친구들</Link>
      <div className="header-actions">
        {user ? <CoinBalance amount={balance} /> : null}
        {user ? <Link className="btn sm ghost" to="/me">보관함</Link> : <Link className="btn sm secondary" to="/login">로그인</Link>}
      </div>
    </header>
  );
}

const IconHome = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11l9-7l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>);
const IconSun = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>);
const IconBox = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h16v12H4z" /><path d="M3 4h18v4H3z" /><path d="M10 12h4" /></svg>);
const NAV = [
  { to: '/', label: '홈', icon: <IconHome />, end: true },
  { to: '/daily', label: '오늘', icon: <IconSun /> },
  { to: '/me', label: '보관함', icon: <IconBox /> },
  { to: '/rewards', label: '엽전', icon: <Coin size={24} /> },
];
export function BottomNavigation() {
  return (
    <nav className="nav" aria-label="주요 메뉴">
      <ul>
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end}>{n.icon}{n.label}</NavLink>
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
