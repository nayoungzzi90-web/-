import type { ReactNode } from "react";

// 민속 귀신 친구들(만화풍 SVG). 전부 직접 그린 그림이며 외부 이미지·상표를 쓰지 않는다.
// 전통 설화 속 귀신(달걀귀신·도깨비·처녀귀신·저승사자·구미호)을 무섭지 않고 귀엽게 그렸다.
export type GhostKind = "egg" | "dokkaebi" | "maiden" | "reaper" | "fox";

const INK = "#2b1d2e";
const SW = 3;

function Blush({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <>
      <ellipse cx={x1} cy={y} rx="5" ry="3" fill="#ff9aa8" opacity="0.7" />
      <ellipse cx={x2} cy={y} rx="5" ry="3" fill="#ff9aa8" opacity="0.7" />
    </>
  );
}

const ART: Record<GhostKind, ReactNode> = {
  // 달걀귀신: 매끈한 달걀 몸통
  egg: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="50" cy="93" rx="22" ry="4" fill="#2b1d2e" opacity="0.18" stroke="none" />
      <path
        d="M50 8C72 8 82 34 82 56C82 76 68 88 50 88C32 88 18 76 18 56C18 34 28 8 50 8Z"
        fill="#fffbe9"
      />
      <path d="M32 24C36 16 42 13 47 13" fill="none" stroke="#fff" strokeWidth="4" opacity="0.9" />
      <circle cx="40" cy="52" r="3.4" fill={INK} stroke="none" />
      <circle cx="60" cy="52" r="3.4" fill={INK} stroke="none" />
      <ellipse cx="50" cy="64" rx="3.5" ry="4.5" fill="#7a2e3a" />
      <Blush x1={32} x2={68} y={60} />
    </g>
  ),
  // 도깨비: 뿔 달린 빨간 얼굴과 방망이
  dokkaebi: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="50" cy="94" rx="24" ry="3.5" fill="#2b1d2e" opacity="0.18" stroke="none" />
      <rect
        x="74"
        y="34"
        width="12"
        height="44"
        rx="6"
        fill="#b9814a"
        transform="rotate(14 80 56)"
      />
      <circle cx="78" cy="42" r="2" fill="#f4d35e" stroke="none" />
      <circle cx="82" cy="56" r="2" fill="#f4d35e" stroke="none" />
      <path d="M22 84C22 70 34 66 50 66C66 66 78 70 78 84Z" fill="#3b6fb6" />
      <path d="M31 28L38 8L47 25Z" fill="#f4d35e" />
      <path d="M69 28L62 8L53 25Z" fill="#f4d35e" />
      <circle cx="50" cy="46" r="27" fill="#ec5b43" />
      <path d="M38 24Q50 14 62 24" fill="none" />
      <path d="M33 38Q40 33 45 39" fill="none" strokeWidth="3.5" />
      <path d="M67 38Q60 33 55 39" fill="none" strokeWidth="3.5" />
      <circle cx="40" cy="44" r="5.5" fill="#fff" />
      <circle cx="60" cy="44" r="5.5" fill="#fff" />
      <circle cx="41" cy="45" r="2.6" fill={INK} stroke="none" />
      <circle cx="59" cy="45" r="2.6" fill={INK} stroke="none" />
      <path d="M35 58Q50 74 65 58Q50 62 35 58Z" fill="#fff" />
      <path d="M41 60L43 66L46 61Z" fill="#fff" strokeWidth="2" />
      <Blush x1={30} x2={70} y={54} />
    </g>
  ),
  // 처녀귀신: 긴 머리와 소복, 발이 없이 둥실
  maiden: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M24 86C20 66 28 54 50 54C72 54 80 66 76 86C70 82 66 90 60 86C54 91 46 91 40 86C34 90 30 82 24 86Z"
        fill="#f3f7ff"
      />
      <path d="M40 58L50 70L60 58" fill="none" strokeWidth="2.5" />
      <path
        d="M24 52C22 24 34 10 50 10C66 10 78 24 76 52C76 62 80 74 84 82C74 80 72 68 70 58L30 58C28 68 26 80 16 82C20 74 24 62 24 52Z"
        fill="#2a2035"
      />
      <ellipse cx="50" cy="40" rx="19" ry="21" fill="#f6efe3" />
      <path d="M32 30C40 36 60 36 68 30C66 20 58 16 50 16C42 16 34 20 32 30Z" fill="#2a2035" />
      <circle cx="42" cy="44" r="3.2" fill={INK} stroke="none" />
      <circle cx="58" cy="44" r="3.2" fill={INK} stroke="none" />
      <path d="M45 54Q50 58 55 54" fill="none" strokeWidth="2.5" />
      <Blush x1={36} x2={64} y={50} />
    </g>
  ),
  // 저승사자: 검은 갓과 도포
  reaper: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 90C20 70 32 62 50 62C68 62 80 70 80 90Z" fill="#3a3347" />
      <path d="M44 62L50 76L56 62" fill="#f4f0e6" strokeWidth="2.5" />
      <ellipse cx="50" cy="46" rx="20" ry="21" fill="#efe9dc" />
      <path d="M30 38C30 22 38 10 50 10C62 10 70 22 70 38Z" fill="#241f2e" />
      <ellipse cx="50" cy="36" rx="38" ry="8" fill="#241f2e" />
      <path d="M36 36Q50 42 64 36" fill="none" stroke="#6b5f7c" strokeWidth="2" />
      <path d="M36 46H46" strokeWidth="3.5" />
      <path d="M54 46H64" strokeWidth="3.5" />
      <path d="M44 58Q50 54 56 58" fill="none" strokeWidth="2.5" />
      <circle cx="31" cy="54" r="0" />
    </g>
  ),
  // 구미호: 꼬리가 여럿인 여우
  fox: (
    <g stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <path d="M72 70C92 66 96 40 84 28C84 44 74 52 66 58Z" fill="#f7a14a" />
      <path d="M84 28C88 32 90 36 91 40C86 38 84 34 84 28Z" fill="#fff" strokeWidth="2.5" />
      <path d="M70 74C94 76 100 56 94 44C90 58 80 64 66 66Z" fill="#f7a14a" />
      <path d="M28 70C8 66 4 40 16 28C16 44 26 52 34 58Z" fill="#f7a14a" />
      <path d="M16 28C12 32 10 36 9 40C14 38 16 34 16 28Z" fill="#fff" strokeWidth="2.5" />
      <path d="M30 74C6 76 0 56 6 44C10 58 20 64 34 66Z" fill="#f7a14a" />
      <path d="M26 88C26 72 36 64 50 64C64 64 74 72 74 88Z" fill="#fff6e8" />
      <path d="M22 40L24 12L42 28Z" fill="#f7a14a" />
      <path d="M78 40L76 12L58 28Z" fill="#f7a14a" />
      <path d="M26 30L28 20L35 27Z" fill="#ffb8c4" strokeWidth="2" />
      <path d="M74 30L72 20L65 27Z" fill="#ffb8c4" strokeWidth="2" />
      <path
        d="M20 50C20 34 34 26 50 26C66 26 80 34 80 50C80 64 66 72 50 72C34 72 20 64 20 50Z"
        fill="#f7a14a"
      />
      <path
        d="M22 54C30 52 38 62 50 62C62 62 70 52 78 54C76 66 64 72 50 72C36 72 24 66 22 54Z"
        fill="#fff6e8"
        stroke="none"
      />
      <path d="M33 46Q38 41 43 46" fill="none" strokeWidth="3.2" />
      <path d="M57 46Q62 41 67 46" fill="none" strokeWidth="3.2" />
      <ellipse cx="50" cy="55" rx="3.2" ry="2.4" fill={INK} stroke="none" />
      <path d="M45 60Q50 64 55 60" fill="none" strokeWidth="2.5" />
      <Blush x1={30} x2={70} y={54} />
      <circle cx="50" cy="22" r="3" fill="#6fd0ff" stroke={INK} strokeWidth="2" />
    </g>
  ),
};

