import { Stem } from '../lib/saju/types';

/**
 * 오행 친구들 10종 — 코드로 직접 그린 독자 일러스트(임시 에셋이 아니라 기본 에셋).
 * 모든 색을 속성으로 직접 지정해서 SVG→PNG 공유 카드 저장 때도 똑같이 보인다(CSS 변수 미사용).
 * 같은 "아기 체형"(큰 머리·작은 몸·큰 눈·볼터치)을 공유하고, 머리 위 소품과 색으로 구분한다.
 */
const L = '#3B2A22'; // 먹색 외곽선
const W = 2.6;
const o = { stroke: L, strokeWidth: W, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const SKIN = '#FFE4CC';
const BLUSH = '#FF9C8F';


/** 작은 몸: 몸통 + 양손 + 발 */
function Body({ color, belly }: { color: string; belly?: string }) {
  return (
    <g>
      <ellipse cx="84" cy="190" rx="13" ry="9" fill={color} {...o} />
      <ellipse cx="116" cy="190" rx="13" ry="9" fill={color} {...o} />
      <ellipse cx="100" cy="168" rx="37" ry="28" fill={color} {...o} />
      {belly && <ellipse cx="100" cy="172" rx="20" ry="16" fill={belly} stroke="none" />}
      <circle cx="66" cy="166" r="11" fill={color} {...o} />
      <circle cx="134" cy="166" r="11" fill={color} {...o} />
    </g>
  );
}

function Face({ cat = false, eyeY = 100 }: { cat?: boolean; eyeY?: number }) {
  return (
    <g>
      {[78, 122].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={eyeY} rx="8" ry="10" fill={L} />
          <circle cx={x + 2.5} cy={eyeY - 3.5} r="3.2" fill="#fff" />
          <circle cx={x - 2.5} cy={eyeY + 3.5} r="1.5" fill="#fff" />
        </g>
      ))}
      <ellipse cx="60" cy={eyeY + 18} rx="10" ry="6.5" fill={BLUSH} opacity=".75" />
      <ellipse cx="140" cy={eyeY + 18} rx="10" ry="6.5" fill={BLUSH} opacity=".75" />
      {cat ? (
        <path d={`M92 ${eyeY + 16}q4 6 8 0q4 6 8 0`} fill="none" stroke={L} strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <path d={`M93 ${eyeY + 15}q7 8 14 0`} fill="none" stroke={L} strokeWidth="2.8" strokeLinecap="round" />
      )}
    </g>
  );
}
const Head = ({ color, rx = 68, ry = 60, cy = 100 }: { color: string; rx?: number; ry?: number; cy?: number }) => (
  <ellipse cx="100" cy={cy} rx={rx} ry={ry} fill={color} {...o} />
);
const Sparkle = ({ x, y, s = 1, c = '#FFD25E' }: { x: number; y: number; s?: number; c?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-9L2.6-2.6L9 0L2.6 2.6L0 9L-2.6 2.6L-9 0L-2.6-2.6Z" fill={c} stroke={L} strokeWidth="1.8" strokeLinejoin="round" />
);

/* ── 오행 다섯 친구: 솔이(木) 댕이(火) 호동이(土) 달토(金) 거북이(水). 일간 10종 = 친구 5 × 양/음 2가지 모습 ── */
const HAT = '#3B2E2A';
const Scroll = ({ x, y, rot = -18 }: { x: number; y: number; rot?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x="-26" y="-9" width="52" height="18" rx="4" fill="#FFFBF0" {...o} strokeWidth="2.2" />
    <rect x="-30" y="-12" width="9" height="24" rx="4" fill="#E4A04A" {...o} strokeWidth="2.2" />
    <rect x="21" y="-12" width="9" height="24" rx="4" fill="#E4A04A" {...o} strokeWidth="2.2" />
    <path d="M-14-2h24M-14 4h16" stroke="#B83A26" strokeWidth="2" strokeLinecap="round" />
  </g>
);
const Fan = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 14L-22-22Q0-36 22-22z" fill="#FFF2C4" {...o} strokeWidth="2.2" />
    <path d="M0 14L-11-27M0 14L0-30M0 14L11-27" stroke="#B83A26" strokeWidth="1.8" />
    <circle cx="0" cy="14" r="4" fill="#8A5A2B" stroke={L} strokeWidth="1.6" />
  </g>
);
const Lantern = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0-24v-10" stroke={L} strokeWidth="3" />
    <rect x="-9" y="-26" width="18" height="5" rx="2" fill="#8A3F3B" {...o} strokeWidth="2.2" />
    <ellipse cx="0" cy="-8" rx="14" ry="17" fill="#FFB347" {...o} />
    <ellipse cx="0" cy="-8" rx="7" ry="11" fill="#FFE9A8" />
    <rect x="-9" y="8" width="18" height="5" rx="2" fill="#8A3F3B" {...o} strokeWidth="2.2" />
  </g>
);
const Gat = ({ crown = HAT, band = '#B83A26' }: { crown?: string; band?: string }) => (
  <g>
    <ellipse cx="100" cy="52" rx="56" ry="12" fill={crown} {...o} />
    <path d="M72 50q0-34 28-34t28 34z" fill={crown} {...o} />
    <path d="M72 44h56" stroke={band} strokeWidth="5" strokeLinecap="round" />
  </g>
);

