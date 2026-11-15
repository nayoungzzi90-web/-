import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TtottoFace } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/concern")({ component: Concern });

const MAX = 300;
const CHIPS = [
  "이직해도 될까요?",
  "올해 연애운이 궁금해요",
  "돈 모을 수 있을까요?",
  "요즘 번아웃이 와요",
];

function feedback(n: number) {
  if (n === 0) return "한 줄이라도 적으면 풀이가 내 얘기가 돼요";
  if (n < 20) return "좋아요! 조금만 더 구체적으로 적어줘요";
  if (n < 80) return "오, 디테일이 살아있어요";
  return "이 정도면 친구도 감동이에요";
}

function Concern() {
  const nav = useNavigate();
  const { me, concern, hydrated } = useStore();
  useEffect(() => {
    if (hydrated && !me) void nav({ to: "/input" });
  }, [hydrated, me, nav]);
  const n = concern.length;
  return (
    <TtShell title="요즘 고민">
      <section>
        <p className="text-[15px] font-bold text-[var(--tt-orange)]">{me?.name ?? ""}님의 사주를 보고 있어요</p>
        <h1 className="mt-1 text-[clamp(26px,7.4vw,30px)] leading-tight">요즘 어떤 점이 가장 궁금해요?</h1>

        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setStore({ concern: c })}
              className="min-h-[44px] rounded-full border border-[var(--hair)] bg-[var(--tt-yellow)] px-3.5 py-1.5 text-[15px] font-bold"
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          value={concern}
          maxLength={MAX}
          rows={6}
          onChange={(e) => setStore({ concern: e.target.value.slice(0, MAX) })}
          placeholder="구체적으로 적을수록 풀이가 내 상황에 가까워져요. (선택)"
          className="mt-3 w-full rounded-[16px] border border-[var(--hair)] bg-white p-3.5 text-[17px] leading-relaxed outline-none focus:border-[var(--tt-orange)]"
        />
        <div className="mt-2 h-3.5 overflow-hidden rounded-full border border-[var(--hair)] bg-white">
          <div className="h-full bg-[#ff6f45] transition-all" style={{ width: `${(n / MAX) * 100}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TtottoFace size={36} />
          <p className="flex-1 text-[15px] font-bold text-[var(--tt-orange)]">{feedback(n)}</p>
          <p className="text-[13px] text-[var(--tt-muted)]">
            {n}/{MAX}
          </p>
        </div>

        <button type="button" onClick={() => void nav({ to: "/wait" })} className="tt-btn tt-primary mt-4">
          점괘 뽑기
        </button>
        <button
          type="button"
          onClick={() => {
            setStore({ concern: "" });
            void nav({ to: "/wait" });
          }}
          className="mt-2 block min-h-[44px] w-full text-center text-[15px] text-[var(--tt-muted)] underline"
        >
          입력 없이 바로 보기
        </button>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">
          적은 내용은 이 기기 안에서만 쓰여요. 서버로 보내지 않아요.
        </p>
      </section>
    </TtShell>
  );
}
