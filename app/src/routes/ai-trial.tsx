import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { runAiTrialFn } from "@/lib/ai-trial-fns";
import type { TrialResponse } from "@/lib/ai-trial.server";
import { useStore } from "@/lib/store";

// 소유자 전용 AI 풀이 시범 화면. 홈에서 링크하지 않고 검색에 잡히지 않게 한다.
export const Route = createFileRoute("/ai-trial")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "AI 풀이 시범" },
    ],
  }),
  component: AiTrial,
});

const KEY = "ohaeng:ai-trial-token"; // 이 탭에서만 기억(sessionStorage)
function loadToken() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function AiTrial() {
  const { me, concern } = useStore();
  const [token, setToken] = useState(loadToken);
  const [send, setSend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TrialResponse | null>(null);

  async function run() {
    if (!me) return;
    setBusy(true);
    setRes(null);
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      /* 저장 못 해도 계속 */
    }
    try {
      const r = await runAiTrialFn({
        data: { me, token, ...(concern ? { concern, sendConcern: send } : {}) },
      });
      setRes(r);
    } catch {
      setRes({ ok: false, error: "요청에 실패했어요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <section className="px-4 pt-5">
        <p className="rounded-xl border-2 border-[var(--to)] bg-[#fff3cf] px-3 py-2 text-xs font-bold">
          소유자 전용 시범 화면이에요. 전문가 검수 전 초안 명제를 쓰고, 결과에는
          &lsquo;시범·검수 전&rsquo;이 표시돼요.
        </p>
        {!me ? (
          <div className="mt-6 text-center">
            <Friend kind="turtle" size={100} className="mx-auto" />
            <p className="font-display mt-2 text-lg">
              먼저 내 생년월일을 입력해 주세요
            </p>
            <Link
              to="/input"
              className="font-display mt-3 inline-block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] px-6 py-2.5"
            >
              입력하러 가기
            </Link>
          </div>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-extrabold">
                시범 토큰
              </span>
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-xl border-2 border-[var(--line)] bg-[#fffdf5] px-3 py-2.5 text-[16px] outline-none focus:border-[var(--stamp)]"
              />
            </label>
            {concern && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={send}
                  onChange={(e) => setSend(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[var(--stamp)]"
                />
                <span>
                  내가 적은 고민 글을 AI에 보내도 돼요.
                  <span className="block text-[11px] text-[var(--ink-soft)]">
                    체크하지 않으면 고민 글은 보내지 않아요. 이름과 생년월일은
                    어느 쪽이든 보내지 않아요.
                  </span>
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={busy || !token}
              onClick={run}
              className="font-display mt-4 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] disabled:opacity-50"
            >
              {busy
                ? "만드는 중… (1~2분 걸릴 수 있어요)"
                : "AI 풀이 만들기 (시범)"}
            </button>
          </>
        )}

        {res && !res.ok && (
          <p
            role="alert"
            className="mt-4 rounded-xl border-2 border-[var(--stamp)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--stamp)]"
          >
            {res.error}
          </p>
        )}
        {res && res.ok && res.state === "unavailable" && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-[var(--paper-2)] px-3 py-2 text-sm font-bold"
          >
            {res.message}
          </p>
        )}
        {res && res.ok && res.state === "ready" && (
          <div className="mt-5">
            <p className="text-xs font-bold text-[var(--ink-soft)]">
              {res.reviewed ? "독립 감수 통과" : "시범 · 검수 전"} · 이번 원가
              약 ${res.costUsd}
            </p>
            {res.sections.map((s) => (
              <article key={s.id} className="hj-card mt-3 bg-[#fffaf0] p-4">
                <p className="text-[11px] font-extrabold text-[var(--stamp)]">
                  {s.title}
                </p>
                <h2 className="font-display text-[19px] leading-snug">
                  {s.headline}
                </h2>
                <div className="mt-2 space-y-3 text-[15px] leading-[1.75]">
                  {s.body.split(/\n{2,}/).map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
