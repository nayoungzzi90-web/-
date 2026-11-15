import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { HomeTiles } from "@/components/ttotto/StoryPicker";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "또또사주 · 또또와 알아보는 나의 사주" }] }),
  component: Home,
});

// 홈(긴 홈화면 시안 배치 + 최종 확정 문구): 로고 → 제목 → 액자(또또·말풍선·불꽃) → 무료 시작 → 지금 뭐가 궁금해? 타일 → 오늘의 운세 → 하단 안내.
// '웹툰' 문구와 상단 '내 이야기'는 쓰지 않는다. 그림은 원본 분리본을 가로세로 비율 그대로 쓰고, 잘린 하단은 패널 하단에 붙인다.
function Home() {
  return (
    <div className="tt">
      <div className="tt-wrap pb-6">
        <header className="tt-header">
          <span className="tt-header-title">
            {TT.brand}
            <TtottoFace size={36} />
          </span>
        </header>

        <main>
          <h1 className="mt-3 text-center text-[clamp(28px,8.4vw,36px)] leading-[1.12]">또또와 알아보는 나의 사주</h1>

          {/* 액자: 또또(책)·불꽃은 하단이 잘린 원본이라 패널 하단에 맞춰 붙이고, 말풍선은 글자를 실제 HTML 로 올린다 */}
          <div className="tt-hero-panel mt-3" role="img" aria-label="책을 든 또또가 불꽃 친구에게 말해요: 너의 사주를 한번 봐볼까?">
            <span aria-hidden className="tt-glow" />
            <span aria-hidden className="tt-spark tt-spark-1">✦</span>
            <span aria-hidden className="tt-spark tt-spark-2">✦</span>
            <span aria-hidden className="tt-spark tt-spark-3">✧</span>
            <span aria-hidden className="tt-spark tt-spark-4">✦</span>
            <img src={ASSETS.heroBook} alt="" aria-hidden className="tt-hero-book" draggable={false} />
            <SpeechBubble className="tt-hero-speech">너의 사주를<br />한번 봐볼까?</SpeechBubble>
            <img src={ASSETS.heroFlame} alt="" aria-hidden className="tt-hero-flame" draggable={false} />
          </div>

          <div className="mt-3 text-center">
            <Link to="/input" className="tt-btn tt-primary tt-home-primary mx-auto w-[88%]">무료로 내 사주 보기</Link>
            <p className="mt-1.5 text-[15px] text-[var(--tt-ink)]">로그인 없이 시작 · 태어난 시간 몰라도 가능</p>
          </div>

          <section aria-labelledby="tt-stories-title" className="mt-4">
            <h2 id="tt-stories-title" className="text-center text-[clamp(23px,6.6vw,28px)] leading-tight">지금, 뭐가 가장 궁금해?</h2>
            <HomeTiles />
          </section>

          <section aria-labelledby="tt-today-title" className="mt-4">
            <h2 id="tt-today-title" className="flex items-center gap-2 text-[clamp(23px,6.6vw,28px)] leading-tight">오늘의 운세쿠키 <span className="tt-free-chip">무료</span></h2>
            <Link to="/daily-cookie" className="tt-cookie-box" aria-label="오늘의 운세쿠키 열어보기">
              <span aria-hidden className="tt-cookie-spark tt-cookie-spark-1">✦</span>
              <span aria-hidden className="tt-cookie-spark tt-cookie-spark-2">✧</span>
              <img src={ASSETS.cookieScene} alt="" aria-hidden className="tt-cookie-art" draggable={false} />
              <span className="tt-cookie-body">
                <span className="tt-cookie-sub">하루에 한 번,<br />운세를 뽑아봐!</span>
                <span className="tt-cookie-btn">쿠키 열어보기</span>
              </span>
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
