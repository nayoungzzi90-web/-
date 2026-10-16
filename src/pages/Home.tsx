import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthForm } from '../components/BirthForm';
import { CharacterArt } from '../components/Character';
import { MockNotice } from '../components/Common';
import { HeroScene } from '../components/Scene';
import { CATALOG, won } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { createChart } from '../lib/mock/service';
import { kstDate } from '../lib/kst';
import { streak } from '../lib/metrics';

const price = (id: keyof typeof CATALOG) => (CATALOG[id].priceKrw ? `${won(CATALOG[id].priceKrw)} · ${CATALOG[id].coinCost}닢` : '무료');
const MENU: { name: string; sub: string; to: string; stem: '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'; soon?: boolean }[] = [
  { name: '기본사주', sub: price('basic'), to: CATALOG.basic.path, stem: '甲' },
  { name: '연애운', sub: price('love_deep'), to: CATALOG.love_deep.path, stem: '丙' },
  { name: '궁합', sub: price('compatibility'), to: CATALOG.compatibility.path, stem: '乙' },
  { name: '택일', sub: price('date_selection'), to: CATALOG.date_selection.path, stem: '己', soon: true },
  { name: '심층사주', sub: price('saju_deep'), to: CATALOG.saju_deep.path, stem: '壬', soon: true },
  { name: '오늘의 운세', sub: '무료 · 하루 한 번', to: '/daily', stem: '庚' },
  { name: '친구와 대화', sub: '무료 · 고민 상담', to: '/chat', stem: '戊' },
  { name: '친구 초대', sub: '엽전을 모아요', to: '/invite', stem: '癸' },
];

export default function Home() {
  const { chart, db } = useSession();
  const nav = useNavigate();
  const started = useRef(false);
  const days = streak(db.dailyDays, kstDate());
  const mine = chart ? CHARACTERS[chart.facts.dayMaster] : null;
  return (
    <div>
      <MockNotice />
      <div className="hero-wrap">
        <div className="hero-text">
          <p className="eyebrow">조선시대 감성 사주풀이 <span className="seal" aria-hidden>五</span></p>
          <h1 className="title">오행<br />친구들</h1>
          <p>나무, 불, 흙, 쇠, 물<br />다섯 친구가<br />당신의 길을 안내해요.</p>
        </div>
        <HeroScene />
      </div>
      <section className="card quick-start" aria-labelledby="qs-h" onFocusCapture={() => { if (!started.current) { started.current = true; mutate((d) => track(d, 'birth_start', { step: 'home' })); } }}>
        <h2 id="qs-h">내 사주 속 친구 만나기 <span className="badge ok">무료 · 가입 없음</span></h2>
        <BirthForm idPrefix="home" showAlias={false} showGender={false} submitLabel="내 캐릭터 만나기" onSubmit={(input) => nav(`/character/result/${createChart(input).id}`)} />
      </section>
      <div className="stack" style={{ marginTop: 12 }}>
        <Link className="btn secondary block" to="/chat">🗨️ 친구들과 대화하며 시작하기</Link>
        {chart && mine && <Link className="btn ghost block" to={`/character/result/${chart.id}`}>내 친구 {mine.name} 다시 보기{days > 0 ? ` · 🔥 연속 ${days}일째` : ''}</Link>}
      </div>

      <section aria-labelledby="menu-h" style={{ marginTop: 18 }}>
        <h2 id="menu-h">서비스</h2>
        <div className="menu-grid">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to} className="tile menu-tile" aria-label={`${m.name} — ${m.sub}`}>
              <CharacterArt base={CHARACTERS[m.stem]} size={52} className="mini-art" />
              <b>{m.name}{m.soon && <span className="badge soon">준비 중</span>}</b>
              <span>{m.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card flat">
        <h3>이렇게 풀어요</h3>
        <ol className="steps muted">
          <li>만세력으로 사주 원국을 계산해요. AI가 임의로 만들지 않아요.</li>
          <li>정해진 명리 규칙으로 해석 근거를 정리해요.</li>
          <li>쉬운 말로 풀어 드리고, ‘해석 근거 보기’로 이유까지 확인할 수 있어요.</li>
        </ol>
      </section>
    </div>
  );
}