// 솔이 (木): 갓 쓴 푸른 선비
const Soli = ({ yin }: { yin: boolean }) => (
  <g>
    <Body color={yin ? '#8FD39A' : '#2F8F7B'} belly="#FFF4DC" />
    <path d="M88 150l12 14l12-14" fill="#fff" {...o} strokeWidth="2.4" />
    <path d="M100 164l-6 14M100 164l6 14" stroke="#B83A26" strokeWidth="3.4" strokeLinecap="round" />
    <Head color={SKIN} />
    <Face />
    {yin ? (
      <g>
        <path d="M44 74Q58 28 100 26Q142 28 156 74Q132 50 100 54Q68 50 44 74z" fill={HAT} {...o} />
        <path d="M100 26q-4-18 14-26q6 18-14 26z" fill="#6CC07A" {...o} />
        <path d="M100 26q-16-2-22-16q18-2 22 16z" fill="#4FA766" {...o} />
        <g transform="translate(160 150) rotate(30)"><rect x="-3" y="-30" width="6" height="52" rx="3" fill="#8A5A2B" {...o} strokeWidth="2.2" /><path d="M-3-30l3-12l3 12z" fill="#3B2E2A" {...o} strokeWidth="1.8" /></g>
      </g>
    ) : (
      <g>
        <Gat />
        <path d="M100 18V4M100 14q-14-2-18-12M100 14q14-2 18-12" stroke="#2F7D4E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <Scroll x={156} y={162} />
      </g>
    )}
  </g>
);

// 댕이 (火): 댕기 머리 소녀
const Daengi = ({ yin }: { yin: boolean }) => (
  <g>
    {!yin && (<g><circle cx="52" cy="46" r="20" fill={HAT} {...o} /><circle cx="148" cy="46" r="20" fill={HAT} {...o} /><circle cx="52" cy="46" r="7" fill="#E0564A" /><circle cx="148" cy="46" r="7" fill="#E0564A" /></g>)}
    {yin && (<g><circle cx="30" cy="120" r="17" fill={HAT} {...o} /><circle cx="170" cy="120" r="17" fill={HAT} {...o} /><rect x="22" y="130" width="16" height="9" rx="3" fill="#E0564A" {...o} strokeWidth="2.4" /><rect x="162" y="130" width="16" height="9" rx="3" fill="#E0564A" {...o} strokeWidth="2.4" /></g>)}
    <Body color={yin ? '#F59AB0' : '#D94B3A'} belly="#FFF4DC" />
    <path d="M88 150l12 14l12-14" fill="#fff" {...o} strokeWidth="2.4" />
    <ellipse cx="100" cy="98" rx="72" ry="64" fill={HAT} {...o} />
    <ellipse cx="100" cy="106" rx="62" ry="54" fill={SKIN} {...o} />
    <path d="M40 92Q56 38 100 40Q144 38 160 92Q138 64 100 70Q62 64 40 92z" fill={HAT} {...o} />
    <Face eyeY={108} />
    {yin ? <Lantern x={162} y={152} /> : (<g><path d="M92 50q8-10 16 0" stroke="#E0564A" strokeWidth="5" fill="none" strokeLinecap="round" /><Sparkle x={168} y={74} s={0.8} /></g>)}
  </g>
);

