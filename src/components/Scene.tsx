import { CHARACTERS } from '../lib/content/characters';
import { Stem } from '../lib/saju/types';
import { ArtInner } from './art';

/** 엽전(조선 시대 동전) 아이콘: 황동색 원 + 네모 구멍 */
export function Coin({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="엽전">
      <circle cx="20" cy="20" r="18" fill="#C99A4B" stroke="#6B4A1C" strokeWidth="2" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#8A6425" strokeWidth="1.2" />
      <path d="M8 12q6-6 14-5" stroke="#F3DCA0" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
      <rect x="14.5" y="14.5" width="11" height="11" rx="1" fill="#FBF4E4" stroke="#6B4A1C" strokeWidth="2" />
      {size >= 36 && (
        <g fontSize="5" fill="#6B4A1C" fontWeight="700" textAnchor="middle">
          <text x="20" y="11.5">常</text><text x="20" y="32">平</text><text x="9.5" y="21.8">通</text><text x="30.5" y="21.8">寶</text>
        </g>
      )}
    </svg>
  );
}

const Cloud = ({ x, y, s = 1, o = 0.9 }: { x: number; y: number; s?: number; o?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path d="M0 24q-2-14 12-14q4-12 18-8q10-10 22 0q16-4 18 10q10 2 8 12z" fill="#FFFBF0" stroke="#E1CFA6" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 20q4-6 10-4M40 14q6-4 11 1" fill="none" stroke="#E1CFA6" strokeWidth="1.4" strokeLinecap="round" />
  </g>
);

/** 홈 히어로: 한옥 대문 + 친구들 (직접 그린 일러스트) */
export function HeroScene({ stems = ['甲', '乙', '丙', '丁', '己'] as Stem[] }: { stems?: Stem[] }) {
  return (
    <svg viewBox="0 0 375 330" width="100%" role="img" aria-label="한옥 대문 앞에 모인 오행 친구들" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4E7C4" /><stop offset="1" stopColor="#FBF4E4" /></linearGradient>
      </defs>
      <rect width="375" height="330" fill="url(#sky)" />
      <circle cx="262" cy="62" r="44" fill="#F6D98D" opacity=".75" />
      <path d="M0 190q60-50 120-14t110-24q60-26 145 28v90H0z" fill="#C7D6C6" opacity=".8" />
      <path d="M0 210q80-40 150-8t120-12q50-10 105 12v70H0z" fill="#A9C2B5" opacity=".75" />
      <Cloud x={16} y={96} s={0.8} /><Cloud x={150} y={28} s={0.7} /><Cloud x={150} y={150} s={0.6} o={0.8} />
      {/* 소나무 가지 (오른쪽 위로 뻗음) */}
      <g transform="translate(375 -6) scale(-1 1)">
      <path d="M-4 40q50 6 96 36" stroke="#6B4A33" strokeWidth="5" fill="none" strokeLinecap="round" />
      {[[20, 46], [52, 58], [80, 72], [40, 36]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} stroke="#2F7D4E" strokeWidth="2.6" strokeLinecap="round">
          {[-60, -30, 0, 30, 60].map((a) => <path key={a} d="M0 0l0 16" transform={`rotate(${a + 180})`} />)}
        </g>
      ))}
      </g>
      {/* 대문 지붕 */}
      <path d="M170 126Q268 92 372 126L360 148H182z" fill="#34505C" stroke="#22343C" strokeWidth="2" strokeLinejoin="round" />
      <path d="M196 112q72-18 144 0" stroke="#22343C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[200, 224, 248, 272, 296, 320, 344].map((x) => <path key={x} d={`M${x} 124l-6 24`} stroke="#4C6B78" strokeWidth="1.6" />)}
      <rect x="182" y="148" width="178" height="10" fill="#B83A26" />
      {['#2F7068', '#E4A04A', '#203E73', '#E4A04A', '#2F7068', '#E4A04A', '#203E73', '#E4A04A', '#2F7068'].map((c, i) => <rect key={i} x={182 + i * 19.8} y="158" width="19.8" height="9" fill={c} />)}
      <rect x="190" y="167" width="12" height="96" fill="#B83A26" /><rect x="340" y="167" width="12" height="96" fill="#B83A26" />
      <rect x="202" y="167" width="138" height="96" fill="#E9DDBF" />
      {/* 현판 */}
      <rect x="276" y="176" width="42" height="84" rx="4" fill="#FFFBF0" stroke="#6B4A33" strokeWidth="2.4" />
      <text x="297" y="190" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#3B2A22" style={{ writingMode: 'vertical-rl' } as React.CSSProperties}>
        <tspan x="297" dy="0" style={{ writingMode: 'vertical-rl' } as React.CSSProperties}>좋은 운이 들어오는 사주풀이</tspan>
      </text>
      {/* 청사초롱 */}
      <path d="M214 168v10" stroke="#3B2A22" strokeWidth="2" />
      <ellipse cx="214" cy="194" rx="12" ry="16" fill="#E0564A" stroke="#7A2B22" strokeWidth="2" />
      <path d="M205 188q9 6 18 0M205 200q9 6 18 0" stroke="#FFD9A8" strokeWidth="1.6" fill="none" />
      <rect x="208" y="176" width="12" height="4" rx="1" fill="#7A2B22" /><rect x="208" y="208" width="12" height="4" rx="1" fill="#7A2B22" />
      {/* 새 */}
      <g transform="translate(150 118)"><ellipse cx="0" cy="0" rx="12" ry="10" fill="#fff" stroke="#3B2A22" strokeWidth="2" /><path d="M10-2l8 3l-8 3z" fill="#F0A93E" stroke="#3B2A22" strokeWidth="1.4" /><circle cx="4" cy="-3" r="1.8" fill="#3B2A22" /><path d="M-10 2q-6 2-10 8" stroke="#3B2A22" strokeWidth="2" fill="none" strokeLinecap="round" /></g>
      <path d="M140 128q10 14 24 0" stroke="#6B4A33" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* 담장 */}
      <rect x="0" y="262" width="375" height="68" fill="#EADFC3" />
      <rect x="0" y="262" width="375" height="9" fill="#5B4033" />
      {[0, 1, 2].map((r) => Array.from({ length: 13 }, (_, c) => <rect key={`${r}-${c}`} x={c * 30 - (r % 2) * 15} y={276 + r * 18} width="28" height="16" rx="2" fill="none" stroke="#D4C39A" strokeWidth="1.4" />))}
      {/* 친구들 */}
      {stems.map((s, i) => (
        <svg key={s} x={4 + i * 72} y={i % 2 ? 196 : 188} width="86" height="86" viewBox="-8 -8 216 216" role="img" aria-label={CHARACTERS[s].name}>
          <ArtInner stem={s} />
        </svg>
      ))}
    </svg>
  );
}
