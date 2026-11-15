import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CardArt, CoinIcon, TtottoFace } from "@/components/ttotto/Art";
import { TT, won } from "@/lib/ttotto-content";

export const Route = createFileRoute("/story/$id")({
  head: () => ({ meta: [{ title: "이야기 보기 · 또또사주" }] }),
  component: StoryDetail,
});

// 상품 상세: 내용·가격 안내와 기존 입력 흐름으로 가는 길. 이 화면은 결제를 일으키지 않는다(결제는 꺼져 있다).
function StoryDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const p = TT.products.find((x) => x.id === id);
  const coins = p ? Math.max(1, Math.round(p.price / 1000)) : 1;
  const back = () => (window.history.length > 1 ? window.history.back() : void nav({ to: "/" }));
  return (
    <div className="tt tt-soft tt-detail" style={{ background: "#fffaf2" }}>
      <div className="tt-wrap pb-10">
        <header className="tt-header">
          <button type="button" className="tt-back" onClick={back} aria-label="뒤로 가기">
            <span aria-hidden className="text-[24px] font-extrabold">←</span>
          </button>
          <Link to="/" className="tt-header-title">
            {TT.brand}
            <TtottoFace size={32} />
          </Link>
        </header>
        {!p ? (
          <main className="mt-8 text-center">
            <p className="text-[20px] font-extrabold">찾는 이야기가 없어요</p>
            <Link to="/" className="tt-btn tt-sub mt-5">홈으로 가기</Link>
          </main>
        ) : (
          <main className="mt-5">
            {/* 홈 타일과 같은 말투: 연한 색 바탕 + 물방울 무늬 + 그림, 오른쪽 위에 닢 */}
            <section className="tt-dt-hero" style={{ ["--tile" as string]: p.bg }}>
              <span className="tt-dt-pill" aria-label={`${coins}닢, ${won(p.price)}`}>
                <CoinIcon size={17} />
                <b>{coins}</b>
              </span>
              <div className="tt-dt-art"><CardArt id={p.id} fit /></div>
            </section>
            <h1 className="tt-dt-title">{p.title}</h1>
            <p className="tt-dt-q">{p.question}</p>
            <ul className="tt-dt-topics">
              {p.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="tt-price-note tt-dt-price">
              <CoinIcon size={22} />
              <b className="tt-price-one">{coins}</b>
              <b>= {won(p.price)}</b>
            </p>
            {p.first != null && <p className="tt-dt-first">첫 구매 혜택 {won(p.first)}</p>}
            <p className="tt-dt-note">가격은 안내용이에요. 지금은 결제가 열려 있지 않아서, 이 화면에서는 아무것도 청구되지 않아요.</p>
            {p.to ? (
              <Link to={p.to} className="tt-btn tt-primary mt-4">
                {p.id === "basic" ? "생년월일 넣고 내 사주 보러 가기" : "궁합 보러 가기"} <span aria-hidden>→</span>
              </Link>
            ) : (
              <div className="tt-dt-soon">
                <p>아직 준비 중이에요</p>
                <span>열리면 이곳에서 바로 시작할 수 있게 할게요.</span>
              </div>
            )}
            <Link to="/" className="tt-btn tt-sub mt-3">다른 이야기 보기</Link>
          </main>
        )}
      </div>
    </div>
  );
}
