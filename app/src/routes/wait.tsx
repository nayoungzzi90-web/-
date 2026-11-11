import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/wait")({ component: Wait });

// 계산은 이 기기에서 바로 끝난다. 아래 3초는 점괘를 뽑는 연출이며 실제 대기 시간이 아니다.
const RITUAL_MS = 3200;
const LINES = [true, false, true, true, false, true];
const COPY = [
  "엽전을 던지는 중…",
  "오행의 균형을 재는 중…",
  "내 친구를 찾는 중…",
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
  const lit = Math.min(6, Math.floor(pct / 17) + 1);
  return (
    <Page>
      <section className="px-4 pt-6 text-center">
        <p className="text-sm font-bold text-[var(--stamp)]">
          오행 친구들이 점괘를 뽑는 중
        </p>
        <h1 className="font-display mt-1 text-[26px] leading-tight">
          {COPY[Math.min(3, Math.floor(pct / 26))]}
        </h1>
        <div className="hj-card mt-5 bg-[var(--su)] px-4 pb-5 pt-6 text-[#fffaf0]">
          <div className="flex items-end justify-center gap-6">
            {[0, 0.35, 0.7].map((d) => (
              <svg
                key={d}
                viewBox="0 0 24 24"
                width="46"
                height="46"
                className="coin-toss"
                style={{ animationDelay: `${d}s` }}
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10.5"
                  fill="#e8b23a"
                  stroke="#fffaf0"
                  strokeWidth="1.6"
                />
                <rect
                  x="8.2"
                  y="8.2"
                  width="7.6"
                  height="7.6"
                  fill="#2f3150"
                  stroke="#fffaf0"
                  strokeWidth="1.6"
                />
              </svg>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-center gap-2" aria-hidden>
            {LINES.map((solid, i) => (
              <div
                key={i}
                className="flex gap-3 transition-opacity duration-300"
                style={{ opacity: i < lit ? 1 : 0.15 }}
              >
                {solid ? (
                  <span className="h-2.5 w-24 rounded bg-[var(--to)]" />
                ) : (
                  <>
                    <span className="h-2.5 w-11 rounded bg-[var(--to)]" />
                    <span className="h-2.5 w-11 rounded bg-[var(--to)]" />
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-1">
            {(["seonbi", "ssi", "tiger", "rabbit", "turtle"] as const).map(
              (k, i) => (
                <div
                  key={k}
                  className="bob"
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <Friend kind={k} size={52} />
                </div>
              ),
            )}
          </div>
        </div>
        <div className="mt-5 h-5 overflow-hidden rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0]">
          <div
            className="h-full bg-[var(--hwa)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="font-display mt-2 text-lg">{pct}%</p>
      </section>
    </Page>
  );
}
