import type { ReactNode } from "react";

// 오행 친구들 — 말랑한 인형 스타일. 전부 직접 그린 SVG(외부 이미지·남의 그림 사용 없음).
// 솔이(목), 댕이(화), 호동이(토), 달토(금), 물이(수).
export type FriendKind = "seonbi" | "ssi" | "tiger" | "rabbit" | "turtle";
export type Accessory = "sunglasses" | "headphones" | "party" | "tiara" | "cap" | "none";

const INK = "#2b1d2e";

export const FRIEND_INFO: Record<
  FriendKind,
  { name: string; role: string; element: string; tint: string }
> = {
  seonbi: { name: "솔이", role: "선비", element: "목", tint: "#cfe8d5" },
  ssi: { name: "댕이", role: "아씨", element: "화", tint: "#f9d3cf" },
  tiger: { name: "호동이", role: "호랑이", element: "토", tint: "#f7e0a8" },
  rabbit: { name: "달토", role: "토끼", element: "금", tint: "#e4e2ee" },
  turtle: { name: "물이", role: "거북이", element: "수", tint: "#cdddf3" },
};

function Face({ y = 56, dx = 11 }: { y?: number; dx?: number }) {
  return (
    <g>
      <ellipse cx={50 - dx} cy={y} rx="3.4" ry="4" fill={INK} />
      <ellipse cx={50 + dx} cy={y} rx="3.4" ry="4" fill={INK} />
      <circle cx={50 - dx + 1.2} cy={y - 1.4} r="1.2" fill="#fff" />
      <circle cx={50 + dx + 1.2} cy={y - 1.4} r="1.2" fill="#fff" />
      <ellipse cx={50 - dx - 6} cy={y + 7} rx="5" ry="3" fill="#ff9aa8" opacity="0.55" />
      <ellipse cx={50 + dx + 6} cy={y + 7} rx="5" ry="3" fill="#ff9aa8" opacity="0.55" />
      <path d="M46 64Q50 68 54 64" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Shade() {
  return <ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#000" opacity="0.14" />;
}

// 소품(얼굴 위에 얹는다)
function Acc({ kind }: { kind: Accessory }) {
  switch (kind) {
    case "sunglasses":
      return (
        <g fill={INK}>
          <ellipse cx="38" cy="56" rx="9" ry="6.5" />
          <ellipse cx="62" cy="56" rx="9" ry="6.5" />
          <rect x="45" y="54" width="10" height="2.6" />
          <ellipse cx="35" cy="54" rx="3" ry="1.6" fill="#fff" opacity="0.35" />
          <ellipse cx="59" cy="54" rx="3" ry="1.6" fill="#fff" opacity="0.35" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M20 54C18 20 82 20 80 54" fill="none" stroke="#f2f2f6" strokeWidth="5" strokeLinecap="round" />
          <rect x="14" y="48" width="11" height="20" rx="5" fill="#f2f2f6" />
          <rect x="75" y="48" width="11" height="20" rx="5" fill="#f2f2f6" />
        </g>
      );
    case "party":
      return (
        <g>
          <path d="M36 32L50 4L64 32Z" fill="#ffd36b" />
          <path d="M40 24L60 24M43 16L57 16" stroke="#ff8fa3" strokeWidth="3" />
          <circle cx="50" cy="4" r="4" fill="#ff8fa3" />
        </g>
      );
    case "tiara":
      return (
        <g fill="#f1f1f7" stroke="#c9c9d6" strokeWidth="1.5">
          <path d="M32 32L36 18L44 28L50 14L56 28L64 18L68 32Z" />
          <circle cx="50" cy="19" r="3.2" fill="#ff8fa3" stroke="none" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M28 34C28 12 72 12 72 34Z" fill="#4a7fd6" />
          <path d="M26 34H82C82 40 70 40 62 38H26Z" fill="#3a66b4" />
          <circle cx="50" cy="13" r="3" fill="#3a66b4" />
        </g>
      );
    default:
      return null;
  }
}

// 몸: 둥글둥글한 인형. 친구마다 머리 위 조선 소품과 색이 다르다.
const BODY: Record<FriendKind, ReactNode> = {
  seonbi: (
    <g>
      <ellipse cx="50" cy="80" rx="30" ry="18" fill="#6bb89f" />
      <path d="M44 66L50 80L56 66Z" fill="#fffaf0" />
      <circle cx="50" cy="52" r="29" fill="#fff3e2" />
      {/* 갓 */}
      <ellipse cx="50" cy="29" rx="38" ry="8" fill="#2a2433" opacity="0.92" />
      <path d="M36 28C36 6 64 6 64 28Z" fill="#2a2433" />
      <path d="M37 29Q50 36 63 29" fill="none" stroke="#b83a26" strokeWidth="2.5" />
    </g>
  ),
  ssi: (
    <g>
      <path d="M74 56C90 64 88 82 82 92" fill="none" stroke="#2a2035" strokeWidth="9" strokeLinecap="round" />
      <path d="M77 84H88L86 95H79Z" fill="#d6404a" />
      <ellipse cx="50" cy="80" rx="30" ry="18" fill="#ee6a5f" />
      <path d="M44 66L50 80L56 66Z" fill="#fffaf0" />
      <circle cx="50" cy="52" r="29" fill="#fff3e2" />
      <path d="M22 50C20 24 36 12 50 12C64 12 80 24 78 50C74 36 64 30 50 30C36 30 26 36 22 50Z" fill="#2a2035" />
      <circle cx="68" cy="22" r="5" fill="#f2c15a" />
    </g>
  ),
  tiger: (
    <g>
      <ellipse cx="50" cy="80" rx="30" ry="18" fill="#5d8be0" />
      <circle cx="22" cy="30" r="12" fill="#f5b04a" />
      <circle cx="78" cy="30" r="12" fill="#f5b04a" />
      <circle cx="22" cy="31" r="6" fill="#ffc6cf" />
      <circle cx="78" cy="31" r="6" fill="#ffc6cf" />
      <circle cx="50" cy="52" r="31" fill="#f5b04a" />
      <ellipse cx="50" cy="63" rx="14" ry="10" fill="#fff3e2" />
      <path d="M44 26L46 36M50 24V35M56 26L54 36" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M20 50L29 53M20 59L29 59M80 50L71 53M80 59L71 59" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="58" rx="4" ry="3" fill={INK} />
    </g>
  ),
  rabbit: (
    <g>
      <ellipse cx="50" cy="80" rx="30" ry="18" fill="#9a8fd6" />
      <ellipse cx="36" cy="22" rx="9" ry="19" fill="#fffaf5" />
      <ellipse cx="64" cy="22" rx="9" ry="19" fill="#fffaf5" />
      <ellipse cx="36" cy="23" rx="4.5" ry="13" fill="#ffc6cf" />
      <ellipse cx="64" cy="23" rx="4.5" ry="13" fill="#ffc6cf" />
      <circle cx="50" cy="55" r="29" fill="#fffaf5" />
    </g>
  ),
  turtle: (
    <g>
      <ellipse cx="50" cy="82" rx="36" ry="17" fill="#3f9a78" />
      <path d="M22 80C26 66 74 66 78 80" fill="none" stroke="#2f7a5e" strokeWidth="3" />
      <path d="M40 70V90M60 70V90" stroke="#2f7a5e" strokeWidth="3" />
      <circle cx="50" cy="52" r="28" fill="#8fd1a6" />
    </g>
  ),
};

const NO_FACE_ACC: Accessory = "none";

export function Friend({
  kind,
  accessory = NO_FACE_ACC,
  size = 120,
  className,
}: {
  kind: FriendKind;
  accessory?: Accessory;
  size?: number;
  className?: string;
}) {
  const label = `${FRIEND_INFO[kind].name}(${FRIEND_INFO[kind].role})`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label}
    >
      <Shade />
      {BODY[kind]}
      <Face />
      <Acc kind={accessory} />
    </svg>
  );
}
