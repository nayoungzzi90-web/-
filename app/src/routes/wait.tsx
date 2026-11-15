import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ASSETS } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/wait")({ component: Wait });

// 계산은 이 기기에서 바로 끝난다. 아래 3초는 점괘를 뽑는 연출이며 실제 대기 시간이 아니다.
const RITUAL_MS = 3200;
const COPY = [
  "엽전을 던지는 중…",
  "오행의 균형을 재는 중…",
  "내 일간을 찾는 중…",
  "점괘를 정리하는 중…",
];

function Wait() {
  const nav = useNavigate();
  const { me, hydrated } = useStore();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (hydrated && !me) void nav({ to: "/input" });
  }, [hydrated, me, nav]);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min(
        100,
        Math.round(((Date.now() - start) / RITUAL_MS) * 100),
      );
      setPct(p);
      if (p >= 100) {
        clearInterval(t);
        void nav({ to: "/result", replace: true });
      }
    }, 120);
    return () => clearInterval(t);
  }, [nav]);
  return (
    <TtShell title="점괘 뽑는 중">
      <section className="text-center">
        <p className="text-[15px] font-bold text-[var(--tt-orange)]">또또가 이야기를 쓰는 중</p>
        <h1 className="mt-1 text-[clamp(26px,7.4vw,30px)] leading-tight">{COPY[Math.min(3, Math.floor(pct / 26))]}</h1>
        <div className="tt-wait-card mt-5 overflow-hidden rounded-[20px] border-[2.5px] border-[var(--tt-ink)] bg-[var(--tt-yellow)] px-4 pt-5 shadow-[0_4px_0_var(--tt-ink)]">
          <img src={ASSETS.heroBook} alt="" aria-hidden className="tt-wait-art mx-auto block w-[52%]" draggable={false} />
        </div>
        <div className="mt-5 h-5 overflow-hidden rounded-full border-[2.5px] border-[var(--tt-ink)] bg-white">
          <div className="h-full bg-[#ff6f45] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[20px] font-extrabold">{pct}%</p>
      </section>
    </TtShell>
  );
}
