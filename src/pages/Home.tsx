import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allCharacters, CharacterArt } from '../components/Character';
import { MockNotice, ProductCard } from '../components/Common';
import { CATALOG } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { useSession } from '../lib/mock/hooks';

/** 히어로: 열 친구가 2.5초마다 바뀌어 나타나요 (모션 줄이기 설정이면 고정) */
function Stage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % allCharacters.length), 2500);
    return () => clearInterval(t);
  }, []);
  const c = allCharacters[i];
  return (
    <div className="stage" aria-live="off">
      <CharacterArt key={c.id} base={c} size={220} />
      <span className="name">{c.name}</span>
    </div>
  );
}

export default function Home() {
  const { chart } = useSession();
  const mine = chart ? CHARACTERS[chart.facts.dayMaster] : null;
  return (
    <div>
      <MockNotice />
      <section className="hero">
        <span className="sticker">나만의 오행 친구 찾기!</span>
        <h1>내 사주 친구,<br /><mark>지금 만나볼래?</mark></h1>
        <p className="sub">생년월일만 넣으면 돼요. 가입 없이 무료예요.</p>
        <Stage />
        <div className="stack" style={{ maxWidth: 340, margin: '26px auto 0' }}>
          <Link className="btn block" to="/birth">내 사주 캐릭터 보기</Link>
          {chart && mine && <Link className="btn secondary block" to={`/character/result/${chart.id}`}>내 친구 {mine.name} 다시 보기</Link>}
        </div>
      </section>

      <section className="tile-grid" aria-label="무료 서비스">
        <Link to="/daily" className="tile t1"><CharacterArt base={CHARACTERS['丁']} size={64} className="mini-art" /><b>오늘의 운세</b><span>무료 · 하루 한 번</span></Link>
        <Link to="/birth" className="tile t2"><CharacterArt base={CHARACTERS['戊']} size={64} className="mini-art" /><b>나의 캐릭터</b><span>무료 · 일간으로 만나요</span></Link>
      </section>

      <section className="card" aria-labelledby="chars-h">
        <h2 id="chars-h">열 친구를 소개해요</h2>
        <div className="char-grid">
          {allCharacters.map((c) => (
            <div key={c.id} className="char-chip"><CharacterArt base={c} size={80} />{c.stem}</div>
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
