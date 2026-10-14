import { Link } from 'react-router-dom';
import { allCharacters, CharacterArt } from '../components/Character';
import { ProductCard } from '../components/Common';
import { CATALOG } from '../lib/catalog';
import { useSession } from '../lib/mock/hooks';
import { MockNotice } from '../components/Common';

export default function Home() {
  const { chart } = useSession();
  return (
    <div>
      <MockNotice />
      <section className="hero">
        <p className="epithet" style={{ marginBottom: 4 }}>조선시대 민화풍 오행 친구들</p>
        <h1>나는 어떤 오행 친구일까?</h1>
        <p className="sub">생년월일만 넣으면 내 사주 캐릭터와 오늘의 운세를 바로 만나요.<br />가입 없이 무료예요.</p>
        <div className="stack" style={{ maxWidth: 360, margin: '18px auto 0' }}>
          <Link className="btn block" to="/birth">내 사주 캐릭터 보기</Link>
          {chart && <Link className="btn secondary block" to={`/character/result/${chart.id}`}>내 캐릭터 다시 보기</Link>}
        </div>
      </section>

      <section className="card" aria-labelledby="chars-h">
        <h2 id="chars-h">열 친구를 소개해요</h2>
        <div className="char-grid">
          {allCharacters.map((c) => (
            <div key={c.id} className="char-chip">
              <CharacterArt base={c} size={80} />
              {c.stem}
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>일간(甲乙丙丁戊己庚辛壬癸)에 따라 기본 캐릭터가 정해지고, 표정·소품·칭호가 더해져요. 캐릭터는 창작 표현이며 심리 검사가 아니에요.</p>
      </section>

      <section aria-labelledby="free-h">
        <h2 id="free-h">무료로 즐기기</h2>
        <ProductCard product={CATALOG.character} />
        <ProductCard product={CATALOG.daily} />
      </section>
      <section aria-labelledby="paid-h">
        <h2 id="paid-h">더 깊이 보기</h2>
        <ProductCard product={CATALOG.basic} />
        <ProductCard product={CATALOG.compatibility} />
        <ProductCard product={CATALOG.love_deep} />
        <ProductCard product={CATALOG.date_selection} />
        <ProductCard product={CATALOG.saju_deep} />
      </section>
      <section className="card flat">
        <h3>이렇게 풀어요</h3>
        <ol className="muted" style={{ paddingLeft: 20, margin: 0 }}>
          <li>만세력으로 사주 원국을 계산해요 (AI가 임의로 만들지 않아요).</li>
          <li>정해진 명리 규칙으로 해석 근거를 만들어요.</li>
          <li>쉬운 말로 풀어 드리고, ‘해석 근거 보기’로 이유를 확인할 수 있어요.</li>
        </ol>
      </section>
    </div>
  );
}
