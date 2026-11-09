import type { CSSProperties, ReactNode } from "react";

// 조선시대 오행 친구들(만화풍 SVG). 전부 직접 그린 그림이며 외부 이미지·상표를 쓰지 않는다.
// 선비 솔이(목), 아씨 댕이(화), 호랑이 호동이(토), 토끼 달토(금), 거북이 물이(수).
export type FriendKind = "seonbi" | "ssi" | "tiger" | "rabbit" | "turtle";

const INK = "#2b1d2e";
const SW = 3;
const SKIN = "#ffe4cc";

function Blush({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <>
      <ellipse cx={x1} cy={y} rx="5" ry="3" fill="#ff9aa8" opacity="0.7" stroke="none" />
      <ellipse cx={x2} cy={y} rx="5" ry="3" fill="#ff9aa8" opacity="0.7" stroke="none" />
    </>
  );
}
function Eyes({ y, dx = 8, r = 3.2 }: { y: number; dx?: number; r?: number }) {
  return (
    <>
      <circle cx={50 - dx} cy={y} r={r} fill={INK} stroke="none" />
      <circle cx={50 + dx} cy={y} r={r} fill={INK} stroke="none" />
      <circle cx={50 - dx + 1.1} cy={y - 1.1} r="1" fill="#fff" stroke="none" />
      <circle cx={50 + dx + 1.1} cy={y - 1.1} r="1" fill="#fff" stroke="none" />
    </>
  );
}

