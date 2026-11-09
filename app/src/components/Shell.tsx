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
  { label: "점집", d: "M4 11l8-6 8 6v8H4z" },
  { label: "상담", d: "M5 6h14v9H9l-4 3z" },
  {
    label: "오늘",
    d: "M12 4v3M12 17v3M4 12h3M17 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2",
  },
  {
    label: "마이",
    d: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c0-4 3-6 7-6s7 2 7 6",
  },
];

export function BottomNav({ active = "점집" }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit gap-1 rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0] p-1.5 shadow-[4px_4px_0_var(--line)]">
      {NAV.map((n) => (
        <span
          key={n.label}
          className={`flex w-[68px] flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-extrabold ${
            n.label === active ? "bg-[var(--to)]" : "text-[var(--ink-soft)]"
          }`}
        >
          <svg
            width="20"
            height="20"
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
        </span>
      ))}
    </nav>
  );
}

export function Page({
  children,
  coins,
}: {
  children: ReactNode;
  coins?: number;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <Header {...(coins === undefined ? {} : { coins })} />
      {children}
      <BottomNav />
    </div>
  );
}
