// 엽전(옛 동전) 그림: 놋쇠 원판에 네모 구멍. 직접 그린 SVG.
export function Coin({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <circle cx="20" cy="20" r="17" fill="#e2b04a" stroke="#2b1d2e" strokeWidth="2.6" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="#b9822c" strokeWidth="1.6" />
      <rect
        x="14"
        y="14"
        width="12"
        height="12"
        rx="1.5"
        fill="#fff6e0"
        stroke="#2b1d2e"
        strokeWidth="2.2"
      />
      <path
        d="M20 6.5v4.2M20 29.3v4.2M6.5 20h4.2M29.3 20h4.2"
        stroke="#8c5f1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
