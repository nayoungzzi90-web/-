import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Layout';
import { mutate, track } from './lib/mock/db';
import { captureReferral } from './lib/mock/referral';
import { purgeExpired } from './lib/mock/service';
import Birth from './pages/Birth';
import CharacterResult from './pages/CharacterResult';
import Checkout from './pages/Checkout';
import Compatibility from './pages/Compatibility';
import Daily from './pages/Daily';
import Home from './pages/Home';
import Invite from './pages/Invite';
import Login from './pages/Login';
import Me from './pages/Me';
import { Admin, Legal, NotFound } from './pages/Misc';
import Product, { ComingSoon } from './pages/Product';
import ReportPage from './pages/Report';
import Rewards from './pages/Rewards';
import SharePage from './pages/SharePage';

export default function App() {
  const loc = useLocation();
  // 추천 링크 캡처 (?ref=CODE): 방문에 귀속만 하고 이 시점에는 엽전을 지급하지 않는다.
  useEffect(() => {
    const ref = new URLSearchParams(loc.search).get('ref');
    if (ref && /^[A-Z0-9]{6,16}$/.test(ref)) mutate((db) => { if (db.pendingRefCode !== ref) { captureReferral(db, ref); track(db, 'invite_click'); } });
  }, [loc.search]);
  useEffect(() => { mutate((db) => purgeExpired(db)); }, []);
  useEffect(() => { mutate((db) => track(db, 'home_view', { step: loc.pathname === '/' ? 'home' : 'other' })); }, []); // 원문 경로/파라미터는 기록하지 않음

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/birth" element={<Birth />} />
        <Route path="/character/result/:id" element={<CharacterResult />} />
        <Route path="/share/:characterId" element={<SharePage />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/products/basic" element={<Product productId="basic" />} />
        <Route path="/products/compatibility" element={<Compatibility />} />
        <Route path="/products/love" element={<Product productId="love_deep" />} />
        <Route path="/products/date-selection" element={<ComingSoon productId="date_selection" />} />
        <Route path="/products/saju-deep" element={<ComingSoon productId="saju_deep" />} />
        <Route path="/checkout/:orderId" element={<Checkout />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/me" element={<Me />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/legal/:kind" element={<Legal />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