export const GHOST_NAMES: Record<GhostKind, string> = {
  egg: "달걀귀신",
  dokkaebi: "도깨비",
  maiden: "처녀귀신",
  reaper: "저승사자",
  fox: "구미호",
};

export function Ghost({
  kind,
  size = 64,
  className,
  label,
}: {
  kind: GhostKind;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ART[kind]}
    </svg>
  );
}

// 홈 첫 화면: 달밤의 기와집 마당에 귀신 친구들이 모여 있는 만화 장면
export function HauntedHero() {
  return (
    <svg
      viewBox="0 0 360 250"
      className="w-full"
      role="img"
      aria-label="달밤의 기와집 마당에 도깨비, 달걀귀신, 구미호, 처녀귀신, 저승사자가 모여 있는 그림"
    >
      <defs>
        <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1b4b" />
          <stop offset="1" stopColor="#4b2f6b" />
        </linearGradient>
        <radialGradient id="moonGlow">
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="250" fill="url(#night)" />
      <circle cx="280" cy="52" r="52" fill="url(#moonGlow)" />
      <circle cx="280" cy="52" r="26" fill="#fff3b0" stroke={INK} strokeWidth="3" />
      <circle cx="271" cy="46" r="4" fill="#f0d98a" />
      <circle cx="289" cy="60" r="3" fill="#f0d98a" />
      {[
        [30, 30],
        [70, 62],
        [120, 24],
        [170, 50],
        [214, 22],
        [330, 98],
        [18, 96],
      ].map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y! - 5}L${x! + 1.6} ${y! - 1.6}L${x! + 5} ${y}L${x! + 1.6} ${y! + 1.6}L${x} ${y! + 5}L${x! - 1.6} ${y! + 1.6}L${x! - 5} ${y}L${x! - 1.6} ${y! - 1.6}Z`}
          fill="#fff3b0"
        />
      ))}
      {/* 기와집 지붕 */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M-6 150C40 146 70 132 96 112C122 132 152 146 198 150Z" fill="#3a3558" />
        <path d="M-14 152C40 150 78 138 96 114" fill="none" />
        <rect x="12" y="150" width="170" height="40" fill="#7a5a3c" />
        <rect x="30" y="156" width="28" height="30" fill="#f6e6b4" />
        <rect x="74" y="156" width="28" height="30" fill="#f6e6b4" />
        <rect x="118" y="156" width="28" height="30" fill="#f6e6b4" />
        <path d="M30 171H58M44 156V186" stroke="#7a5a3c" strokeWidth="2" />
        <path d="M74 171H102M88 156V186" stroke="#7a5a3c" strokeWidth="2" />
        <path d="M118 171H146M132 156V186" stroke="#7a5a3c" strokeWidth="2" />
      </g>
      {/* 청사초롱 */}
      {[
        [236, 78],
        [336, 86],
      ].map(([x, y]) => (
        <g key={x} stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d={`M${x} ${y! - 22}V${y! - 10}`} fill="none" />
          <rect x={x! - 11} y={y! - 10} width="22" height="30" rx="8" fill="#ef5b3f" />
          <path
            d={`M${x! - 11} ${y! + 4}H${x! + 11}M${x! - 11} ${y! + 12}H${x! + 11}`}
            fill="none"
            stroke="#f4d35e"
          />
          <circle cx={x} cy={y! + 5} r="22" fill="#ffd47a" opacity="0.22" stroke="none" />
        </g>
      ))}
      {/* 마당 */}
      <rect y="196" width="360" height="54" fill="#2f2a4d" />
      <path d="M0 196H360" stroke={INK} strokeWidth="3" />
      {/* 귀신들 */}
      <g transform="translate(192 112) scale(0.9)">
        <Ghost kind="reaper" size={100} className="ghost-bob" />
      </g>
      <g transform="translate(8 132) scale(0.9)">
        <Ghost kind="maiden" size={100} className="ghost-bob" />
      </g>
      <g transform="translate(84 148) scale(0.82)">
        <Ghost kind="egg" size={100} className="ghost-bob" />
      </g>
      <g transform="translate(252 128) scale(0.92)">
        <Ghost kind="fox" size={100} className="ghost-bob" />
      </g>
      <g transform="translate(130 128) scale(1.0)">
        <Ghost kind="dokkaebi" size={100} className="ghost-bob" />
      </g>
    </svg>
  );
}
