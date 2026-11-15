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
};
/** 상품 카드 삽화(원본 분리본, 가로 비율 유지). widthPct 는 카드 안에서 차지하는 가로 비율. */
export function CardArt({ id, widthPct = 44 }: { id: string; widthPct?: number }) {
  if (id === "money" || id === "career") return <PropArt kind={id} widthPct={widthPct} />;
  return <img src={CARD_IMG[id] ?? CARD_IMG["basic"]} alt="" aria-hidden className="block h-auto shrink-0" style={{ width: `${widthPct}%` }} draggable={false} />;
}

/** 재물운·직업운 카드: 또또 얼굴 원본 + 직접 그린 소품(동전 더미·서류가방). 새 캐릭터를 그리지 않는다. */
function PropArt({ kind, widthPct }: { kind: "money" | "career"; widthPct: number }) {
  return (
    <span className="relative block shrink-0" style={{ width: `${widthPct}%`, aspectRatio: "1.45 / 1" }} aria-hidden>
      <img src={ASSETS.logoFace} alt="" className="absolute left-[4%] top-[6%] block h-[86%] w-auto" draggable={false} />
      <svg viewBox="0 0 60 60" className="absolute bottom-[2%] right-[0%] h-[62%] w-auto overflow-visible" focusable="false">
        {kind === "money" ? (
          <g stroke="#1b1613" strokeWidth="3.5" strokeLinejoin="round">
            <ellipse cx="30" cy="48" rx="20" ry="7" fill="#f6b73c" />
            <path d="M10 48 V40 A20 7 0 0 0 50 40 V48" fill="#f6b73c" />
            <ellipse cx="30" cy="40" rx="20" ry="7" fill="#ffd36a" />
            <ellipse cx="30" cy="28" rx="20" ry="7" fill="#ffd36a" />
            <path d="M10 28 V40" fill="none" /><path d="M50 28 V40" fill="none" />
            <ellipse cx="30" cy="18" rx="20" ry="7" fill="#ffe08f" />
            <path d="M10 18 V28 M50 18 V28" fill="none" />
          </g>
        ) : (
          <g stroke="#1b1613" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M21 20 V14 Q21 10 25 10 H35 Q39 10 39 14 V20" fill="none" />
            <rect x="6" y="20" width="48" height="32" rx="7" fill="#ff9a56" />
            <path d="M6 33 H54" fill="none" />
            <rect x="26" y="30" width="8" height="7" rx="2" fill="#ffe08f" />
          </g>
        )}
      </svg>
    </span>
  );
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
          <path d="M18 52 C18 20 58 6 100 6 C148 6 184 22 184 52 C184 80 148 94 104 94 L60 94 C52 102 44 108 32 112 C38 104 40 98 38 90 C26 84 18 70 18 52Z" fill="#d9f3ff" stroke="#1b1613" strokeWidth="6" strokeLinejoin="round" />
          <path d="M40 34 C50 22 70 16 88 15" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
          <circle cx="106" cy="14" r="3.5" fill="#fff" />
        </svg>
        <p className="tt-bubble-text">{children}</p>
      </div>
    </div>
  );
}
