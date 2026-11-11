import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function Coin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill="#e8b23a"
        stroke="#2b2233"
        strokeWidth="1.8"
      />
      <rect
        x="8.2"
        y="8.2"
        width="7.6"
        height="7.6"
        fill="#fffaf0"
        stroke="#2b2233"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function Header({ coins = 0 }: { coins?: number }) {
  return (
    <header className="sticky top-0 z-20">
      <div className="dancheong" />
      <div className="flex items-center justify-between bg-[var(--paper)]/95 px-4 py-2.5 backdrop-blur">
        <Link to="/" className="font-display text-xl leading-none">
          오행 <span className="text-[var(--stamp)]">친구들</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border-2 border-[var(--line)] bg-[#fffaf0] px-2.5 py-1 text-sm font-extrabold">
            <Coin size={16} /> {coins}닢
          </span>
          <span className="rounded-full border-2 border-[var(--line)] bg-[var(--to)] px-3 py-1 text-sm font-extrabold">
            로그인
          </span>
        </div>
      </div>
    </header>
  );
}

const NAV = [
  { label: "홈", to: "/", d: "M4 11l8-7 8 7v8H4z" },
  {
    label: "오늘",
    to: "/today",
    d: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  },
  {
    label: "궁합",
    to: "/compat",
    d: "M12 20s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.500-7 10-7 10z",
  },
  { label: "내 결과", to: "/result", d: "M4 7h16v13H4zM3 4h18v3H3zM10 12h4" },
] as const;

export function BottomNav({ active = "홈" }: { active?: string }) {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[26px] border-t-2 border-[#d8c3a0] bg-[#fffaf0] px-3 pb-3 pt-2"
    >
      <ul className="flex justify-around">
        {NAV.map((n) => (
          <li key={n.label}>
            <Link
              to={n.to}
              className="flex w-[72px] flex-col items-center gap-0.5 py-1 text-[13px] font-extrabold"
              style={{
                color: n.label === active ? "var(--stamp)" : "var(--ink)",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={n.d} />
              </svg>
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Page({
  children,
  coins,
  active,
}: {
  children: ReactNode;
  coins?: number;
  active?: string;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <Header {...(coins === undefined ? {} : { coins })} />
      {children}
      <BottomNav active={active} />
    </div>
  );
}
