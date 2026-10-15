import { Link } from 'react-router-dom';
import { allCharacters, CharacterArt } from '../components/Character';
import { MockNotice, ProductCard } from '../components/Common';
import { HeroScene } from '../components/Scene';
import { CATALOG } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { ELEMENT_KO } from '../lib/saju/types';
import { useSession } from '../lib/mock/hooks';

export default function Home() {
  const { chart } = useSession();
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
      <div className="hero-cta stack">
        <Link className="btn block go" to="/birth">무료로 내 사주 캐릭터 보기</Link>
        {chart && mine && <Link className="btn secondary block" to={`/character/result/${chart.id}`}>내 친구 {mine.name} 다시 보기</Link>}
        <p className="muted small center" style={{ margin: 0 }}>가입 없이 무료 · 생년월일만 있으면 돼요</p>
      </div>

      <section className="tile-grid" aria-label="무료 서비스" style={{ marginTop: 18 }}>
        <Link to="/daily" className="tile"><CharacterArt base={CHARACTERS['丁']} size={60} className="mini-art" /><b>오늘의 운세</b><span>무료 · 하루 한 번</span></Link>
        <Link to="/invite" className="tile"><CharacterArt base={CHARACTERS['丙']} size={60} className="mini-art" /><b>친구 초대</b><span>엽전을 모아 열람해요</span></Link>
      </section>

      <section aria-labelledby="chars-h">
        <h2 id="chars-h">열 친구를 소개해요</h2>
        <div className="friends">
          {allCharacters.map((c) => (
            <div key={c.id} className="friend">
              <CharacterArt base={c} size={80} />
              <b>{c.name.split(' ').slice(-1)[0]}</b>
              <small>{c.stem} · {ELEMENT_KO[c.element].slice(0, 1)}</small>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ margin: '10px 0 0' }}>일간(甲乙丙丁戊己庚辛壬癸)에 따라 기본 친구가 정해지고, 표정·소품·칭호가 더해져요. 캐릭터는 창작 표현이며 심리 검사가 아니에요.</p>
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
