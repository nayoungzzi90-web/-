import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, NeedBirth } from "@/components/Shell";
import { Friend } from "@/components/Friends";
import { CONCERN_MAX, cleanConcern, concernFeedback } from "@/lib/concern";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/concern")({
  head: () => ({
    meta: [
      { title: "요즘 고민 — 오행 친구들" },
      { name: "description", content: "요즘 가장 궁금한 점을 적으면 풀이가 나에게 더 잘 맞아요." },
      { property: "og:title", content: "요즘 고민 — 오행 친구들" },
      { property: "og:description", content: "궁금한 점을 적어보세요." },
    ],
  }),
  component: ConcernPage,
});

function ConcernPage() {
  const { me, concern } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState(concern);
  if (!me)
    return (
      <Shell title="요즘 고민">
        <NeedBirth />
      </Shell>
    );
  const len = text.length;
  const pct = Math.min(100, Math.round((len / CONCERN_MAX) * 100));
  const go = (withText: boolean) => {
    setStore({ concern: withText ? cleanConcern(text) : "" });
    nav({ to: "/character" });
  };
  return (
    <Shell title="요즘 고민">
      <div className="card-hanji bg-gold p-4">
        <h1 className="font-serif text-xl font-bold leading-snug">
          요즘 어떤 점이
          <br />
          가장 궁금하신가요?
        </h1>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm">
        <span className="h-5 w-1 rounded bg-primary" aria-hidden />
        {me.name}님의 사주를 보고 있어요
      </p>
      <div className="mt-3 flex gap-2 rounded-2xl border-2 border-[#2b1d2e] bg-[#fde4e1] p-3 text-sm leading-relaxed">
        <span className="text-primary" aria-hidden>
          ✦
        </span>
        <p>
          구체적인 상황을 적어주실수록, 사주의 큰 틀 안에서 더 깊이 있고 예리한 풀이를 해드려요.
        </p>
      </div>
      <label className="mt-4 block text-sm font-bold" htmlFor="concern-text">
        현재 상황이나 고민 <span className="font-normal text-muted-foreground">(선택)</span>
      </label>
      <textarea
        id="concern-text"
        value={text}
        maxLength={CONCERN_MAX}
        rows={6}
        placeholder="예: 요즘 이직을 고민 중이에요. 저한테 맞는 일이 뭘까요? 올해 운은 어떤가요?"
        onChange={(e) => setText(e.target.value)}
        className="mt-1 w-full rounded-2xl border-2 border-[#2b1d2e] bg-card p-4 text-base leading-relaxed"
      />
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3d6bd]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={CONCERN_MAX}
        aria-valuenow={len}
        aria-label="글자 수"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-bold text-primary" role="status">
          <Friend kind="rabbit" size={28} />
          {concernFeedback(len)}
        </span>
        <span className="text-muted-foreground">
          {len} / {CONCERN_MAX}
        </span>
      </div>
      <button
        type="button"
        onClick={() => go(true)}
        className="mt-5 w-full rounded-full border-2 border-[#2b1d2e] bg-primary py-3 font-bold text-primary-foreground shadow-[3px_3px_0_#2b1d2e]"
      >
        사주 풀이 보기
      </button>
      <button
        type="button"
        onClick={() => go(false)}
        className="mt-3 block w-full text-center text-sm text-muted-foreground underline"
      >
        입력 없이 바로 보기
      </button>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        적어주신 내용은 AI 풀이가 열리면 풀이를 만드는 데만 쓰여요. 지금은 어디로도 보내지 않고 이
        기기에만 잠시 둬요. 자세한 내용은{" "}
        <Link to="/privacy" className="underline">
          개인정보처리방침
        </Link>
        에서 확인할 수 있어요.
      </p>
    </Shell>
  );
}
