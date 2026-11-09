import { Friend } from "@/components/Friends";

// 오리 점집 앞 풍경(직접 그린 SVG). 기와 처마, 간판, 등불, 주렴, 창 안의 오리 점쟁이.
export function Storefront() {
  const beads = Array.from({ length: 6 }, (_, i) => 122 + i * 23);
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <svg
        viewBox="0 0 360 250"
        className="block w-full"
        role="img"
        aria-label="오리 점집 앞 풍경"
      >
        {/* 하늘 */}
        <rect width="360" height="250" fill="#fbe9c6" />
        <circle cx="300" cy="46" r="26" fill="#fff6dc" />
        {/* 기와 지붕 */}
        <path
          d="M-6 92C40 70 90 58 180 56C270 58 320 70 366 92L366 106H-6Z"
          fill="#2f3150"
          stroke="#2b2233"
          strokeWidth="3"
        />
        <path
          d="M-6 100C60 86 120 80 180 80C240 80 300 86 366 100"
          fill="none"
          stroke="#6a6d96"
          strokeWidth="2.5"
        />
        {Array.from({ length: 15 }, (_, i) => (
          <path
            key={i}
            d={`M${12 + i * 24} 64V98`}
            stroke="#4a4d78"
            strokeWidth="2.5"
          />
        ))}
        {/* 처마 끝 단청 */}
        <rect
          x="14"
          y="106"
          width="332"
          height="9"
          fill="#d6463a"
          stroke="#2b2233"
          strokeWidth="2.5"
        />
        <rect
          x="14"
          y="115"
          width="332"
          height="9"
          fill="#3b8f7b"
          stroke="#2b2233"
          strokeWidth="2.5"
        />
        {/* 벽 */}
        <rect
          x="26"
          y="124"
          width="308"
          height="112"
          fill="#fff4dc"
          stroke="#2b2233"
          strokeWidth="3"
        />
        <rect
          x="26"
          y="224"
          width="308"
          height="12"
          fill="#c98f52"
          stroke="#2b2233"
          strokeWidth="3"
        />
        {/* 기둥 */}
        <rect
          x="26"
          y="124"
          width="14"
          height="112"
          fill="#b5483a"
          stroke="#2b2233"
          strokeWidth="3"
        />
        <rect
          x="320"
          y="124"
          width="14"
          height="112"
          fill="#b5483a"
          stroke="#2b2233"
          strokeWidth="3"
        />
        {/* 달문(아치 창) */}
        <path
          d="M110 224V160C110 120 250 120 250 160V224Z"
          fill="#3a2a40"
          stroke="#2b2233"
          strokeWidth="3"
        />
        {/* 문살 */}
        <g stroke="#e8b23a" strokeWidth="1.6" opacity="0.5">
          <path d="M180 132V224M130 150V224M230 150V224M110 190H250" />
        </g>
      </svg>
      {/* 창 안의 오리 점쟁이 */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 bob">
        <Friend kind="seonbi" accessory="sunglasses" size={128} />
      </div>
      {/* 주렴(구슬발) */}
      <svg
        viewBox="0 0 360 250"
        className="pointer-events-none absolute inset-0 block w-full"
        aria-hidden
      >
        <path d="M108 140H252" stroke="#2b2233" strokeWidth="3" />
        {beads.map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 140V${164 + (i % 2) * 6}`}
              stroke="#2b2233"
              strokeWidth="1.2"
            />
            {[0, 1].map((k) => (
              <circle
                key={k}
                cx={x}
                cy={150 + k * 11}
                r="3.4"
                fill={
                  ["#3b8f7b", "#d6463a", "#e8b23a", "#fffaf0", "#2f3150"][
                    (i + k) % 5
                  ]!
                }
                stroke="#2b2233"
                strokeWidth="1"
              />
            ))}
          </g>
        ))}
      </svg>
      {/* 간판 */}
      <div className="absolute left-1/2 top-[4%] w-[44%] -translate-x-1/2 sway">
        <div className="mx-auto h-4 w-0.5 bg-[var(--line)]" />
        <div className="rounded-md border-[2.5px] border-[var(--line)] bg-[#c98f52] py-1 text-center font-display text-[15px] leading-tight text-[#fff4dc] shadow-[3px_3px_0_var(--line)]">
          오리 점집
          <span className="block text-[9px] font-sans tracking-widest text-[#ffe9b8]">
            五行 FRIENDS
          </span>
        </div>
      </div>
      {/* 등불 */}
      {[
        { l: "8%", c: "#d6463a" },
        { l: "88%", c: "#3b8f7b" },
      ].map((x) => (
        <div
          key={x.l}
          className="absolute top-[40%] sway"
          style={{ left: x.l }}
        >
          <div className="mx-auto h-3 w-0.5 bg-[var(--line)]" />
          <div
            className="h-9 w-7 rounded-[40%] border-[2.5px] border-[var(--line)]"
            style={{ background: x.c }}
          />
        </div>
      ))}
    </div>
  );
}