// 호동이 (土): 호랑이
const Hodongi = ({ yin }: { yin: boolean }) => {
  const fur = yin ? '#F7C65E' : '#F4A640';
  return (
    <g>
      <circle cx="46" cy="52" r="22" fill={fur} {...o} /><circle cx="154" cy="52" r="22" fill={fur} {...o} />
      <circle cx="46" cy="53" r="10" fill="#FFC9B0" /><circle cx="154" cy="53" r="10" fill="#FFC9B0" />
      <Body color={fur} belly="#FFF1D6" />
      <Head color={fur} />
      <path d="M100 42v20M80 46l6 17M120 46l-6 17M34 98l20 4M34 120l20-4M166 98l-20 4M166 120l-20-4" stroke={L} strokeWidth="4.2" strokeLinecap="round" />
      <ellipse cx="100" cy="124" rx="34" ry="24" fill="#FFF1D6" {...o} strokeWidth="2.6" />
      <Face />
      <path d="M92 118h16l-8 9z" fill="#E0564A" {...o} strokeWidth="2.2" />
      {yin ? (
        <g transform="translate(160 156)"><path d="M0-22v-8" stroke={L} strokeWidth="2.6" /><path d="M-14-18q14-8 28 0q6 22-14 30q-20-8-14-30z" fill="#E0564A" {...o} strokeWidth="2.4" /><path d="M-8-8h16" stroke="#FFD25E" strokeWidth="2.4" strokeLinecap="round" /></g>
      ) : (<Fan x={158} y={156} />)}
    </g>
  );
};

// 달토 (金): 토끼
const Dalto = ({ yin }: { yin: boolean }) => (
  <g>
    <ellipse cx="66" cy="42" rx="19" ry="46" fill="#FFF8F0" {...o} /><ellipse cx="134" cy="42" rx="19" ry="46" fill="#FFF8F0" {...o} />
    <ellipse cx="66" cy="46" rx="8" ry="30" fill="#FFB5C2" /><ellipse cx="134" cy="46" rx="8" ry="30" fill="#FFB5C2" />
    <Body color={yin ? '#B7A4EA' : '#5B8FD6'} belly="#FFF8F0" />
    <path d="M88 150l12 14l12-14" fill="#fff" {...o} strokeWidth="2.4" />
    <Head color="#FFF8F0" />
    <Face />
    <path d="M95 117h10l-5 6z" fill="#FF7F9A" {...o} strokeWidth="2" />
    {yin ? (
      <g><path d="M70 44L128 30" stroke="#D9B14A" strokeWidth="5" strokeLinecap="round" /><circle cx="128" cy="30" r="10" fill="#5FD3C2" {...o} /><circle cx="125" cy="27" r="3" fill="#fff" /><circle cx="158" cy="158" r="13" fill="#5FD3C2" {...o} /><circle cx="154" cy="154" r="3.6" fill="#fff" /></g>
    ) : (<Scroll x={156} y={162} rot={-12} />)}
  </g>
);

// 거북이 (水): 아기 거북
const Geobugi = ({ yin }: { yin: boolean }) => (
  <g>
    <ellipse cx="84" cy="192" rx="14" ry="8" fill="#9ED8C6" {...o} /><ellipse cx="116" cy="192" rx="14" ry="8" fill="#9ED8C6" {...o} />
    <path d="M22 158q0-58 78-58t78 58q0 26-78 26t-78-26z" fill={yin ? '#7FC1D8' : '#3E9C8A'} {...o} />
    <path d="M60 128l16 12l-6 18M140 128l-16 12l6 18M100 112v26" stroke={L} strokeWidth="2.6" fill="none" opacity=".4" strokeLinecap="round" />
    <path d="M62 156q38 30 76 0l-8 24q-30 10-60 0z" fill={yin ? '#B8D4F2' : '#3A66B5'} {...o} />
    <Head color="#9ED8C6" rx={56} ry={50} cy={100} />
    <Face />
    {yin ? (
      <g><path d="M100 36q14 18 0 28q-14-10 0-28z" fill="#7ED0F0" {...o} /><circle cx="96" cy="52" r="3" fill="#fff" /></g>
    ) : (
      <g><path d="M100 50V30M100 44q-14-2-18-14M100 44q14-2 18-14" stroke="#4E9A3A" strokeWidth="4.5" fill="none" strokeLinecap="round" /></g>
    )}
  </g>
);

const ART: Record<Stem, () => JSX.Element> = {
  甲: () => <Soli yin={false} />, 乙: () => <Soli yin />,
  丙: () => <Daengi yin={false} />, 丁: () => <Daengi yin />,
  戊: () => <Hodongi yin={false} />, 己: () => <Hodongi yin />,
  庚: () => <Dalto yin={false} />, 辛: () => <Dalto yin />,
  壬: () => <Geobugi yin={false} />, 癸: () => <Geobugi yin />,
};

/** 내부 요소만 (공유 카드 같은 다른 SVG 안에 중첩해서 쓸 때) */
export const ArtInner = ({ stem }: { stem: Stem }) => ART[stem]();

export function ArtSvg({ stem, size = 200, className, label }: { stem: Stem; size?: number; className?: string; label?: string }) {
  return (
    <svg className={className} viewBox="-8 -8 216 216" width={size} height={size} role="img" aria-label={label ?? `${stem} 캐릭터`}>
      <ArtInner stem={stem} />
    </svg>
  );
}
