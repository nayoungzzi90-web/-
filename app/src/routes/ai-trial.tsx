import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend, type FriendKind } from "@/components/Friends";
import { ReadingCard } from "@/components/ResultParts";
import { Page } from "@/components/Shell";
import { computeDaeunForBirth } from "@/lib/daeun";
import { STORY_TOTALS, runAiStorySectionFn, runAiStorySpineFn, runAiTrialFn } from "@/lib/ai-trial-fns";
import type { StoryDepth, StorySpine, WrittenSection } from "@/lib/ai-story.server";
import type { TrialResponse } from "@/lib/ai-trial.server";
import { EL_WORD } from "@/lib/reading";
import { computeDetail, countElements } from "@/lib/saju-detail";
import { previewFromBirthInput } from "@/lib/saju-engine";
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
  total: number;
  slots: (WrittenSection | null)[]; // 섹션 번호 자리에 완성된 글(병렬로 쓰므로 순서대로 채워지지 않는다)
  spine?: StorySpine;
  cost: number;
  notes: string[];
  phase: "구상 중" | "쓰는 중" | "완료";
  done: boolean;
  error: string | null;
}
const LOADING = [
  "사주의 물상을 그리는 중이에요",
  "십성이 어디에 모였는지 살펴보는 중이에요",
  "대운의 계절을 넘겨 보는 중이에요",
  "올해 바람이 어느 쪽으로 부는지 보는 중이에요",
  "필요한 기운을 가려내는 중이에요",
  "일과 돈의 결을 읽는 중이에요",
];
/** 동시에 limit 개까지 실행한다 */
async function pool(n: number, limit: number, fn: (i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, n) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= n) return;
        await fn(i);
      }
    }),
  );
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
  const [depth, setDepth] = useState<StoryDepth>("basic");
  const [compact, setCompact] = useState(false);
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<TrialResponse | null>(null);
  const [story, setStory] = useState<StoryView | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((x) => x + 1), 3500);
    return () => clearInterval(t);
  }, [busy]);

  // 한눈에 보기 카드에 쓰는 엔진 판정(화면의 상세 분석과 같은 계산)
  const detail = useMemo(() => {
    if (!me) return null;
    const p = previewFromBirthInput(me);
    if (!p.ok || !p.pillars || !p.elements) return null;
    return computeDetail(p.pillars, countElements(p.pillars), computeDaeunForBirth(me), new Date());
  }, [me]);

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

  // 섹션을 한 장씩, 동시에 4장까지 요청한다(휴대폰 브라우저가 1분 넘게 응답 없는 요청을 끊는 문제를 피하고 시간을 줄인다)
  async function runStory(data: {
    me: NonNullable<typeof me>;
    token: string;
    concern?: string;
    sendConcern?: boolean;
  }) {
    const total = STORY_TOTALS[depth];
    const slots: (WrittenSection | null)[] = Array.from({ length: total }, () => null);
    let cost = 0;
    let spine: StorySpine | undefined;
    const notes: string[] = [];
    let error: string | null = null;
    let phase: StoryView["phase"] = "구상 중";
    const show = (done = false) =>
      setStory({ total, slots: [...slots], ...(spine ? { spine } : {}), cost, notes: [...notes], phase: done ? "완료" : phase, done, error });
    show();
    // 먼저 이야기 줄기를 한 번 구상한다(실패해도 줄기 없이 계속한다)
    let spineDone = false;
    for (let net = 0; net < 2 && !spineDone; net++) {
      try {
        const sr = await runAiStorySpineFn({ data: { ...data, depth } });
        if (!sr.ok) {
          error = sr.error;
          show();
          return;
        }
        if (sr.state === "unavailable") {
          error = sr.message;
          show();
          return;
        }
        cost += sr.costUsd;
        spine = sr.spine ?? undefined;
        spineDone = true;
      } catch {
        /* 한 번 더 */
      }
    }
    phase = "쓰는 중";
    show();
    let abort = false;
    await pool(total, 4, async (i) => {
      if (abort) return;
      let r: SecRes | null = null;
      let fix = "";
      // 한 요청은 한 번만 쓰게 하고(1분 넘는 요청을 폰이 끊는다), 검수에 걸리면 이유를 붙여 다시 요청한다(최대 3번).
      for (let attempt = 0; attempt < 3 && !abort; attempt++) {
        let got: SecRes | null = null;
        for (let net = 0; net < 2 && !got; net++) {
          try {
            got = await runAiStorySectionFn({
              data: { ...data, depth, index: i, prior: [], ...(spine ? { spine } : {}), ...(fix ? { fix } : {}), ...(attempt === 2 ? { giveUp: true } : {}) },
            });
          } catch {
            got = null;
          }
        }
        if (!got) break;
        if (got.ok && got.state === "retry") {
          cost += got.costUsd;
          fix = got.fix;
          continue;
        }
        r = got;
        break;
      }
      if (abort) return;
      if (!r) {
        notes.push(`${i + 1}번째 글은 연결이 끊겨 건너뛰었어요.`);
      } else if (!r.ok) {
        error = r.error;
        abort = true;
      } else if (r.state === "unavailable") {
        error = r.message;
        abort = true;
      } else {
        cost += r.costUsd;
        if (r.state === "ready") slots[i] = r.section;
        else notes.push(r.message);
      }
      show();
    });
    show(!abort);
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
            {mode === "story" && (
              <fieldset className="mt-3 text-sm">
                <legend className="mb-1 font-extrabold">분량</legend>
                {(
                  [
                    ["basic", `기본 (${STORY_TOTALS.basic}카드, 약 5,000자)`],
                    ["deep", `심층 (${STORY_TOTALS.deep}카드, 시범)`],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="mt-1 flex items-center gap-2">
                    <input
                      type="radio"
                      name="depth"
                      checked={depth === v}
                      onChange={() => setDepth(v)}
                      className="h-4 w-4 accent-[var(--stamp)]"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
            <button
              type="button"
              disabled={busy || !token}
              onClick={run}
              className="font-display mt-4 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] disabled:opacity-50"
            >
              {busy ? "만드는 중…" : "AI 풀이 만들기 (시범)"}
            </button>
          </>
        )}

        {story && (
          <div className="mt-5">
            {!story.done && !story.error && (
              <div role="status" className="rounded-2xl border-2 border-[var(--line)] bg-[#fffaf0] px-4 py-3">
                <p className="font-display text-[16px]">{LOADING[tick % LOADING.length]}</p>
                <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[#fffdf5]">
                  <div
                    className="h-full bg-[var(--stamp)] transition-all"
                    style={{ width: `${Math.round(((story.phase === "구상 중" ? 0 : 1) + story.slots.filter(Boolean).length) / (story.total + 1) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
                  {story.phase === "구상 중" ? "이 사주의 이야기 줄기를 구상하고 있어요" : `${story.slots.filter(Boolean).length}/${story.total}장 완성`} · 화면을 켜 두세요
                </p>
              </div>
            )}
            {story.error && (
              <p role="alert" className="mt-2 rounded-xl border-2 border-[var(--stamp)] bg-[#fde4e1] px-3 py-2 text-sm font-bold text-[var(--stamp)]">
                {story.error}
              </p>
            )}
            {story.spine && detail && <Glance spine={story.spine} detail={detail} showAnswer={!!concern && send} />}
            {story.slots.some(Boolean) && (
              <div className="mt-4 flex items-center justify-between px-1">
                <p className="text-[12px] text-[var(--ink-soft)]">
                  {story.done ? `${story.slots.filter(Boolean).length}장 · 약 ${story.slots.reduce((a, x) => a + (x ? x.body.replace(/\s/g, "").length : 0), 0).toLocaleString()}자 · 원가 약 $${Math.round(story.cost * 1e4) / 1e4}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setCompact((c) => !c)}
                  className="rounded-full border-2 border-[var(--line)] bg-[#fffaf0] px-3 py-1 text-[12px] font-extrabold"
                >
                  {compact ? "전체 보기" : "요약만 보기"}
                </button>
              </div>
            )}
            {story.slots.map((s, i) =>
              s ? <StoryCard key={s.id} eyebrow={s.title} title={s.headline} body={s.body} compact={compact} index={i} /> : null,
            )}
            {story.notes.map((n) => (
              <p key={n} className="mt-2 text-xs text-[var(--ink-soft)]">{n}</p>
            ))}
            {story.done && (
              <p className="mt-4 px-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                이 풀이는 일반 명리 해석이며 책·학파마다 다를 수 있고 전문가 검증 전이라, 결과를 정하는 말이 아닌 참고와 재미로만 읽어 주세요.
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

/** 카드: eyebrow + 큰 제목 + 문단. 첫 문단의 첫 문장은 한 줄 결론으로 굵게 보인다. */
function StoryCard({ eyebrow, title, body, compact, index }: { eyebrow: string; title: string; body: string; compact: boolean; index: number }) {
  const paras = body.split(/\n{2,}/).filter((p) => p.trim());
  const shown = compact ? paras.slice(0, 1) : paras;
  const m = /^(.+?[.!?])(\s|$)/.exec(paras[0] ?? "");
  const lead = m ? m[1]! : "";
  return (
    <article className="hj-card mt-4 bg-[#fffaf0] px-5 pb-5 pt-4">
      <p className="text-[12px] font-extrabold text-[var(--stamp)]">
        {index + 1}. {eyebrow}
      </p>
      <h3 className="font-display mt-1 break-keep text-[20px] leading-snug">{title}</h3>
      <div className="mt-3 space-y-3.5 break-keep text-[16px] leading-[1.85] text-[var(--ink)]">
        {shown.map((p, k) =>
          k === 0 && lead ? (
            <p key={p}>
              <b className="font-extrabold">{lead}</b>
              {p.slice(lead.length)}
            </p>
          ) : (
            <p key={p}>{p}</p>
          ),
        )}
      </div>
      {compact && paras.length > 1 && <p className="mt-2 text-[12px] text-[var(--ink-soft)]">전체 보기를 누르면 이어서 읽을 수 있어요</p>}
    </article>
  );
}

/** 한눈에 보기: 구상한 줄기와 엔진 판정을 한 카드에 모은다 */
function Glance({ spine, detail, showAnswer }: { spine: StorySpine; detail: NonNullable<ReturnType<typeof computeDetail>>; showAnswer: boolean }) {
  const now = detail.daeun.find((r) => r.now);
  const year = detail.years[0];
  const rows: [string, string][] = [
    ["인생 테마", spine.theme],
    ["겉과 속", spine.contradiction],
    ["일간의 힘", detail.strength.label],
    ["필요한 기운", EL_WORD[detail.need.primary]],
    ...(now ? ([["지금 대운", `${now.name} 대운 · ${now.mood.label}`]] as [string, string][]) : []),
    ...(year ? ([["올해", `${year.year}년 ${year.name}년 · ${year.mood.label}`]] as [string, string][]) : []),
    ...(showAnswer && spine.concern?.conclusion ? ([["내 고민에 한 줄 답", spine.concern.conclusion]] as [string, string][]) : []),
  ];
  return (
    <section className="hj-card mt-4 bg-[#fff3cf] px-5 py-4" aria-label="한눈에 보기">
      <p className="font-display text-[18px]">한눈에 보기</p>
      <dl className="mt-2 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-extrabold text-[var(--stamp)]">{k}</dt>
            <dd className="break-keep text-[15px] leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
