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

const ART: Record<Stem, () => JSX.Element> = {
  // 甲 곧은 소나무 도령: 검은 갓 + 소나무 새싹
  甲: () => (
    <g>
      <Body color="#58B5A6" belly="#FFF4DC" />
      <path d="M88 150l12 14l12-14" fill="#fff" {...o} strokeWidth="2.4" />
      <Head color={SKIN} />
      <Face />
      <ellipse cx="100" cy="52" rx="56" ry="12" fill="#4B3A33" {...o} />
      <path d="M72 50q0-34 28-34t28 34z" fill="#4B3A33" {...o} />
      <path d="M72 44h56" stroke="#8A3F3B" strokeWidth="5" strokeLinecap="round" />
      <path d="M100 18V4M100 14q-14-2-18-12M100 14q14-2 18-12" stroke="#2F7D4E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  // 乙 살랑살랑 덩굴 아씨: 땋은 머리 + 잎사귀 댕기
  乙: () => (
    <g>
      <Body color="#F59AB0" belly="#FFF4DC" />
      <circle cx="30" cy="118" r="17" fill="#4B3A33" {...o} />
      <circle cx="170" cy="118" r="17" fill="#4B3A33" {...o} />
      <rect x="22" y="128" width="16" height="9" rx="3" fill="#E0564A" {...o} strokeWidth="2.4" />
      <rect x="162" y="128" width="16" height="9" rx="3" fill="#E0564A" {...o} strokeWidth="2.4" />
      <ellipse cx="100" cy="98" rx="72" ry="64" fill="#4B3A33" {...o} />
      <ellipse cx="100" cy="106" rx="62" ry="54" fill={SKIN} {...o} />
      <path d="M40 92Q56 38 100 40Q144 38 160 92Q138 64 100 70Q62 64 40 92z" fill="#4B3A33" {...o} />
      <Face eyeY={108} />
      <path d="M100 38q-6-22 14-30q6 20-14 30z" fill="#6CC07A" {...o} />
      <path d="M100 38q-16-4-22-18q18-2 22 18z" fill="#4FA766" {...o} />
    </g>
  ),
  // 丙 활짝 해님 호랑이
  丙: () => (
    <g>
      <circle cx="46" cy="52" r="22" fill="#F4A640" {...o} />
      <circle cx="154" cy="52" r="22" fill="#F4A640" {...o} />
      <circle cx="46" cy="53" r="10" fill="#FFC9B0" />
      <circle cx="154" cy="53" r="10" fill="#FFC9B0" />
      <Body color="#F4A640" belly="#FFE08A" />
      <Head color="#F4A640" />
      <path d="M100 42v20M80 46l6 17M120 46l-6 17M34 98l20 4M34 120l20-4M166 98l-20 4M166 120l-20-4" stroke={L} strokeWidth="4.4" strokeLinecap="round" />
      <ellipse cx="100" cy="124" rx="34" ry="24" fill="#FFF1D6" {...o} strokeWidth="2.6" />
      <Face />
      <path d="M92 118h16l-8 9z" fill="#E0564A" {...o} strokeWidth="2.2" />
      <g transform="translate(100 22)"><circle r="12" fill="#FFD25E" {...o} strokeWidth="2.6" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M0-17v-6" transform={`rotate(${a})`} stroke={L} strokeWidth="3" strokeLinecap="round" />)}</g>
    </g>
  ),
  // 丁 오롯한 등불 토끼
  丁: () => (
    <g>
      <ellipse cx="66" cy="42" rx="19" ry="46" fill="#FFF4EA" {...o} />
      <ellipse cx="134" cy="42" rx="19" ry="46" fill="#FFF4EA" {...o} />
      <ellipse cx="66" cy="46" rx="8" ry="30" fill="#FFB5C2" />
      <ellipse cx="134" cy="46" rx="8" ry="30" fill="#FFB5C2" />
      <Body color="#F0764B" belly="#FFD7A0" />
      <Head color="#FFF4EA" />
      <Face />
      <path d="M95 117h10l-5 6z" fill="#FF7F9A" {...o} strokeWidth="2" />
      <g transform="translate(160 150)">
        <path d="M0-24v-10" stroke={L} strokeWidth="3" />
        <rect x="-9" y="-26" width="18" height="5" rx="2" fill="#8A3F3B" {...o} strokeWidth="2.2" />
        <ellipse cx="0" cy="-8" rx="14" ry="17" fill="#FFB347" {...o} />
        <ellipse cx="0" cy="-8" rx="7" ry="11" fill="#FFE9A8" />
        <rect x="-9" y="8" width="18" height="5" rx="2" fill="#8A3F3B" {...o} strokeWidth="2.2" />
      </g>
    </g>
  ),
  // 戊 듬직한 큰바위 곰: 머리 위 작은 바위
  戊: () => (
    <g>
      <circle cx="44" cy="54" r="21" fill="#B98B5E" {...o} />
      <circle cx="156" cy="54" r="21" fill="#B98B5E" {...o} />
      <circle cx="44" cy="55" r="9" fill="#E8C7A0" />
      <circle cx="156" cy="55" r="9" fill="#E8C7A0" />
      <Body color="#B98B5E" belly="#F1D9B8" />
      <Head color="#B98B5E" />
      <ellipse cx="100" cy="122" rx="30" ry="22" fill="#F1D9B8" {...o} strokeWidth="2.6" />
      <Face />
      <ellipse cx="100" cy="115" rx="9" ry="6.5" fill={L} />
      <path d="M100 121v5" stroke={L} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M82 46q4-20 20-18q16-2 18 18z" fill="#A9B0B8" {...o} />
      <path d="M92 38q4-6 10-6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  // 己 포근한 논밭 거북이: 등딱지 + 벼 새싹
  己: () => (
    <g>
      <ellipse cx="84" cy="192" rx="14" ry="8" fill="#B7DFA0" {...o} />
      <ellipse cx="116" cy="192" rx="14" ry="8" fill="#B7DFA0" {...o} />
      <path d="M22 158q0-58 78-58t78 58q0 26-78 26t-78-26z" fill="#7DB86A" {...o} />
      <path d="M60 128l16 12l-6 18M140 128l-16 12l6 18M100 112v26" stroke={L} strokeWidth="2.6" fill="none" opacity=".45" strokeLinecap="round" />
      <Head color="#B7DFA0" rx={56} ry={50} cy={100} />
      <Face />
      <path d="M100 50V30M100 44q-14-2-18-14M100 44q14-2 18-14" stroke="#4E9A3A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  // 庚 단단한 쇠칼 선비: 은빛 갓 + 반짝이
  庚: () => (
    <g>
      <Body color="#7C8CA3" belly="#E6ECF4" />
      <path d="M88 150l12 14l12-14" fill="#fff" {...o} strokeWidth="2.4" />
      <Head color={SKIN} />
      <Face />
      <ellipse cx="100" cy="54" rx="58" ry="12" fill="#C9D2DC" {...o} />
      <path d="M70 52q0-36 30-36t30 36z" fill="#B7C2CF" {...o} />
      <path d="M70 46h60" stroke="#33495D" strokeWidth="5" strokeLinecap="round" />
      <path d="M86 28q6-6 14-6" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <Sparkle x={168} y={60} /><Sparkle x={30} y={78} s={0.7} />
    </g>
  ),
  // 辛 반짝반짝 옥구슬 아씨: 비녀 + 옥구슬
  辛: () => (
    <g>
      <Body color="#B7A4EA" belly="#F3EEFF" />
      <ellipse cx="100" cy="98" rx="72" ry="64" fill="#5B4B6E" {...o} />
      <ellipse cx="100" cy="106" rx="62" ry="54" fill={SKIN} {...o} />
      <path d="M40 94Q54 40 100 42Q146 40 160 94Q138 68 100 72Q62 68 40 94z" fill="#5B4B6E" {...o} />
      <Face eyeY={108} />
      <path d="M66 30L134 46" stroke="#D9B14A" strokeWidth="5" strokeLinecap="round" />
      <circle cx="134" cy="46" r="11" fill="#5FD3C2" {...o} />
      <circle cx="131" cy="43" r="3.4" fill="#fff" />
      <Sparkle x={36} y={52} s={0.8} c="#FFFFFF" /><Sparkle x={168} y={90} s={0.7} c="#FFFFFF" />
    </g>
  ),
  // 壬 넓은 강물 용: 작은 뿔 + 수염 + 여의주
  壬: () => (
    <g>
      <path d="M72 54l-12-34l30 22z" fill="#FFF0C9" {...o} />
      <path d="M128 54l12-34l-30 22z" fill="#FFF0C9" {...o} />
      <Body color="#7DB9EC" belly="#E3F2FF" />
      <path d="M78 172q8-8 16 0t16 0t16 0" stroke={L} strokeWidth="2.6" fill="none" opacity=".4" strokeLinecap="round" />
      <Head color="#7DB9EC" />
      <ellipse cx="100" cy="124" rx="32" ry="22" fill="#E3F2FF" {...o} strokeWidth="2.6" />
      <Face />
      <circle cx="94" cy="116" r="2.6" fill={L} /><circle cx="106" cy="116" r="2.6" fill={L} />
      <path d="M62 126q-26-4-34 12M138 126q26-4 34 12" stroke={L} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="154" cy="152" r="13" fill="#FFFFFF" {...o} />
      <circle cx="150" cy="148" r="3.6" fill="#BFE3FF" />
    </g>
  ),
  // 癸 촉촉한 이슬 고양이: 이슬 방울
  癸: () => (
    <g>
      <path d="M36 82L40 28L84 56z" fill="#9FB8D6" {...o} />
      <path d="M164 82L160 28L116 56z" fill="#9FB8D6" {...o} />
      <path d="M46 70L48 42L70 58z" fill="#FFC1D0" />
      <path d="M154 70L152 42L130 58z" fill="#FFC1D0" />
      <Body color="#9FB8D6" belly="#F2F7FC" />
      <Head color="#9FB8D6" />
      <path d="M100 44v14M84 48l4 12M116 48l-4 12" stroke="#7C98BC" strokeWidth="4.4" strokeLinecap="round" />
      <ellipse cx="100" cy="124" rx="28" ry="20" fill="#F2F7FC" {...o} strokeWidth="2.6" />
      <Face cat />
      <path d="M96 116h8l-4 5z" fill="#FF8FA3" />
      <path d="M52 114l-26-4M52 124l-26 4M148 114l26-4M148 124l26 4" stroke={L} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M100 8q16 20 0 30q-16-10 0-30z" fill="#7ED0F0" {...o} />
      <circle cx="96" cy="26" r="3" fill="#fff" />
    </g>
  ),
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
