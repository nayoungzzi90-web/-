// 또또사주 임시 일러스트(SVG). 승인 시안과 닮게 직접 그린 임시 표현이며, 관절 분리 원본 에셋이 생기면 교체한다.
// 아이보리 몸, 비대칭 초록 새싹 두 잎, 진한 눈썹, 주황 볼선. 불꽃 친구는 조연.
const INK = "#28231f";
const ORANGE = "#ff7049";

export function TtottoFace({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden focusable="false">
      <path d="M60 48 Q61 30 57 20" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M57 22 C38 6 16 14 20 32 C38 36 52 34 57 22Z" fill="#8fd14f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 28 C74 12 96 18 92 32 C80 38 66 36 60 28Z" fill="#a7de63" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="60" cy="80" rx="46" ry="34" fill="#fffdf4" stroke={INK} strokeWidth="4" />
      <path d="M38 66 L52 72 M82 66 L68 72" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <circle cx="48" cy="82" r="3.6" fill={INK} />
      <circle cx="72" cy="82" r="3.6" fill={INK} />
      <path d="M28 88 l6 -4 M30 96 l6 -4 M92 88 l-6 -4 M90 96 l-6 -4" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
      <path d="M54 94 Q60 102 66 94" stroke={INK} strokeWidth="3" fill="#ff8a7a" strokeLinecap="round" />
    </svg>
  );
}

/** 몸통과 얼굴만(손·소품은 각 장면에서 따로 얹는다). */
export function TtottoBody({ className = "", label }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <path d="M112 66 Q114 44 108 28" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M108 32 C80 6 44 16 50 46 C78 52 100 48 108 32Z" fill="#8fd14f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M112 40 C130 16 164 24 158 46 C142 54 122 52 112 40Z" fill="#a7de63" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="112" cy="128" rx="84" ry="64" fill="#fffdf4" stroke={INK} strokeWidth="4" />
      <path d="M72 100 L98 110 M152 100 L126 110" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <circle cx="90" cy="122" r="5.5" fill={INK} />
      <circle cx="134" cy="122" r="5.5" fill={INK} />
      <path d="M56 134 l10 -7 M60 146 l10 -7 M168 134 l-10 -7 M164 146 l-10 -7" stroke={ORANGE} strokeWidth="4" strokeLinecap="round" />
      <path d="M102 142 Q112 158 124 142Z" fill="#ff7a6b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Hand({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <circle cx="20" cy="20" r="16" fill="#fffdf4" stroke={INK} strokeWidth="4" />
    </svg>
  );
}

export function Flame({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={className} aria-hidden focusable="false">
      <path d="M62 8 C70 34 108 50 106 88 C104 114 82 124 60 124 C36 124 14 112 14 86 C14 58 40 50 44 28 C52 36 56 24 62 8Z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 84 Q50 78 56 84 M70 84 Q76 78 82 84" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M54 96 Q63 106 74 96" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Book({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 70" className={className} aria-hidden focusable="false">
      <path d="M6 14 L52 22 L52 66 L6 58Z" fill="#ff8a3d" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M104 14 L58 22 L58 66 L104 58Z" fill="#ffb066" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function CookieClosed({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden focusable="false">
      <path d="M8 56 C10 14 100 14 112 56 C96 74 24 74 8 56Z" fill="#f6c453" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 22 C54 40 56 56 62 68" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CookieHalf({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 70 80" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden focusable="false">
      <path d="M6 58 C8 24 34 12 62 20 L50 46 L62 70 C40 76 16 72 6 58Z" fill="#f6c453" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}
