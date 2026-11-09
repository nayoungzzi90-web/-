import type { ReactNode } from "react";

// 오행 친구들 — 하얗고 통통한 "오리" 마스코트가 조선풍 옷을 입은 모습.
// 전부 직접 그린 SVG(외부 이미지·남의 그림·캐릭터 사용 없음).
// 솔이(목), 댕이(화), 호동이(토), 달토(금), 물이(수).
export type FriendKind = "seonbi" | "ssi" | "tiger" | "rabbit" | "turtle";
export type Accessory = "sunglasses" | "headphones" | "none";

const INK = "#2b1d2e";
const BEAK = "#f5a623";

export const FRIEND_INFO: Record<
  FriendKind,
  { name: string; role: string; element: string; tint: string }
> = {
  seonbi: { name: "솔이", role: "선비 오리", element: "목", tint: "#cfe8d5" },
  ssi: { name: "댕이", role: "아씨 오리", element: "화", tint: "#f9d3cf" },
  tiger: {
    name: "호동이",
    role: "호랑이 오리",
    element: "토",
    tint: "#f7e0a8",
  },
  rabbit: { name: "달토", role: "토끼 오리", element: "금", tint: "#e4e2ee" },
  turtle: { name: "물이", role: "거북이 오리", element: "수", tint: "#cdddf3" },
};

// 몸통 아래(옷·목도리) 색
const OUTFIT: Record<FriendKind, string> = {
  seonbi: "#5fae93",
  ssi: "#ea5f55",
  tiger: "#5d8be0",
  rabbit: "#9a8fd6",
  turtle: "#3f9a78",
};

function Duck({ kind, hideEyes }: { kind: FriendKind; hideEyes: boolean }) {
  return (
    <g>
      <ellipse cx="50" cy="96" rx="27" ry="3.5" fill="#000" opacity="0.16" />
      {/* 몸통 + 옷 */}
      <ellipse cx="50" cy="76" rx="31" ry="21" fill="#fffdf8" />
      <path
        d="M22 80C26 96 74 96 78 80C70 86 30 86 22 80Z"
        fill={OUTFIT[kind]}
      />
      {/* 작은 날개 */}
      <ellipse
        cx="21"
        cy="74"
        rx="7"
        ry="10"
        fill="#f4efe4"
        transform="rotate(18 21 74)"
      />
      <ellipse
        cx="79"
        cy="74"
        rx="7"
        ry="10"
        fill="#f4efe4"
        transform="rotate(-18 79 74)"
      />
      {/* 머리 */}
      <ellipse cx="50" cy="52" rx="33" ry="30" fill="#fffdf8" />
      <ellipse cx="50" cy="48" rx="26" ry="20" fill="#fff" opacity="0.5" />
      {/* 볼 */}
      <ellipse cx="29" cy="62" rx="6" ry="3.6" fill="#ff9aa8" opacity="0.55" />
      <ellipse cx="71" cy="62" rx="6" ry="3.6" fill="#ff9aa8" opacity="0.55" />
      {/* 눈 */}
      {!hideEyes && (
        <g>
          <ellipse cx="35" cy="54" rx="3.4" ry="4.2" fill={INK} />
          <ellipse cx="65" cy="54" rx="3.4" ry="4.2" fill={INK} />
          <circle cx="36.2" cy="52.4" r="1.3" fill="#fff" />
          <circle cx="66.2" cy="52.4" r="1.3" fill="#fff" />
        </g>
      )}
      {/* 부리 */}
      <path d="M40 62C40 56 60 56 60 62C60 70 40 70 40 62Z" fill={BEAK} />
      <path
        d="M42 63.5Q50 66.5 58 63.5"
        fill="none"
        stroke="#d98a12"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="46" cy="60.2" rx="3" ry="1.4" fill="#ffd27a" />
    </g>
  );
}

