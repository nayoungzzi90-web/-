import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
import { HomeTiles } from "@/components/ttotto/StoryPicker";
import { TT, won } from "@/lib/ttotto-content";

// 가장 흔한 가격(한 번만 알려 주고 칸마다 반복하지 않는다)
const basePrice = Math.min(...TT.products.map((p) => p.price));

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "또또사주 · 나의 사주, 또또가 알려줄게" }] }),
  component: Home,
});

// 홈(긴 홈화면 시안 배치 + 최종 확정 문구): 로고 → 제목 → 액자(또또·말풍선·불꽃) → 무료 시작 → 지금 뭐가 궁금해? 타일 → 오늘의 운세 → 하단 안내.
// '웹툰' 문구와 상단 '내 이야기'는 쓰지 않는다. 그림은 원본 분리본을 가로세로 비율 그대로 쓰고, 잘린 하단은 패널 하단에 붙인다.
function Home() {
  // 모바일: 첫 버튼이 화면 위로 지나가면 아래에 같은 버튼을 고정해 보여 준다(어디서든 한 번에 시작).
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!!e && !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="tt tt-home">
      <div className="tt-wrap pb-28">
        <header className="tt-header">
          <span className="tt-header-title">
            {TT.brand}
            <TtottoFace size={36} />
          </span>
        </header>

        <main>
          <h1 className="tt-home-title">나의 사주, 또또가 알려줄게</h1>

          {/* 액자: 또또(책)·불꽃은 하단이 잘린 원본이라 패널 하단에 맞춰 붙이고, 말풍선은 글자를 실제 HTML 로 올린다 */}
          <div className="tt-hero-panel mt-3" role="img" aria-label="책을 든 또또가 불꽃 친구에게 말해요: 너의 사주를 한번 봐볼까?">
            <span aria-hidden className="tt-glow" />
            <span aria-hidden className="tt-spark tt-spark-2">✦</span>
            <span aria-hidden className="tt-spark tt-spark-3">✧</span>
            <img src={ASSETS.heroBook} alt="" aria-hidden className="tt-hero-book" draggable={false} />
            <SpeechBubble className="tt-hero-speech">너의 사주를<br />한번 봐볼까?</SpeechBubble>
            <img src={ASSETS.heroFlame} alt="" aria-hidden className="tt-hero-flame" draggable={false} />
          </div>

          <div className="mt-3 text-center">
            <Link ref={ctaRef} to="/input" className="tt-btn tt-primary tt-home-primary mx-auto w-[88%]">무료로 내 사주 보기</Link>
            <p className="mt-1.5 text-[15px] text-[var(--tt-ink)]">로그인 없이 시작 · 태어난 시간 몰라도 가능</p>
          </div>

          <section aria-labelledby="tt-stories-title" className="mt-4">
            <h2 id="tt-stories-title" className="text-center text-[clamp(23px,6.6vw,28px)] leading-tight">지금, 뭐가 가장 궁금해?</h2>
            <p className="tt-price-note">이야기 하나에 {won(basePrice)}</p>
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

        <div className={stuck ? "tt-sticky-cta is-on" : "tt-sticky-cta"} aria-hidden={!stuck}>
          <Link to="/input" className="tt-btn tt-primary" tabIndex={stuck ? 0 : -1}>무료로 내 사주 보기</Link>
        </div>

        <footer className="tt-home-foot">
          <span>사주는 나를 이해하는 하나의 관점이에요.</span>
          <span className="tt-home-foot-links">이용안내 · 개인정보처리방침</span>
        </footer>
      </div>
    </div>
  );
}