const ART: Record<FriendKind, ReactNode> = {
  // 선비 솔이: 갓을 쓴 푸른 도포
  seonbi: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M16 95C16 75 30 67 50 67C70 67 84 75 84 95Z" fill="#4aa391" />
      <path d="M41 67L50 83L59 67" fill="#fffaf0" strokeWidth="2.5" />
      <path d="M50 83V95" strokeWidth="2.5" />
      <ellipse cx="50" cy="48" rx="21" ry="21" fill={SKIN} />
      <path d="M33 36C33 14 67 14 67 36Z" fill="#2a2433" />
      <ellipse cx="50" cy="36" rx="37" ry="8" fill="#2a2433" />
      <path d="M36 35Q50 42 64 35" fill="none" stroke="#8a7fa0" strokeWidth="2" />
      <path d="M31 40L35 60" fill="none" stroke="#b83a26" strokeWidth="2.5" />
      <path d="M69 40L65 60" fill="none" stroke="#b83a26" strokeWidth="2.5" />
      <Eyes y={50} />
      <path d="M45 58Q50 62 55 58" fill="none" strokeWidth="2.5" />
      <Blush x1={36} x2={64} y={55} />
    </g>
  ),
  // 아씨 댕이: 댕기머리와 붉은 저고리
  ssi: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M72 58C84 64 82 80 77 90" fill="none" stroke="#2a2035" strokeWidth="9" />
      <path d="M72 58C84 64 82 80 77 90" fill="none" stroke={INK} strokeWidth="1" opacity="0" />
      <path d="M71 84L83 84L81 95L73 95Z" fill="#c8323a" />
      <path d="M20 95C20 77 32 69 50 69C68 69 80 77 80 95Z" fill="#e0504a" />
      <path d="M42 69L50 82L58 69" fill="#fffaf0" strokeWidth="2.5" />
      <path d="M50 82L42 91L49 93Z" fill="#3b6fb6" strokeWidth="2.5" />
      <path d="M50 82L58 91L51 93Z" fill="#3b6fb6" strokeWidth="2.5" />
      <path
        d="M26 50C24 26 36 13 50 13C64 13 76 26 74 50C74 58 72 62 70 66L30 66C28 62 26 58 26 50Z"
        fill="#2a2035"
      />
      <ellipse cx="50" cy="48" rx="19" ry="20" fill={SKIN} />
      <path d="M31 38C38 47 62 47 69 38C66 24 58 20 50 20C42 20 34 24 31 38Z" fill="#2a2035" />
      <circle cx="64" cy="25" r="4.5" fill="#e2b04a" strokeWidth="2.5" />
      <Eyes y={50} dx={7.5} />
      <path d="M45 58Q50 62 55 58" fill="none" strokeWidth="2.5" />
      <Blush x1={36} x2={64} y={55} />
    </g>
  ),
  // 호랑이 호동이: 줄무늬와 푸른 조끼
  tiger: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 95C26 83 36 79 50 79C64 79 74 83 74 95Z" fill="#3b6fb6" />
      <circle cx="25" cy="29" r="11" fill="#f4a63c" />
      <circle cx="75" cy="29" r="11" fill="#f4a63c" />
      <circle cx="25" cy="30" r="5" fill="#ffb8c4" strokeWidth="2" />
      <circle cx="75" cy="30" r="5" fill="#ffb8c4" strokeWidth="2" />
      <ellipse cx="50" cy="52" rx="31" ry="28" fill="#f4a63c" />
      <path d="M43 26L45 35M50 24V34M57 26L55 35" fill="none" strokeWidth="3.2" />
      <path d="M21 48L30 51M21 57L30 57M79 48L70 51M79 57L70 57" fill="none" strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="16" ry="12" fill="#fff6e8" />
      <path d="M45.5 56H54.5L50 61.5Z" fill="#e0707a" strokeWidth="2.2" />
      <path d="M50 61.5V65M44 67Q50 71 56 67" fill="none" strokeWidth="2.5" />
      <Eyes y={47} dx={12} r={3.4} />
      <Blush x1={31} x2={69} y={58} />
    </g>
  ),
  // 토끼 달토: 긴 귀와 연보라 한복
  rabbit: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 95C26 83 36 79 50 79C64 79 74 83 74 95Z" fill="#9b98e0" />
      <ellipse cx="37" cy="24" rx="9" ry="21" fill="#fffaf0" transform="rotate(-6 37 24)" />
      <ellipse
        cx="37"
        cy="26"
        rx="4.2"
        ry="14"
        fill="#ffb8c4"
        strokeWidth="0"
        transform="rotate(-6 37 26)"
      />
      <ellipse cx="63" cy="24" rx="9" ry="21" fill="#fffaf0" transform="rotate(6 63 24)" />
      <ellipse
        cx="63"
        cy="26"
        rx="4.2"
        ry="14"
        fill="#ffb8c4"
        strokeWidth="0"
        transform="rotate(6 63 26)"
      />
      <ellipse cx="50" cy="58" rx="28" ry="24" fill="#fffaf0" />
      <Eyes y={56} dx={10} r={3.4} />
      <ellipse cx="50" cy="62" rx="3" ry="2.2" fill="#e0707a" strokeWidth="2" />
      <path d="M50 64.2Q47 68 43.5 66M50 64.2Q53 68 56.5 66" fill="none" strokeWidth="2.3" />
      <Blush x1={31} x2={69} y={64} />
      <path d="M40 78Q50 84 60 78" fill="#f4d35e" stroke={INK} strokeWidth="2.5" />
    </g>
  ),
  // 거북이 물이: 푸른 등딱지
  turtle: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="30" cy="91" rx="9" ry="5" fill="#8fd0a8" />
      <ellipse cx="70" cy="91" rx="9" ry="5" fill="#8fd0a8" />
      <path
        d="M14 82C14 58 30 52 50 52C70 52 86 58 86 82C86 88 70 92 50 92C30 92 14 88 14 82Z"
        fill="#2f7068"
      />
      <path
        d="M32 62L40 56M68 62L60 56M30 74L42 66L58 66L70 74M42 66L40 82M58 66L60 82M30 74L40 82M70 74L60 82"
        fill="none"
        stroke="#9dd6c8"
        strokeWidth="2.2"
      />
      <circle cx="50" cy="40" r="22" fill="#8fd0a8" />
      <Eyes y={40} dx={8.5} r={3.3} />
      <path d="M44 49Q50 54 56 49" fill="none" strokeWidth="2.5" />
      <Blush x1={34} x2={66} y={47} />
      <path d="M50 14C53 19 55 22 50 25C45 22 47 19 50 14Z" fill="#6fd0ff" strokeWidth="2" />
    </g>
  ),
};

