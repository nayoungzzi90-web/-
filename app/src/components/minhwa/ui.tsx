import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FRIENDS, type MhKind } from "./data";

// ── 엽전 아이콘(황동 원 + 네모 구멍)
export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10.6"
        fill="var(--mh-brass)"
        stroke="var(--mh-ink)"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="#f1d58f"
        strokeWidth="0.8"
        opacity="0.8"
      />
      <rect
        x="8.4"
        y="8.4"
        width="7.2"
        height="7.2"
        fill="var(--mh-hanji)"
        stroke="var(--mh-ink)"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// ── 엽전 보유량 배지
export function CoinBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 bg-[var(--mh-card)] px-3 py-1 text-lg font-extrabold"
      style={{ borderColor: "var(--mh-ink)" }}
      aria-label={`내 엽전 ${count}닢`}
    >
      <CoinIcon size={24} />
      {count}
    </span>
  );
}

// ── 상단 헤더: 뒤로가기(원형) / 제목 / 엽전 배지
export function MhHeader({
  title,
  back = "/restore/home",
  coins,
}: {
  title: string;
  back?: string;
  coins?: number;
}) {
  return (
    <header className="flex items-center justify-between px-4 pb-2 pt-4">
      <Link
        to={back}
        aria-label="뒤로가기"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--mh-card)]"
        style={{ borderColor: "var(--mh-ink)" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1 className="mh-title text-[22px]">{title}</h1>
      {coins === undefined ? (
        <span className="w-11" />
      ) : (
        <CoinBadge count={coins} />
      )}
    </header>
  );
}

// ── 버튼: 단청 홍 + 먹 외곽선 + 오른쪽 화살표
export function MhButton({
  children,
  onClick,
  disabled,
  arrow = true,
  icon,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  arrow?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mh-title flex w-full items-center justify-center gap-2 rounded-[var(--mh-r-btn)] border-2 px-5 py-3.5 text-[19px] text-white shadow-[0_3px_0_rgba(43,35,32,0.55)] transition active:translate-y-0.5 disabled:opacity-60 ${className}`}
      style={{
        background: "linear-gradient(180deg,#c4452f,#a93421)",
        borderColor: "var(--mh-ink)",
      }}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {arrow && (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// ── 토글(양력/음력, 여/남): 선택된 쪽만 색으로 채움
export function MhToggle<T extends string>({
  options,
  value,
  onChange,
  activeColors,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColors?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex gap-2" role="group">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className="mh-title flex-1 rounded-[14px] border-2 py-2.5 text-[17px]"
            style={{
              borderColor: on ? "var(--mh-ink)" : "var(--mh-line)",
              background: on
                ? (activeColors?.[o.value] ?? "var(--mh-red)")
                : "var(--mh-card)",
              color: on ? "#fff" : "var(--mh-ink)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 입력창
export function MhField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: "calendar" | "clock";
}) {
  return (
    <label className="block">
      <span className="mh-title mb-1.5 block text-[20px]">{label}</span>
      <span
        className="flex items-center rounded-[16px] border-2 bg-[var(--mh-card)] px-4"
        style={{ borderColor: "var(--mh-line)" }}
      >
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-3.5 text-[17px] outline-none placeholder:text-[var(--mh-ink-soft)]/60"
        />
        {icon && (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {icon === "calendar" ? (
              <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />
            ) : (
              <path d="M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" />
            )}
          </svg>
        )}
      </span>
    </label>
  );
}

// ── 추천 배지(상품 카드 위에 걸치는 작은 붉은 탭)
export function RecoBadge({ children = "추천" }: { children?: ReactNode }) {
  return (
    <span className="mh-title absolute -top-3 right-5 rounded-t-lg bg-[var(--mh-red)] px-3 py-0.5 text-sm text-white">
      {children}
    </span>
  );
}

// ── 하단 탭바: 홈 / 오늘 / 보관함 / 엽전
const TABS = [
  { id: "home", label: "홈", d: "M4 11l8-7 8 7v8H4z", to: "/restore/home" },
  {
    id: "today",
    label: "오늘",
    d: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
    to: "/restore/guide",
  },
  {
    id: "box",
    label: "보관함",
    d: "M4 7h16v13H4zM3 4h18v3H3zM10 12h4",
    to: "/restore/result",
  },
  {
    id: "coin",
    label: "엽전",
    d: "M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5h5v5h-5z",
    to: "/restore/charge",
  },
] as const;
export function MhTabBar({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[26px] border-t-[1.5px] bg-[var(--mh-card)] px-3 pb-3 pt-2"
      style={{ borderColor: "var(--mh-line)" }}
      aria-label="하단 메뉴"
    >
      <ul className="flex justify-around">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              to={t.to}
              className="flex w-16 flex-col items-center gap-0.5 py-1 text-[14px] font-bold"
              style={{
                color: t.id === active ? "var(--mh-red)" : "var(--mh-ink)",
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
                <path d={t.d} />
              </svg>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── 친구 소개 카드(이름 / 속성·역할 / 설명)
export function FriendCard({ kind }: { kind: MhKind }) {
  const f = FRIENDS[kind];
  return (
    <div className="mh-card flex min-w-0 flex-col items-center px-1.5 py-3 text-center">
      <p className="mh-title text-[20px]">{f.name}</p>
      <p
        className="mt-1 text-[11px] font-extrabold leading-tight"
        style={{ color: f.color }}
      >
        {f.element} {f.hanja} · {f.role}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-[var(--mh-ink-soft)]">
        {f.blurb.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </p>
    </div>
  );
}

export function FriendImg({
  kind,
  height = 100,
}: {
  kind: MhKind;
  height?: number;
}) {
  const f = FRIENDS[kind];
  return (
    <img
      src={f.img}
      alt={`${f.name} (${f.element} ${f.role})`}
      style={{ height }}
      className="w-auto object-contain"
      draggable={false}
    />
  );
}
