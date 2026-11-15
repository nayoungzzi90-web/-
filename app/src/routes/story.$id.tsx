import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CoinPill, TtottoFace } from "@/components/ttotto/Art";
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
  const back = () => (window.history.length > 1 ? window.history.back() : void nav({ to: "/stories" }));
  return (
    <div className="tt">
      <div className="tt-wrap pb-8">
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
            <Link to="/stories" className="tt-btn tt-sub mt-5">이야기 고르러 가기</Link>
          </main>
        ) : (
          <main className="mt-5">
            <section className="tt-card" style={{ background: p.bg }}>
              <h1 className="flex items-baseline justify-between gap-2 text-[26px] font-extrabold leading-tight">
                <span>{p.title}</span>
                <CoinPill count={Math.max(1, Math.round(p.price / 1000))} label={`= ${won(p.price)}`} />
              </h1>
              <p className="mt-2 text-[18px] font-bold leading-snug">{p.question}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.topics.map((t) => (
                  <li key={t} className="tt-pill">{t}</li>
                ))}
              </ul>
            </section>
            {p.first != null && (
              <p className="mt-3 rounded-[14px] border-2 border-[var(--tt-ink)] bg-[#fff0c2] px-3 py-2 text-center text-[16px] font-extrabold">
                첫 구매 혜택 {won(p.first)}
              </p>
            )}
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--tt-muted)]">
              가격은 안내용이에요. 지금은 결제가 열려 있지 않아서, 이 화면에서는 아무것도 청구되지 않아요.
            </p>
            {p.to ? (
              <Link to={p.to} className="tt-btn tt-primary mt-4">
                {p.id === "basic" ? "생년월일 넣고 내 사주 보러 가기" : "궁합 보러 가기"} <span aria-hidden>→</span>
              </Link>
            ) : (
              <div className="mt-4 rounded-[18px] border-[3px] border-dashed border-[var(--tt-ink)] px-4 py-3 text-center">
                <p className="text-[17px] font-extrabold">아직 준비 중이에요</p>
                <p className="mt-1 text-[14px] text-[var(--tt-muted)]">열리면 이곳에서 바로 시작할 수 있게 할게요.</p>
              </div>
            )}
            <Link to="/stories" className="tt-btn tt-sub mt-3">다른 이야기 보기</Link>
          </main>
        )}
      </div>
    </div>
  );
}