export const FRIEND_INFO: Record<
  FriendKind,
  { name: string; role: string; element: string; tag: string; line: string }
> = {
  seonbi: {
    name: "솔이",
    role: "푸른 선비",
    element: "목",
    tag: "木 나무",
    line: "평생 사주를 풀어줘요",
  },
  ssi: {
    name: "댕이",
    role: "열기미 소녀",
    element: "화",
    tag: "火 불",
    line: "연애와 궁합을 봐줘요",
  },
  tiger: {
    name: "호동이",
    role: "든든한 호랑이",
    element: "토",
    tag: "土 흙",
    line: "직업과 재물을 짚어요",
  },
  rabbit: {
    name: "달토",
    role: "달빛 토끼",
    element: "금",
    tag: "金 쇠",
    line: "오늘의 운세를 알려요",
  },
  turtle: {
    name: "물이",
    role: "느긋한 거북이",
    element: "수",
    tag: "水 물",
    line: "큰 흐름을 읽어줘요",
  },
};

export function Friend({
  kind,
  size = 64,
  className,
  label,
  style,
}: {
  kind: FriendKind;
  size?: number;
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ART[kind]}
    </svg>
  );
}

const ORDER: FriendKind[] = ["seonbi", "ssi", "tiger", "rabbit", "turtle"];

// 홈 첫 화면: 한옥 담장 너머로 다섯 친구가 내다보는 장면
export function FriendsHero() {
  return (
    <svg
      viewBox="0 0 360 170"
      className="w-full"
      role="img"
      aria-label="한옥 담장 너머로 선비, 아씨, 호랑이, 토끼, 거북이가 내다보는 그림"
    >
      <rect width="360" height="170" fill="#fbe9c2" />
      <circle cx="300" cy="34" r="22" fill="#ffd9a0" stroke={INK} strokeWidth="3" />
      {[
        [14, 2, 0.8],
        [150, 0, 0.9],
      ].map(([x, y, sc]) => (
        <g key={`${x}-${y}`} fill="#fff6e0" stroke={INK} strokeWidth="2.5">
          <ellipse cx={x! + 18 * sc!} cy={y! + 14 * sc!} rx={20 * sc!} ry={11 * sc!} />
          <ellipse cx={x! + 38 * sc!} cy={y! + 10 * sc!} rx={16 * sc!} ry={12 * sc!} />
        </g>
      ))}
      {ORDER.map((k, i) => (
        <g key={k} transform={`translate(${4 + i * 70} 28) scale(0.7)`}>
          <Friend kind={k} size={100} />
        </g>
      ))}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path
          d="M-6 112C30 106 70 104 180 104C290 104 330 106 366 112L366 122L-6 122Z"
          fill="#3a3558"
        />
        <rect x="-6" y="122" width="372" height="60" fill="#d9c3a0" />
        {[40, 120, 200, 280].map((x) => (
          <path key={x} d={`M${x} 122V176`} fill="none" stroke="#b79b72" strokeWidth="2.5" />
        ))}
      </g>
    </svg>
  );
}

// 폼 위로 친구들이 빼꼼 내다보는 줄(머리 윗부분만 보이게 아래를 가린다)
export function PeekRow() {
  return (
    <div
      className="-mb-[3px] flex items-end justify-around overflow-hidden px-2"
      style={{ height: 50 }}
      aria-hidden
    >
      {ORDER.map((k, i) => (
        <Friend
          key={k}
          kind={k}
          size={64}
          className="shrink-0"
          style={{ marginBottom: -16, animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </div>
  );
}
