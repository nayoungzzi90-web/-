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
  return <img src={CARD_IMG[id] ?? CARD_IMG["basic"]} alt="" aria-hidden className="block h-auto shrink-0" style={{ width: `${widthPct}%` }} draggable={false} />;
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
          {/* 동글동글 구름 말풍선: 같은 원들을 먼저 두꺼운 선으로, 다시 채우기로 덮어 겹친 안쪽 선을 없앤다 */}
          <g stroke="#1b1613" strokeWidth="12" fill="#1b1613"><circle cx="36" cy="54" r="26" /><circle cx="62" cy="34" r="28" /><circle cx="100" cy="26" r="28" /><circle cx="138" cy="34" r="28" /><circle cx="164" cy="54" r="26" /><circle cx="150" cy="74" r="24" /><circle cx="112" cy="78" r="24" /><circle cx="76" cy="78" r="24" /><circle cx="48" cy="72" r="22" /><circle cx="100" cy="52" r="40" /><circle cx="50" cy="102" r="9" /><circle cx="35" cy="113" r="5.5" /></g>
          <g fill="#fffbe6"><circle cx="36" cy="54" r="26" /><circle cx="62" cy="34" r="28" /><circle cx="100" cy="26" r="28" /><circle cx="138" cy="34" r="28" /><circle cx="164" cy="54" r="26" /><circle cx="150" cy="74" r="24" /><circle cx="112" cy="78" r="24" /><circle cx="76" cy="78" r="24" /><circle cx="48" cy="72" r="22" /><circle cx="100" cy="52" r="40" /><circle cx="50" cy="102" r="9" /><circle cx="35" cy="113" r="5.5" /></g>
          <path d="M178 14 c-6-9-18-1-10 8 l10 9 l10-9 c8-9-4-17-10-8z" transform="translate(4 -10) scale(.9)" fill="#ff8fa3" stroke="#1b1613" strokeWidth="4" strokeLinejoin="round" />
        </svg>
        <p className="tt-bubble-text">{children}</p>
      </div>
    </div>
  );
}
