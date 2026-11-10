// 인형 질감의 오리(베레모 + 선글라스) 장면. 전부 직접 그린 SVG — 외부 이미지·남의 캐릭터 없음.
// 솜털 느낌의 그림자, 펠트 부리, 광택 있는 선글라스, 천 질감 잡음으로 "찍은 인형" 같은 느낌을 낸다.
export function PlushBeret({
  size = 720,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const beretPath =
    "M70 336C48 262 130 176 340 168C560 160 670 244 656 336C570 366 170 376 70 336Z";
  return (
    <svg
      viewBox="0 0 720 720"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="베레모와 선글라스를 쓴 인형 오리"
    >
      <defs>
        <linearGradient id="pb-wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ddd2" />
          <stop offset="1" stopColor="#b9b2a6" />
        </linearGradient>
        <radialGradient id="pb-body" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#ecebf1" />
          <stop offset="1" stopColor="#c9c6d3" />
        </radialGradient>
        <radialGradient id="pb-beak" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.6" stopColor="#f6a931" />
          <stop offset="1" stopColor="#d9831a" />
        </radialGradient>
        <radialGradient id="pb-beret" cx="0.4" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#3a3640" />
          <stop offset="0.6" stopColor="#1c1a21" />
          <stop offset="1" stopColor="#0f0e12" />
        </radialGradient>
        <linearGradient id="pb-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2830" />
          <stop offset="1" stopColor="#121116" />
        </linearGradient>
        <linearGradient id="pb-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b3b44" />
          <stop offset="1" stopColor="#0c0c10" />
        </linearGradient>
        {/* 천 질감: 작은 알갱이 잡음 */}
        <filter id="pb-fabric" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.4  0 0 0 0.55 -0.12"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        {/* 펠트 부리: 가장자리를 살짝 거칠게 */}
        <filter id="pb-felt" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="2"
            seed="3"
            result="t"
          />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="5" />
        </filter>
        <filter id="pb-blur">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="pb-blur-s">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <clipPath id="pb-bodyclip">
          <ellipse cx="365" cy="520" rx="238" ry="262" />
        </clipPath>
      </defs>

      {/* 배경: 흐릿한 방 */}
      <rect width="720" height="720" fill="url(#pb-wall)" />
      <g filter="url(#pb-blur)" opacity="0.85">
        <rect x="-20" y="20" width="250" height="46" fill="#f1efe9" />
        <rect x="0" y="76" width="280" height="50" fill="#dedbd3" />
        <rect x="-10" y="136" width="240" height="46" fill="#cfcbc3" />
        <path d="M470 0H720V260C650 250 560 210 470 170Z" fill="#c9dad6" />
        <rect x="0" y="420" width="130" height="300" fill="#c8bba5" />
      </g>

      {/* 몸: 솜 인형처럼 둥글고 부드러운 달걀형 */}
      <ellipse
        cx="368"
        cy="545"
        rx="240"
        ry="268"
        fill="#000"
        opacity="0.16"
        filter="url(#pb-blur)"
      />
      <ellipse cx="365" cy="520" rx="238" ry="262" fill="url(#pb-body)" />
      <g clipPath="url(#pb-bodyclip)">
        <rect
          x="100"
          y="240"
          width="560"
          height="560"
          filter="url(#pb-fabric)"
          opacity="0.5"
        />
        <ellipse
          cx="365"
          cy="800"
          rx="330"
          ry="170"
          fill="#8d8a9a"
          opacity="0.28"
          filter="url(#pb-blur)"
        />
        <ellipse
          cx="365"
          cy="340"
          rx="236"
          ry="46"
          fill="#4a4752"
          opacity="0.4"
          filter="url(#pb-blur)"
        />
      </g>

      {/* 목도리와 검은 옷 */}
      <path
        d="M135 628C210 700 520 706 600 622L640 720H110Z"
        fill="url(#pb-cloth)"
      />
      <path
        d="M135 628C210 700 520 706 600 622L610 650C520 724 210 728 125 656Z"
        fill="#000"
        opacity="0.28"
      />
      <path
        d="M430 690C520 640 640 650 720 700V720H420Z"
        fill="url(#pb-cloth)"
      />
      <path
        d="M430 690C520 640 640 650 720 700"
        fill="none"
        stroke="#3b3842"
        strokeWidth="3"
        opacity="0.7"
      />

      {/* 부리: 펠트 덩어리 */}
      <g filter="url(#pb-felt)">
        <path
          d="M290 470C290 430 440 430 440 470C446 540 410 592 365 592C320 592 284 540 290 470Z"
          fill="url(#pb-beak)"
        />
      </g>
      <path
        d="M312 524Q365 544 418 524"
        fill="none"
        stroke="#c46d10"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse
        cx="338"
        cy="486"
        rx="30"
        ry="12"
        fill="#fff"
        opacity="0.28"
        filter="url(#pb-blur-s)"
      />

      {/* 선글라스 */}
      <path
        d="M152 442L122 432M578 442L608 432"
        stroke="#17171b"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <ellipse
        cx="248"
        cy="452"
        rx="98"
        ry="62"
        fill="url(#pb-lens)"
        stroke="#0b0b0e"
        strokeWidth="20"
      />
      <ellipse
        cx="482"
        cy="452"
        rx="98"
        ry="62"
        fill="url(#pb-lens)"
        stroke="#0b0b0e"
        strokeWidth="20"
      />
      <path
        d="M348 446Q365 428 382 446"
        fill="none"
        stroke="#0b0b0e"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M190 424Q240 398 296 418"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M428 424Q482 398 534 418"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.28"
      />
      <ellipse
        cx="520"
        cy="478"
        rx="9"
        ry="19"
        fill="#fff"
        opacity="0.16"
        transform="rotate(25 520 478)"
      />

      {/* 베레모: 납작하게 부푼 천 모자 */}
      <g transform="rotate(-4 370 300)">
        <ellipse
          cx="372"
          cy="322"
          rx="282"
          ry="40"
          fill="#000"
          opacity="0.35"
          filter="url(#pb-blur-s)"
        />
        <path d={beretPath} fill="url(#pb-beret)" />
        <path
          d="M120 270C200 214 330 196 480 212"
          fill="none"
          stroke="#4c4856"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M540 226C600 250 630 286 636 320"
          fill="none"
          stroke="#0b0a0e"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.6"
        />
        <g filter="url(#pb-fabric)" opacity="0.6">
          <path d={beretPath} />
        </g>
        <path
          d="M70 336C170 376 570 366 656 336L652 358C552 398 180 402 78 360Z"
          fill="#101014"
        />
        {/* 이름표(우리 이름: 오행) */}
        <rect x="320" y="356" width="86" height="22" rx="4" fill="#cfd0d6" />
        <rect
          x="320"
          y="356"
          width="86"
          height="8"
          rx="4"
          fill="#fff"
          opacity="0.6"
        />
        <text
          x="363"
          y="373"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#3a3940"
          fontFamily="sans-serif"
        >
          오행
        </text>
      </g>
    </svg>
  );
}
