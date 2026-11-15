// 또또사주 삽화. 홈·상품 카드·쿠키 장면은 최종 4화면 시안에서 원본 픽셀을 분리한 7종(public/assets/ttotto-original, 원본 PNG: design/ttotto-cutouts)을 쓴다.
// 종이(쪽지)와 쿠키 아이콘만 이전에 생성한 PNG(public/assets/ttotto)를 쓴다. 그림은 CSS/이모지로 다시 그리지 않는다.
import type { ReactNode } from "react";
const O = (name: string) => `/assets/ttotto-original/${name}.webp`;
export const ASSETS = {
  homeScene: O("home-scene"),
  cookieScene: O("cookie-scene"),
  paper: "/assets/ttotto/fortune-paper.webp",
  cookieIcon: "/assets/ttotto/cookie-closed.webp",
} as const;
export const COOKIE_PRELOAD = [ASSETS.cookieScene, ASSETS.paper];

/** 로고 얼굴: 쿠키 장면 그림의 머리 부분만 보이게 자른다(원본 그림 그대로). */
export function TtottoFace({ size = 34 }: { size?: number }) {
  return (
    <span aria-hidden className="relative inline-block shrink-0 overflow-hidden" style={{ width: size, height: Math.round(size * 0.62) }}>
      <img src={ASSETS.cookieScene} alt="" className="absolute left-0 top-0 block w-full" draggable={false} />
    </span>
  );
}

const CARD_IMG: Record<string, { src: string; ratio: number }> = {
  basic: { src: O("card-my-saju"), ratio: 420 / 536 },
  love: { src: O("card-love"), ratio: 420 / 400 },
  compatibility: { src: O("card-compatibility"), ratio: 420 / 382 },
  date: { src: O("card-date"), ratio: 420 / 375 },
  year: { src: O("card-new-year"), ratio: 420 / 217 },
};
/** 상품 카드 삽화(원본 분리본, 높이 기준). */
export function CardArt({ id, height = 44 }: { id: string; height?: number }) {
  const c = CARD_IMG[id] ?? CARD_IMG["basic"]!;
  const w = Math.round(height * Math.max(1.1, Math.min(c.ratio, 2)));
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center" style={{ width: w, height }}>
      <img src={c.src} alt="" style={{ maxWidth: w, maxHeight: height, width: "auto", height: "auto" }} draggable={false} />
    </span>
  );
}

/** 쿠키 아이콘(홈 보조 버튼용). */
export function CookieIcon({ className = "" }: { className?: string }) {
  return <img src={ASSETS.cookieIcon} alt="" aria-hidden className={className} draggable={false} />;
}

/** 홈 말풍선: 타원 몸통과 곡선 꼬리를 SVG 선으로 그리고 글자는 실제 HTML 로 올린다(꼬리는 또또 얼굴 쪽을 가리킨다). */
export function SpeechBubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
    <div className="relative" style={{ aspectRatio: "200 / 126" }}>
      <svg viewBox="0 0 200 126" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden focusable="false">
        <ellipse cx="100" cy="52" rx="94" ry="48" fill="#fff" stroke="#1b1613" strokeWidth="6" />
        <path d="M50 92 C46 104 38 113 24 120 C48 120 70 112 86 99.6" fill="#fff" stroke="#1b1613" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M52.4 92.6 A94 48 0 0 0 84.6 99.4" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="butt" />
      </svg>
      <p className="tt-bubble-text">{children}</p>
    </div>
    </div>
  );
}
