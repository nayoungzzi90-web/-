import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { TtottoFace } from "@/components/ttotto/Art";
import { FreeBanner, PRICE_NOTE, ProductGrid } from "@/components/ttotto/StoryPicker";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/stories")({
  head: () => ({ meta: [{ title: "궁금한 이야기를 골라봐 · 또또사주" }] }),
  component: Stories,
});

function Stories() {
  const nav = useNavigate();
  const back = () => (window.history.length > 1 ? window.history.back() : void nav({ to: "/" }));
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

        <main>
          <h1 className="mt-5 text-[clamp(26px,7.4vw,32px)] font-extrabold leading-tight">{TT.stories.title}</h1>

          <FreeBanner />
          <ProductGrid />

          <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">{PRICE_NOTE}</p>
        </main>
      </div>
    </div>
  );
}
