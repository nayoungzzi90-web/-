import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, CookieIcon, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { PRICE_NOTE, ProductGrid } from "@/components/ttotto/StoryPicker";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "또또사주 · 또또와 알아보는 나의 사주" }] }),
  component: Home,
});

// 홈(합본 v2): 한 화면에서 필요한 것만, 눈에 띄는 순서대로.
// 제목 → 또또와 말풍선 → 주황 큰 버튼(무료 맛보기) → 오늘의 운세쿠키(작은 띠) → 이야기 고르기(상품 카드).
// 분리형(주 버튼 → 이야기 선택 화면)은 /home-split 에 남아 있다.
function Home() {
  return (
    <div className="tt">
      <div className="tt-wrap pb-8">
        <header className="tt-header">
          <span className="tt-header-title">
            {TT.brand}
            <TtottoFace size={36} />
          </span>
        </header>

        <main>
          <h1 className="mt-3 text-center text-[clamp(30px,9vw,40px)] leading-[1.12]">
            또또와 알아보는
            <br />
            나의 사주
          </h1>

          <div className="relative mx-auto mt-3 w-[88%] max-w-[360px]">
            <img src={ASSETS.homeScene} alt="책을 읽는 또또와 웃는 불꽃 친구" className="block w-full" draggable={false} />
            <SpeechBubble className="absolute right-[1%] top-[0%] w-[52%]">{TT.home.speech}</SpeechBubble>
          </div>

          <div className="mt-4 space-y-2.5">
            <Link to="/input" className="tt-btn tt-primary tt-home-primary">
              또또랑 내 사주 무료로 맛보기
            </Link>
            <Link to="/daily-cookie" className="tt-btn tt-sub tt-home-cookie tt-home-cookie-slim">
              <CookieIcon className="w-9" />
              {TT.home.secondary}
              <span className="tt-badge">{TT.home.badge}</span>
            </Link>
          </div>

          <section aria-labelledby="tt-stories-title" className="mt-6">
            <h2 id="tt-stories-title" className="text-[clamp(22px,6.4vw,27px)] leading-tight">{TT.stories.title}</h2>
            <ProductGrid />
            <p className="mt-3 text-center text-[12.5px] leading-relaxed text-[var(--tt-muted)]">{PRICE_NOTE}</p>
          </section>
        </main>
      </div>
    </div>
  );
}
