import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthForm } from '../components/BirthForm';
import { allCharacters, CharacterArt } from '../components/Character';
import { MockNotice, ProductCard } from '../components/Common';
import { HeroScene } from '../components/Scene';
import { CATALOG } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { createChart } from '../lib/mock/service';
import { kstDate } from '../lib/kst';
import { streak } from '../lib/metrics';

const FIVE = [
  { stem: '甲', name: '솔이', el: '목(木) · 푸른 선비', role: '기본사주 안내', to: '/products/basic' },
  { stem: '丙', name: '댕이', el: '화(火) · 열기미 소녀', role: '궁합·연애 안내', to: '/products/love' },
  { stem: '戊', name: '호동이', el: '토(土) · 인기 호랑이', role: '든든한 조언', to: '/birth' },
  { stem: '庚', name: '달토', el: '금(金) · 달토끼', role: '오늘의 운세', to: '/daily' },
  { stem: '壬', name: '거북이', el: '수(水) · 아기 거북', role: '느긋한 큰 흐름', to: '/birth' },
] as const;

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

      <section className="tile-grid" aria-label="무료 서비스" style={{ marginTop: 18 }}>
        <Link to="/daily" className="tile"><CharacterArt base={CHARACTERS['庚']} size={60} className="mini-art" /><b>오늘의 운세</b><span>무료 · 하루 한 번</span></Link>
        <Link to="/invite" className="tile"><CharacterArt base={CHARACTERS['戊']} size={60} className="mini-art" /><b>친구 초대</b><span>엽전을 모아 열람해요</span></Link>
      </section>

      <section aria-labelledby="chars-h">
        <h2 id="chars-h">다섯 친구를 소개해요</h2>
        <div className="friends">
          {FIVE.map((f) => (
            <Link key={f.name} to={f.to} className="friend" aria-label={`${f.name} — ${f.role}`}>
              <CharacterArt base={CHARACTERS[f.stem]} size={80} />
              <b>{f.name}</b>
              <small>{f.el}</small>
              <em>{f.role}</em>
            </Link>
          ))}
        </div>
        <details className="acc">
          <summary>일간별 열 친구 모두 보기</summary>
          <div className="acc-body">
            <div className="friends ten">
              {allCharacters.map((c) => (
                <div key={c.id} className="friend"><CharacterArt base={c} size={80} /><b>{c.name}</b><small>{c.stem}</small></div>
              ))}
            </div>
            <p className="small" style={{ margin: '10px 0 0' }}>일간(甲乙丙丁戊己庚辛壬癸)에 따라 오행 친구의 양·음 모습이 정해지고, 표정·소품·칭호가 더해져요. 캐릭터는 창작 표현이며 심리 검사가 아니에요.</p>
          </div>
        </details>
      </section>

      <section aria-labelledby="paid-h">
        <h2 id="paid-h" style={{ marginTop: 22 }}>더 깊이 보기</h2>
        <ProductCard product={CATALOG.basic} />
        <ProductCard product={CATALOG.compatibility} />
        <ProductCard product={CATALOG.love_deep} />
        <ProductCard product={CATALOG.date_selection} />
        <ProductCard product={CATALOG.saju_deep} />
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
