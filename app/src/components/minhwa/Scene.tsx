// 한옥 마당 배경(추정 복원). 시안의 구성 — 해, 먼 산, 소나무, 한옥 지붕·기둥, 등불, 족자, 돌담, 구름 — 을 단순한 도형으로 다시 그렸다.
// 시안 이미지를 그대로 쓸 수 없어(글자가 박혀 있고 해상도가 낮음) 구조와 색만 따른 근사치다.
export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke="#e3b866"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.85"
    >
      <path
        d="M0 24c-12 0-14-16-2-18 2-12 20-14 24-2 10-6 22 2 18 12 8 2 8 10-2 10Z"
        fill="#fbe8bd"
      />
      <path d="M14 18c4-5 10-4 12 0" />
    </g>
  );
}

export function Scene({
  height = 400,
  withRoof = true,
}: {
  height?: number;
  withRoof?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 552 400"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 h-full w-full"
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id="mh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9efd9" />
          <stop offset="1" stopColor="#f4e6c8" />
        </linearGradient>
        <radialGradient id="mh-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#f6c85f" />
          <stop offset="1" stopColor="#f6c85f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="552" height="400" fill="url(#mh-sky)" />
      <Cloud x={8} y={20} s={1.3} />
      {/* 해와 해무리 */}
      <circle cx="326" cy="150" r="72" fill="url(#mh-sun)" opacity="0.55" />
      <circle cx="326" cy="150" r="40" fill="#f7cf6a" />
      {/* 먼 산 */}
      <path
        d="M0 260L60 190L120 236L170 170L250 250L300 214L380 262L460 224L552 270V300H0Z"
        fill="#a9bdc3"
        opacity="0.85"
      />
      <path
        d="M0 280L90 236L160 270L260 226L340 272L430 240L552 284V310H0Z"
        fill="#8aa5ae"
        opacity="0.8"
      />
      {/* 소나무(왼쪽) */}
      <g>
        <path
          d="M30 330c4-40 10-70 8-110"
          stroke="#6b4a2e"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="42" cy="206" rx="46" ry="16" fill="#3f6f5d" />
        <ellipse cx="20" cy="236" rx="38" ry="13" fill="#4a7c68" />
        <ellipse cx="64" cy="254" rx="34" ry="12" fill="#3f6f5d" />
      </g>
      {/* 한옥 지붕과 기둥(오른쪽) */}
      {withRoof && (
        <g>
          <rect x="396" y="86" width="156" height="240" fill="#a8703d" />
          <rect x="402" y="94" width="12" height="232" fill="#8c5a2e" />
          <rect x="520" y="94" width="12" height="232" fill="#8c5a2e" />
          <g stroke="#7a4f27" strokeWidth="2" opacity="0.7">
            <path d="M440 120V326M470 120V326M500 120V326M414 190H520M414 260H520" />
          </g>
          <path
            d="M338 70C380 66 430 40 470 8L552 0V84C500 76 420 90 338 106Z"
            fill="#2f4a78"
          />
          <path
            d="M350 88C400 82 460 64 552 56"
            stroke="#7d9bc8"
            strokeWidth="3"
            fill="none"
          />
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M${372 + i * 20} ${86 - i * 3}V${104 - i * 3}`}
              stroke="#1f3558"
              strokeWidth="3"
              opacity="0.7"
            />
          ))}
          <path
            d="M338 106C420 90 500 76 552 84V98C500 90 420 104 340 120Z"
            fill="#7a4f27"
          />
          {/* 등불 */}
          <g>
            <path d="M510 126V150" stroke="#2b2320" strokeWidth="2" />
            <rect
              x="498"
              y="150"
              width="24"
              height="46"
              rx="10"
              fill="#f0a63a"
              stroke="#2b2320"
              strokeWidth="2"
            />
            <rect
              x="498"
              y="150"
              width="24"
              height="46"
              rx="10"
              fill="#ffd27a"
              opacity="0.5"
            />
          </g>
          {/* 지붕 위의 새 */}
          <g transform="translate(380 30)">
            <ellipse
              cx="14"
              cy="14"
              rx="14"
              ry="10"
              fill="#fffaf0"
              stroke="#2b2320"
              strokeWidth="2"
            />
            <circle
              cx="6"
              cy="8"
              r="7"
              fill="#fffaf0"
              stroke="#2b2320"
              strokeWidth="2"
            />
            <path d="M0 8l-6 2 6 2Z" fill="#f0a63a" />
            <circle cx="5" cy="7" r="1.4" fill="#2b2320" />
          </g>
        </g>
      )}
      {/* 돌담과 기와 얹은 담장 */}
      <rect y="300" width="552" height="100" fill="#efe0bf" />
      <rect y="294" width="552" height="14" fill="#6d7ea3" />
      <path d="M0 294H552" stroke="#2b2320" strokeWidth="2.5" />
      {Array.from({ length: 24 }, (_, i) => (
        <ellipse
          key={i}
          cx={12 + i * 23}
          cy={306}
          rx="9"
          ry="6"
          fill="#f3e6c9"
          stroke="#2b2320"
          strokeWidth="1.6"
        />
      ))}
      <g stroke="#d9c49a" strokeWidth="2" opacity="0.8">
        <path d="M0 340H552M0 372H552M70 316V340M160 340V372M250 316V340M340 340V372M430 316V340M520 340V372" />
      </g>
    </svg>
  );
}

// 세로 족자(시안의 현수막): 세로쓰기 문구 + 붉은 낙관. 위치는 인라인 스타일로 받는다.
export function Scroll({
  lines,
  style,
}: {
  lines: string[];
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="absolute z-[5] rounded-md border-2 bg-[#fbf3df] px-2.5 py-3 text-[15px] font-bold leading-tight shadow-sm"
      style={{ borderColor: "#6b4a2e", ...style }}
    >
      <div className="flex flex-row-reverse gap-2">
        {lines.map((l) => (
          <span
            key={l}
            style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
          >
            {l}
          </span>
        ))}
      </div>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-[3px] bg-[var(--mh-red)] px-1 text-[10px] text-white">
        福
      </span>
    </div>
  );
}
