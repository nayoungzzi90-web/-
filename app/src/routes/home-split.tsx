import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, CookieIcon, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/home-split")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "또또사주 · 또또와 알아보는 나의 사주" }] }),
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
            <img src={ASSETS.heroBook} alt="책을 읽는 또또" className="mx-auto block w-[60%]" draggable={false} />
            <SpeechBubble className="absolute right-[1%] top-[0%] w-[52%]">{TT.home.speech}</SpeechBubble>
          </div>

          <div className="mt-5 space-y-3">
            <Link to="/stories" className="tt-btn tt-primary tt-home-primary">
              {TT.home.primary}
            </Link>
            <Link to="/daily-cookie" className="tt-btn tt-sub tt-home-cookie">
              <CookieIcon className="w-12" />
              {TT.home.secondary}
              <span className="tt-badge">{TT.home.badge}</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
