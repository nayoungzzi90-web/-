// 또또사주 삽화. 홈·상품 카드·쿠키 장면은 최종 4화면 시안에서 원본 픽셀을 분리한 7종(public/assets/ttotto-original, 원본 PNG: design/ttotto-cutouts)을 쓴다.
// 종이(쪽지)와 쿠키 아이콘만 이전에 생성한 PNG(public/assets/ttotto)를 쓴다. 그림은 CSS/이모지로 다시 그리지 않는다.
import type { ReactNode } from "react";
const L = (name: string) => `/assets/ttotto-long-home/${name}.webp`;
export const ASSETS = {
  heroBook: L("hero-ttotto-book"),
  heroFlame: L("hero-flame"),
  dailyFortune: L("daily-fortune"),
  logoFace: L("logo-face"),
  cookieScene: "/assets/ttotto-original/cookie-scene.webp",
  paper: "/assets/ttotto/fortune-paper.webp",
  cookieIcon: "/assets/ttotto/cookie-closed.webp",
} as const;
export const COOKIE_PRELOAD = [ASSETS.cookieScene, ASSETS.paper];

/** 로고 얼굴(원본 분리본 logo-face). */
export function TtottoFace({ size = 34 }: { size?: number }) {
  return <img src={ASSETS.logoFace} alt="" aria-hidden width={size} height={size} style={{ width: size, height: size }} className="inline-block shrink-0" draggable={false} />;
}

const CARD_IMG: Record<string, string> = {
  basic: L("card-my-saju"),
  love: L("card-love"),
  compatibility: L("card-compatibility"),
  date: L("card-date"),
  year: L("card-new-year"),
  money: L("card-money"),
  career: L("card-career"),
};
/** 상품 카드 삽화(원본 분리본, 가로 비율 유지). widthPct 는 카드 안에서 차지하는 가로 비율. */
export function CardArt({ id, widthPct = 44, fit = false }: { id: string; widthPct?: number; fit?: boolean }) {
  const src = CARD_IMG[id] ?? CARD_IMG["basic"];
  // fit: 정해진 크기 상자 안에 비율을 지키며 맞춘다(칸마다 그림 크기·글자 위치를 같게 하려는 용도).
  if (fit) {
    const tall = id === "money" || id === "career";
    // 세로로 긴 그림은 조금 줄이고 가로로 넓은 그림은 조금 키워 시각 크기를 맞춘다.
    return <img src={src} alt="" aria-hidden className="block h-full w-full object-contain object-bottom" style={{ transform: `scale(${tall ? 1 : 0.88})`, transformOrigin: "50% 100%" }} draggable={false} />;
  }
  // 재물운·직업운 그림은 세로로 긴 원본이라 폭이 아니라 높이로 맞춘다.
  if (id === "money" || id === "career") {
    return <img src={src} alt="" aria-hidden className="block shrink-0" style={{ height: `${Math.round(widthPct * 1.9)}px`, width: "auto", maxHeight: "112px" }} draggable={false} />;
  }
  return <img src={src} alt="" aria-hidden className="block h-auto shrink-0" style={{ width: `${widthPct}%` }} draggable={false} />;
}

/** 쿠키 아이콘(쿠키 화면용). */
export function CookieIcon({ className = "" }: { className?: string }) {
  return <img src={ASSETS.cookieIcon} alt="" aria-hidden className={className} draggable={false} />;
}

/** 홈 말풍선: 타원 몸통과 곡선 꼬리를 SVG 선으로 그리고 글자는 실제 HTML 로 올린다(꼬리는 또또 얼굴 쪽을 가리킨다). */
export function SpeechBubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="relative" style={{ aspectRatio: "200 / 116" }}>
        <svg viewBox="0 0 200 116" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden focusable="false">
          {/* 젤리 방울: 말랑한 몸통에 짧은 꼬리 한 줄 + 윤기 */}
          <path d="M18 52 C18 20 58 6 100 6 C148 6 184 22 184 52 C184 80 148 94 104 94 L60 94 C52 102 44 108 32 112 C38 104 40 98 38 90 C26 84 18 70 18 52Z" fill="#ffe9a6" stroke="#1b1613" strokeWidth="6" strokeLinejoin="round" />
          <path d="M40 34 C50 22 70 16 88 15" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
          <circle cx="106" cy="14" r="3.5" fill="#fff" />
        </svg>
        <p className="tt-bubble-text">{children}</p>
      </div>
    </div>
  );
}
