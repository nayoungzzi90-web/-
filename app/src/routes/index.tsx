import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ASSETS, CoinIcon, SpeechBubble, TtottoFace } from "@/components/ttotto/Art";
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
      {/* 위쪽 소개 구역: 따뜻한 색 띠 하나에 로고·제목·또또·시작 버튼을 담는다. 아래 상품 구역과 색으로 분리된다 */}
      {/* 맨 위 로고 줄: 하얀 바탕에 아래 가장자리를 물결 물방울로 */}
      <div className="tt-topbar">
        <div className="tt-band-inner">
          <header className="tt-header">
            <span className="tt-header-title">
              {TT.brand}
              <TtottoFace size={36} />
            </span>
          </header>
        </div>
        {/* 아래 상품 구역 위의 물결과 같은 모양으로 이어지는 가장자리 */}
        <svg className="tt-top-wave" viewBox="0 0 390 26" preserveAspectRatio="none" aria-hidden focusable="false">
          <path d="M0 0 H390 V12 C364 22 338 22 312 12 C286 2 260 2 234 12 C208 22 182 22 156 12 C130 2 104 2 78 12 C52 22 26 22 0 12 Z" />
        </svg>
      </div>

      <div className="tt-hero-band">
        <div className="tt-band-inner">

          {/* 눈에는 보이지 않지만 검색·화면 낭독기가 읽는 페이지 제목 */}
          <h1 className="sr-only">나의 사주, 또또가 알려줄게</h1>

          {/* 접힌 쪽지 + 만화 선(시안 C): 굵은 검은 선, 단단한 그림자, 접힌 모서리, "또또가"에 형광펜 */}
          <div className="tt-hero-note">
            <p>
              나의 사주, <u>또또가</u> 알려줄게
            </p>
          </div>

          {/* 또또(책)·불꽃은 하단이 잘린 원본이라 하단에 맞춰 붙이고, 말풍선은 글자를 실제 HTML 로 올린다 */}
          <div className="tt-hero-panel" role="img" aria-label="책을 든 또또가 인사해요: 안녕 반가워! 나는 또또야~">
            <span aria-hidden className="tt-glow" />
            <span aria-hidden className="tt-spark tt-spark-2">✦</span>
            <span aria-hidden className="tt-spark tt-spark-3">✧</span>
            <img src={ASSETS.heroBook} alt="" aria-hidden className="tt-hero-book" draggable={false} />
            <SpeechBubble className="tt-hero-speech">안녕 반가워!<br />나는 또또야~</SpeechBubble>
            <img src={ASSETS.heroFlame} alt="" aria-hidden className="tt-hero-flame" draggable={false} />
          </div>

          <div className="tt-home-cta">
            <Link ref={ctaRef} to="/input" className="tt-btn tt-primary tt-home-primary">무료로 내 사주 보기</Link>
            <p>로그인 없이 시작 · 태어난 시간 몰라도 가능</p>
          </div>
        </div>
        {/* 띠 아래 가장자리를 물결로: 둥근 모서리 대신 구름 같은 경계 */}
        <svg className="tt-band-wave" viewBox="0 0 390 26" preserveAspectRatio="none" aria-hidden focusable="false">
          <path d="M0 26 V12 C26 2 52 2 78 11 C104 20 130 20 156 11 C182 2 208 2 234 11 C260 20 286 20 312 11 C338 2 364 2 390 12 V26Z" />
        </svg>
      </div>

      <div className="tt-wrap pb-28">
        <main>
          <section aria-labelledby="tt-stories-title" className="mt-4">
            <h2 id="tt-stories-title" className="text-center text-[clamp(23px,6.6vw,28px)] leading-tight">지금, 뭐가 가장 <mark className="tt-mark">궁금해?</mark></h2>
            <p className="tt-price-note">
              <CoinIcon size={22} />
              <b className="tt-price-one">1</b>
              <b>= {won(basePrice)}</b>
            </p>
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
