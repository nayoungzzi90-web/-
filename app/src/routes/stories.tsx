import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CardArt, TtottoFace } from "@/components/ttotto/Art";
import { TT, won } from "@/lib/ttotto-content";

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

          <Link to="/input" className="tt-card mt-3" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff4d4", minHeight: 48, padding: "8px 14px" }}>
            <TtottoFace size={30} />
            <span className="flex-1 text-[15px] font-extrabold leading-snug">{TT.stories.freeEntry}</span>
            <span aria-hidden className="font-extrabold">→</span>
          </Link>

          <ul className="mt-3 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            {TT.products.map((p, i) => (
              <li key={p.id} className={i === TT.products.length - 1 ? "min-[380px]:col-span-2" : undefined}>
                <Link
                  to="/story/$id"
                  params={{ id: p.id }}
                  className="tt-card h-full" 
                  style={{ background: p.bg }}
                  aria-label={`${p.title} ${won(p.price)}. ${p.question}`}
                >
                  <span className={`flex gap-2 ${i === TT.products.length - 1 ? "items-center" : "items-start"}`}>
                    <CardArt id={p.id} height={i === TT.products.length - 1 ? 64 : 44} />
                    <span className="min-w-0 flex-1">
                      <h2>
                        <span>{p.title}</span>
                        <span className="tt-price">{won(p.price)}</span>
                      </h2>
                      <p className="tt-q">{p.question}</p>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">
            가격을 보는 것만으로는 결제되지 않아요. 지금은 결제가 열려 있지 않아서, 상품을 눌러 내용을 먼저 확인할 수 있어요.
          </p>
        </main>
      </div>
    </div>
  );
}
