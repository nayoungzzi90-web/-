import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, CookieIcon, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { FreeBanner, PRICE_NOTE, ProductGrid } from "@/components/ttotto/StoryPicker";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "또또사주 · 또또와 알아보는 나의 사주" }] }),
  component: Home,
});

// 홈(01): 로고 → 제목 → 또또와 불꽃 친구 → 큰 주황 버튼 → 작은 쿠키 버튼. 100vh 고정 없이 글자를 키우면 스크롤된다.
function Home() {
  return (
    <div className="tt">
      <div className="tt-wrap flex min-h-[100dvh] flex-col pb-6">
        <header className="tt-header">
          <span className="tt-header-title">
            {TT.brand}
            <TtottoFace size={36} />
          </span>
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <h1 className="mt-4 text-center text-[clamp(38px,11.5vw,50px)] leading-[1.12]">
            또또와 알아보는
            <br />나의 사주
          </h1>

          <div className="relative mx-auto mt-5 w-full max-w-[420px]">
            <img src={ASSETS.homeScene} alt="책을 읽는 또또와 웃는 불꽃 친구" className="block w-full" draggable={false} />
            <SpeechBubble className="absolute right-[1%] top-[0%] w-[52%]">{TT.home.speech}</SpeechBubble>
          </div>

          <div className="mt-5 space-y-3">
            <a
              href="#tt-stories"
              className="tt-btn tt-primary tt-home-primary"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("tt-stories");
                el?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
                (el?.querySelector("h2") as HTMLElement | null)?.focus({ preventScroll: true });
              }}
            >
              {TT.home.primary}
            </a>
            <Link to="/daily-cookie" className="tt-btn tt-sub tt-home-cookie">
              <CookieIcon className="w-12" />
              {TT.home.secondary}
              <span className="tt-badge">{TT.home.badge}</span>
            </Link>
          </div>

          {/* 이야기 선택: 홈 아래에 이어 붙인 영역(주 버튼을 누르면 여기로 내려온다) */}
          <section id="tt-stories" aria-labelledby="tt-stories-title" className="tt-stories-sec">
            <h2 id="tt-stories-title" tabIndex={-1} className="text-[clamp(26px,7.4vw,32px)] leading-tight outline-none">{TT.stories.title}</h2>
            <FreeBanner />
            <ProductGrid />
            <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">{PRICE_NOTE}</p>
          </section>
        </main>
      </div>
    </div>
  );
}
