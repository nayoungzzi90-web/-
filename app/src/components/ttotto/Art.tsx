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

const INK = "#1b1613";
const SW = 3;

/** 또또(새싹 친구) 단순 그림. 중심 (0,0), 몸 반지름 30. */
function Ttotto({ x, y, s = 1, smile = true }: { x: number; y: number; s?: number; smile?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-3 -27 C-18 -50 -42 -44 -37 -31 C-32 -23 -13 -22 -3 -27Z" fill="#8fd14f" />
      <path d="M3 -27 C12 -54 38 -50 35 -37 C31 -27 14 -25 3 -27Z" fill="#8fd14f" />
      <ellipse cx="0" cy="0" rx="31" ry="28" fill="#fffdf8" />
      <circle cx="-11" cy="-2" r="2.6" fill={INK} stroke="none" />
      <circle cx="11" cy="-2" r="2.6" fill={INK} stroke="none" />
      <path d="M-24 6 l5 -2 M-22 11 l5 -2 M24 6 l-5 -2 M22 11 l-5 -2" stroke="#ff7a3d" strokeWidth="2.6" fill="none" />
      {smile ? <path d="M-5 7 Q0 14 5 7 Z" fill="#ff9aa8" strokeWidth="2.4" /> : <path d="M-4 9 H4" fill="none" strokeWidth="2.4" />}
    </g>
  );
}

/** 불꽃 친구 단순 그림. 중심 (0,0). */
function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M2 -36 C6 -22 27 -14 27 8 C27 24 14 30 0 30 C-14 30 -27 24 -27 8 C-27 -4 -17 -8 -12 -22 C-6 -16 -3 -24 2 -36Z" fill="#ff8a3d" />
      <circle cx="-9" cy="6" r="2.4" fill={INK} stroke="none" />
      <circle cx="9" cy="6" r="2.4" fill={INK} stroke="none" />
      <path d="M-5 14 Q0 19 5 14" fill="none" strokeWidth="2.4" />
    </g>
  );
}

function Heart({ x, y, s = 1, fill = "#ff8fa3" }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 8 C-14 -2 -10 -14 -3 -12 C-1 -11 0 -9 0 -8 C0 -9 1 -11 3 -12 C10 -14 14 -2 0 8Z" fill={fill} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />;
}

function Spark({ x, y, s = 1, fill = "#ffc247" }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z" fill={fill} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />;
}

/** 홈·이야기 선택 상품 칸 그림(직접 그린 SVG, 가로 140:세로 100). */
function TileScene({ id }: { id: string }) {
  const g = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (id) {
    case "compatibility":
      return (<><Ttotto x={42} y={58} s={0.92} /><Flame x={98} y={62} s={0.85} /><Heart x={70} y={22} s={1.1} /><Spark x={124} y={22} s={0.8} /></>);
    case "love":
      return (
        <>
          <Ttotto x={42} y={58} s={0.92} />
          <g {...g}>
            <rect x="78" y="48" width="50" height="34" rx="5" fill="#fffdf8" />
            <path d="M78 52 L103 70 L128 52" fill="none" />
          </g>
          <Heart x={103} y={44} s={1.1} /><Heart x={126} y={26} s={0.7} fill="#ffc2cd" /><Spark x={76} y={26} s={0.7} />
        </>
      );
    case "money":
      return (
        <>
          <Ttotto x={42} y={56} s={0.92} />
          <g {...g}>
            <path d="M78 84 V72 A22 7 0 0 0 122 72 V84 A22 7 0 0 1 78 84Z" fill="#f6b73c" />
            <ellipse cx="100" cy="72" rx="22" ry="7" fill="#ffd36a" />
            <path d="M78 72 V60 A22 7 0 0 0 122 60 V72" fill="#f6b73c" />
            <ellipse cx="100" cy="60" rx="22" ry="7" fill="#ffd36a" />
          </g>
          <g {...g}><circle cx="108" cy="30" r="13" fill="#ffd36a" /><circle cx="108" cy="30" r="8" fill="none" strokeWidth="1.8" /></g>
          <text x="108" y="35" textAnchor="middle" fontSize="13" fontWeight="800" fill={INK}>₩</text>
          <Spark x={80} y={30} s={0.8} />
        </>
      );
    case "career":
      return (
        <>
          <Ttotto x={42} y={58} s={0.92} />
          <g {...g}>
            <path d="M92 52 V46 Q92 42 96 42 H112 Q116 42 116 46 V52" fill="none" />
            <rect x="78" y="52" width="50" height="34" rx="6" fill="#ff9a56" />
            <path d="M78 66 H128" fill="none" />
            <rect x="98" y="62" width="10" height="9" rx="2" fill="#ffe08f" />
          </g>
          <Spark x={126} y={32} s={0.9} /><Spark x={74} y={36} s={0.6} />
        </>
      );
    case "date":
      return (
        <>
          <Ttotto x={42} y={58} s={0.92} />
          <g {...g}>
            <rect x="78" y="34" width="50" height="50" rx="6" fill="#fffdf8" />
            <path d="M78 34 H128 V48 H78Z" fill="#ff8a6b" />
            <path d="M90 28 V38 M116 28 V38" fill="none" />
            <path d="M88 60 l5 5 l10 -11" fill="none" stroke="#2f9e5a" strokeWidth="4" />
            <path d="M112 60 h9 M88 74 h9 M106 74 h15" fill="none" strokeWidth="2.2" />
          </g>
          <Spark x={134} y={26} s={0.7} />
        </>
      );
    case "year":
      return (
        <>
          <Ttotto x={36} y={60} s={0.88} /><Flame x={80} y={66} s={0.72} />
          <g {...g}><path d="M100 94 A24 24 0 0 1 148 94Z" transform="translate(-14 0)" fill="#ffd36a" /></g>
          <Spark x={118} y={32} s={0.9} /><Spark x={96} y={22} s={0.6} />
        </>
      );
    default: // basic
      return (
        <>
          <Ttotto x={62} y={46} s={0.95} />
          <g {...g}>
            <path d="M32 66 Q48 62 62 70 V96 Q48 88 32 92Z" fill="#ff9a56" />
            <path d="M92 66 Q76 62 62 70 V96 Q76 88 92 92Z" fill="#ffb27a" />
          </g>
          <Spark x={20} y={30} s={0.9} /><Spark x={112} y={24} s={0.7} />
        </>
      );
  }
}

/** 상품 카드 삽화. widthPct 는 카드 안에서 차지하는 가로 비율. */
export function CardArt({ id, widthPct = 44 }: { id: string; widthPct?: number }) {
  return (
    <svg viewBox="0 0 140 100" className="block h-auto shrink-0 overflow-visible" style={{ width: `${widthPct}%` }} aria-hidden focusable="false">
      <TileScene id={id} />
    </svg>
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
