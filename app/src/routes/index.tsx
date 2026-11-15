import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, CardArt, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { HomeTiles } from "@/components/ttotto/StoryPicker";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "또또사주 · 또또와 알아보는 나의 사주" }] }),
  component: Home,
});

// 홈(2026-11-15 시안 "또또사주 운세 가격 업데이트" 배치): 상단 로고+내 이야기 → 제목 → 액자 속 또또·말풍선·불꽃 → 무료 시작 버튼 → 지금 뭐가 궁금해? 상품 타일 → 오늘의 운세 → 하단 안내.
// 시안 문구 중 '웹툰'은 결과가 웹툰 형식이 아니라는 이전 결정에 따라 쓰지 않았다. 이전 분리형·합본은 /home-split, git 이력에 있다.
function Home() {
  return (
    <div className="tt">
      <div className="tt-wrap pb-6">
        <header className="tt-header justify-between">
          <span className="tt-header-title">
            {TT.brand}
            <TtottoFace size={34} />
          </span>
          <Link to="/result" className="tt-home-my">내 이야기</Link>
        </header>

        <main>
          <h1 className="mt-3 text-center text-[clamp(28px,8.4vw,36px)] leading-[1.12]">또또와 알아보는 나의 사주</h1>

          <div className="tt-hero-box mt-3">
            <div className="relative mx-auto w-[96%]">
              <img src={ASSETS.homeScene} alt="책을 읽는 또또와 불꽃 친구" className="block w-full" draggable={false} />
              <SpeechBubble className="absolute right-[1%] top-[0%] w-[52%]">네 이야기,<br />펼쳐볼까?</SpeechBubble>
            </div>
          </div>

          <div className="mt-3 text-center">
            <Link to="/input" className="tt-btn tt-primary tt-home-primary">무료로 내 사주 보기</Link>
            <p className="mt-1.5 text-[15px] text-[var(--tt-ink)]">로그인 없이 시작 · 태어난 시간 몰라도 가능</p>
            <Link to="/sample" className="tt-home-sample">예시 결과 먼저 보기</Link>
          </div>

          <section aria-labelledby="tt-stories-title" className="mt-4">
            <h2 id="tt-stories-title" className="text-center text-[clamp(23px,6.6vw,28px)] leading-tight">지금, 뭐가 가장 궁금해?</h2>
            <HomeTiles />
          </section>

          <section aria-labelledby="tt-today-title" className="mt-4">
            <h2 id="tt-today-title" className="text-[clamp(23px,6.6vw,28px)] leading-tight">오늘의 운세</h2>
            <Link to="/daily-cookie" className="tt-today-box">
              <CardArt id="basic" height={64} />
              <span className="min-w-0 flex-1 text-[16.5px] font-bold leading-snug">오늘은 어떤 하루가 될까?</span>
              <span className="tt-today-go">오늘의 운세 보기 →</span>
            </Link>
          </section>
        </main>

        <footer className="tt-home-foot">
          <span>사주는 나를 이해하는 하나의 관점이에요.</span>
          <span className="tt-home-foot-links">이용안내 · 개인정보처리방침</span>
        </footer>
      </div>
    </div>
  );
}