// 친구별 머리 장식(조선 소품 + 동물 두건)
const COSTUME: Record<FriendKind, ReactNode> = {
  seonbi: (
    <g>
      <ellipse cx="50" cy="29" rx="38" ry="7.5" fill="#2a2433" />
      <path d="M36 28C36 5 64 5 64 28Z" fill="#2a2433" />
      <path
        d="M37 29Q50 35 63 29"
        fill="none"
        stroke="#b83a26"
        strokeWidth="2.6"
      />
      <path
        d="M33 33L31 50M67 33L69 50"
        stroke="#b83a26"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  ),
  ssi: (
    <g>
      <path
        d="M20 46C18 22 34 12 50 12C66 12 82 22 80 46C74 34 64 28 50 28C36 28 26 34 20 46Z"
        fill="#2a2035"
      />
      <circle cx="50" cy="9" r="8" fill="#2a2035" />
      <path d="M44 14H56L54 19H46Z" fill="#e0504a" />
      <circle cx="68" cy="22" r="4.5" fill="#f2c15a" />
      <path
        d="M80 44C92 52 90 66 86 76"
        fill="none"
        stroke="#2a2035"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M82 72H90L88 82H84Z" fill="#d6404a" />
    </g>
  ),
  tiger: (
    <g>
      <circle cx="24" cy="30" r="11" fill="#f5a83e" />
      <circle cx="76" cy="30" r="11" fill="#f5a83e" />
      <circle cx="24" cy="31" r="5" fill="#ffc6cf" />
      <circle cx="76" cy="31" r="5" fill="#ffc6cf" />
      <path d="M22 40C22 18 78 18 78 40C70 30 30 30 22 40Z" fill="#f5a83e" />
      <path
        d="M44 22L46 30M50 21V30M56 22L54 30"
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </g>
  ),
  rabbit: (
    <g>
      <ellipse
        cx="32"
        cy="14"
        rx="8.5"
        ry="19"
        fill="#ece8f7"
        transform="rotate(-10 32 14)"
      />
      <ellipse
        cx="68"
        cy="14"
        rx="8.5"
        ry="19"
        fill="#ece8f7"
        transform="rotate(10 68 14)"
      />
      <ellipse
        cx="32"
        cy="16"
        rx="4"
        ry="12"
        fill="#ffc6cf"
        transform="rotate(-10 32 16)"
      />
      <ellipse
        cx="68"
        cy="16"
        rx="4"
        ry="12"
        fill="#ffc6cf"
        transform="rotate(10 68 16)"
      />
      <path d="M22 38C22 22 78 22 78 38C70 30 30 30 22 38Z" fill="#ece8f7" />
    </g>
  ),
  turtle: (
    <g>
      <path d="M20 40C20 14 80 14 80 40C70 32 30 32 20 40Z" fill="#3f9a78" />
      <path
        d="M50 17V31M34 22L38 32M66 22L62 32"
        stroke="#2f7a5e"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M26 31Q50 24 74 31"
        fill="none"
        stroke="#2f7a5e"
        strokeWidth="2.6"
      />
    </g>
  ),
};

function Acc({ kind }: { kind: Accessory }) {
  if (kind === "sunglasses")
    return (
      <g fill={INK}>
        <ellipse cx="34" cy="54" rx="10" ry="7" />
        <ellipse cx="66" cy="54" rx="10" ry="7" />
        <rect x="42" y="52" width="16" height="2.8" />
        <ellipse cx="31" cy="52" rx="3.4" ry="1.7" fill="#fff" opacity="0.35" />
        <ellipse cx="63" cy="52" rx="3.4" ry="1.7" fill="#fff" opacity="0.35" />
      </g>
    );
  if (kind === "headphones")
    return (
      <g>
        <path
          d="M17 52C14 14 86 14 83 52"
          fill="none"
          stroke="#f2f2f6"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="10" y="44" width="12" height="22" rx="6" fill="#f2f2f6" />
        <rect x="78" y="44" width="12" height="22" rx="6" fill="#f2f2f6" />
      </g>
    );
  return null;
}

export function Friend({
  kind,
  accessory = "none",
  size = 120,
  className,
}: {
  kind: FriendKind;
  accessory?: Accessory;
  size?: number;
  className?: string;
}) {
  const info = FRIEND_INFO[kind];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      overflow="visible"
      aria-label={`${info.name}(${info.role})`}
    >
      <Duck kind={kind} hideEyes={accessory === "sunglasses"} />
      {COSTUME[kind]}
      <Acc kind={accessory} />
    </svg>
  );
}
