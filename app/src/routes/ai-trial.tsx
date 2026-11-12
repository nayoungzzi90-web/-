import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend, type FriendKind } from "@/components/Friends";
import { ReadingCard } from "@/components/ResultParts";
import { Page } from "@/components/Shell";
import { STORY_TOTAL, runAiStorySectionFn, runAiStorySpineFn, runAiTrialFn } from "@/lib/ai-trial-fns";
import type { StorySpine } from "@/lib/ai-story.server";
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

const FRIENDS: FriendKind[] = ["seonbi", "ssi", "tiger", "rabbit", "turtle"];
type SecRes = Awaited<ReturnType<typeof runAiStorySectionFn>>;
interface StoryView {
  sections: { id: string; title: string; headline: string; body: string }[];
  cost: number;
  notes: string[];
  step: number;
  phase?: string;
  done: boolean;
  error: string | null;
}
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
  const [mode, setMode] = useState<"story" | "claims">("story");
  const [res, setRes] = useState<TrialResponse | null>(null);
  const [story, setStory] = useState<StoryView | null>(null);

  async function run() {
    if (!me) return;
    setBusy(true);
    setRes(null);
    setStory(null);
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      /* 저장 못 해도 계속 */
    }
    try {
      const data = {
        me,
        token,
        ...(concern ? { concern, sendConcern: send } : {}),
      };
      if (mode === "story") {
        await runStory(data);
        return;
      }
      setRes(await runAiTrialFn({ data }));
    } catch {
      setRes({ ok: false, error: "요청에 실패했어요." });
    } finally {
      setBusy(false);
    }
  }

  // 섹션을 한 장씩 요청한다(휴대폰 브라우저가 1분 넘게 응답 없는 요청을 끊는 문제를 피한다)
  async function runStory(data: {
    me: NonNullable<typeof me>;
    token: string;
    concern?: string;
    sendConcern?: boolean;
  }) {
    const prior: StoryView["sections"] = [];
    let cost = 0;
    const notes: string[] = [];
    const show = (extra: Partial<StoryView>) =>
      setStory({ sections: [...prior], cost, notes: [...notes], step: prior.length, done: false, error: null, ...extra });
    show({ step: 0, phase: "구상 중" });
    // 먼저 이야기 줄기를 한 번 구상한다(실패해도 줄기 없이 계속한다)
    let spine: StorySpine | undefined;
    let spineDone = false;
    for (let net = 0; net < 2 && !spineDone; net++) {
      try {
        const sr = await runAiStorySpineFn({ data });
        if (!sr.ok) {
          show({ error: sr.error });
          return;
        }
        if (sr.state === "unavailable") {
          show({ error: sr.message });
          return;
        }
        cost += sr.costUsd;
        spine = sr.spine ?? undefined;
        spineDone = true;
      } catch {
        /* 한 번 더 */
      }
    }
    for (let i = 0; i < STORY_TOTAL; i++) {
      show({ step: i });
      let r: SecRes | null = null;
      let fix = "";
      // 한 요청은 한 번만 쓰게 하고(1분 넘는 요청을 폰이 끊는다), 검수에 걸리면 이유를 붙여 다시 요청한다(최대 3번).
      for (let attempt = 0; attempt < 3; attempt++) {
        let got: SecRes | null = null;
        for (let net = 0; net < 2 && !got; net++) {
          try {
            got = await runAiStorySectionFn({
              data: { ...data, index: i, prior, ...(spine ? { spine } : {}), ...(fix ? { fix } : {}), ...(attempt === 2 ? { giveUp: true } : {}) },
            });
          } catch {
            got = null;
          }
        }
        if (!got) {
          r = null;
          break;
        }
        if (got.ok && got.state === "retry") {
          cost += got.costUsd;
          fix = got.fix;
          continue;
        }
        r = got;
        break;
      }
      if (!r) {
        show({ error: `${i + 1}번째 글을 받아 오다가 연결이 끊겼어요. 지금까지 쓴 ${prior.length}장은 아래에 남겨 두었어요. 다시 누르면 처음부터 만들어요.` });
        return;
      }
      if (!r.ok) {
        show({ error: r.error });
        return;
      }
      if (r.state === "unavailable") {
        show({ error: r.message });
        return;
      }
      cost += r.costUsd;
      if (r.state === "ready") prior.push(r.section);
      else notes.push(r.message);
    }
    show({ done: true, step: STORY_TOTAL });
  }

  return (
    <Page>
      <section className="px-4 pt-5">
        <p className="rounded-xl border-2 border-[var(--to)] bg-[#fff3cf] px-3 py-2 text-xs font-bold">
          소유자 전용 시범 화면이에요. 결과는 모두 &lsquo;시범·검수 전&rsquo;이에요.
          풍부한 해석은 일반 명리 해석을 써서 길게 쓰고, 승인 근거 방식은 검수
          전 초안 명제만 써요.
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
            <fieldset className="mt-4 text-sm">
              <legend className="mb-1 font-extrabold">풀이 방식</legend>
              {(
                [
                  ["story", "풍부한 해석 (일반 명리 해석, 길게)"],
                  ["claims", "승인 근거 방식 (짧고 조심스러움)"],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className="mt-1 flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === v}
                    onChange={() => setMode(v)}
                    className="h-4 w-4 accent-[var(--stamp)]"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
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

        {story && (
          <div className="mt-5">
            <p role="status" className="text-xs font-bold text-[var(--ink-soft)]">
              {story.done
                ? `${story.sections.length}장 완성 · 시범 · 검수 전 · 이번 원가 약 $${Math.round(story.cost * 1e4) / 1e4}`
                : story.error
                  ? `중단됨 · 지금까지 원가 약 $${Math.round(story.cost * 1e4) / 1e4}`
                  : story.phase === "구상 중"
                    ? "먼저 이 사주의 이야기 줄기를 구상하는 중이에요…"
                    : `${Math.min(story.step + 1, STORY_TOTAL)}/${STORY_TOTAL} 쓰는 중이에요… (한 장에 15초쯤 걸려요. 화면을 켜 두세요)`}
            </p>
            {story.error && (
              <p role="alert" className="mt-2 rounded-xl border-2 border-[var(--stamp)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--stamp)]">
                {story.error}
              </p>
            )}
            {story.notes.map((n) => (
              <p key={n} className="mt-2 text-xs text-[var(--ink-soft)]">{n}</p>
            ))}
            {story.sections.map((s, i) => (
              <ReadingCard key={s.id} eyebrow={s.title} title={s.headline} friend={FRIENDS[i % FRIENDS.length]!}>
                {s.body.split(/\n{2,}/).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </ReadingCard>
            ))}
            {story.done && (
              <p className="mt-4 rounded-xl bg-[var(--paper-2)] px-3 py-2 text-[12px] leading-relaxed">
                일반적으로 알려진 명리 해석을 쉬운 말로 풀어 쓴 글이에요. 책·학파마다 다를 수 있고 전문가 검증 전이라, 재미와 참고로만 읽어 주세요.
              </p>
            )}
          </div>
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
            {res.sections.map((s, i) => (
              <ReadingCard
                key={s.id}
                eyebrow={s.title}
                title={s.headline}
                friend={FRIENDS[i % FRIENDS.length]!}
              >
                {s.body.split(/\n{2,}/).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </ReadingCard>
            ))}
            <p className="mt-4 rounded-xl bg-[var(--paper-2)] px-3 py-2 text-[12px] leading-relaxed">
              일반적으로 알려진 명리 해석을 쉬운 말로 풀어 쓴 글이에요. 책·학파마다
              다를 수 있고 전문가 검증 전이라, 재미와 참고로만 읽어 주세요.
            </p>
          </div>
        )}
      </section>
    </Page>
  );
}
