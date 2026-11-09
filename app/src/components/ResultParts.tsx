import type { ReactNode } from "react";
import { Friend, type FriendKind } from "@/components/Friends";
import { Coin } from "@/components/Shell";
import {
  EL_WORD,
  branchElement,
  stemElement,
  type Element,
} from "@/lib/reading";
import type { Pillar } from "@/lib/saju";

export const EL_BG: Record<Element, string> = {
  목: "#3b8f7b",
  화: "#d6463a",
  토: "#e8b23a",
  금: "#ece8df",
  수: "#2f3150",
};
export const EL_FG: Record<Element, string> = {
  목: "#fff",
  화: "#fff",
  토: "#2b2233",
  금: "#2b2233",
  수: "#fff",
};

export function Basis({ items }: { items: string[] }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-extrabold text-[var(--ink-soft)]">근거</span>
      {items.map((t) => (
        <span
          key={t}
          className="rounded-md border-[1.5px] border-[var(--ink-soft)] bg-[#fffdf5] px-1.5 py-0.5 font-bold text-[var(--ink)]"
        >
          {t}
        </span>
      ))}
    </p>
  );
}

export function Fold({
  eyebrow,
  title,
  friend,
  summary,
  children,
  open,
}: {
  eyebrow: string;
  title: string;
  friend: FriendKind;
  summary: string[];
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="hj-card group mt-3 overflow-hidden bg-[#fffaf0]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3.5">
        <span className="shrink-0 rounded-2xl bg-[var(--paper-2)] p-0.5">
          <Friend kind={friend} size={44} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-[var(--stamp)]">
            {eyebrow}
          </span>
          <span className="font-display text-[17px] leading-snug">{title}</span>
        </span>
        <span
          className="text-xl transition-transform group-open:rotate-180"
          aria-hidden
        >
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-4">
        <ul className="rounded-xl bg-[var(--paper-2)] px-3 py-2.5 text-[14px] font-bold leading-relaxed">
          {summary.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="text-[var(--stamp)]">{["①", "②", "③"][i]}</span>
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-3 text-[15px] leading-[1.75]">
          {children}
        </div>
      </div>
    </details>
  );
}

export function Locked({
  eyebrow,
  title,
  teaser,
  price,
}: {
  eyebrow: string;
  title: string;
  teaser: string;
  price: string;
}) {
  return (
    <div className="hj-card relative mt-3 overflow-hidden bg-[#fffaf0] px-4 py-4">
      <p className="text-[11px] font-extrabold text-[var(--stamp)]">
        {eyebrow}
      </p>
      <p className="font-display pr-14 text-[17px] leading-snug">{title}</p>
      <p
        className="mt-2 select-none text-[15px] leading-relaxed blur-[5px]"
        aria-hidden
      >
        {teaser}
      </p>
      <span className="stamp absolute right-3 top-3 !text-[13px]">
        <Coin size={13} /> {price}
      </span>
    </div>
  );
}

export function ManseTable({
  pillars,
}: {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
}) {
  const cols: { label: string; me?: boolean; p: Pillar | null }[] = [
    { label: "시주", p: pillars.hour },
    { label: "일주", me: true, p: pillars.day },
    { label: "월주", p: pillars.month },
    { label: "연주", p: pillars.year },
  ];
  return (
    <section
      className="hj-card mt-4 overflow-hidden bg-[#fffaf0]"
      aria-label="만세력"
    >
      <h2 className="font-display bg-[var(--su)] py-2.5 text-center text-lg text-[#fffaf0]">
        만세력
      </h2>
      <div className="grid grid-cols-4 border-b-2 border-[var(--line)] text-center text-xs font-bold">
        {cols.map((c) => (
          <p
            key={c.label}
            className={`py-1.5 ${c.me ? "bg-[var(--to)]" : "bg-[var(--paper-2)]"}`}
          >
            {c.label}
            {c.me ? " · 나" : ""}
          </p>
        ))}
      </div>
      {(["stem", "branch"] as const).map((row) => (
        <div key={row} className="grid grid-cols-4">
          {cols.map((c) => {
            if (!c.p)
              return (
                <div
                  key={c.label + row}
                  className="flex h-[84px] items-center justify-center border-r-2 border-t-2 border-[var(--line)] bg-[#f3ecdc] text-[11px] text-[var(--ink-soft)] last:border-r-0"
                >
                  시간 모름
                </div>
              );
            const el =
              row === "stem"
                ? stemElement(c.p.stem)
                : branchElement(c.p.branch);
            const hanja =
              row === "stem" ? c.p.hanja.charAt(0) : c.p.hanja.charAt(1);
            const ko = row === "stem" ? c.p.ko.charAt(0) : c.p.ko.charAt(1);
            return (
              <div
                key={c.label + row}
                className="flex h-[84px] flex-col items-center justify-center border-r-2 border-t-2 border-[var(--line)] last:border-r-0"
                style={{ background: EL_BG[el], color: EL_FG[el] }}
              >
                <span className="font-display text-[34px] leading-none">
                  {hanja}
                </span>
                <span className="mt-1 text-[11px] font-bold opacity-90">
                  {ko} · {EL_WORD[el]}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <p className="border-t-2 border-[var(--line)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">
        위 줄은 하늘 글자(천간), 아래 줄은 땅 글자(지지)예요. 칸 색은 오방색: 목
        청, 화 적, 토 황, 금 백, 수 흑.
        {!pillars.hour &&
          " 출생 시간을 모르면 시주는 추측하지 않고 6글자만 계산해요."}
      </p>
    </section>
  );
}
