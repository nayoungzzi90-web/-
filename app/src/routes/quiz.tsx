import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend, FRIEND_IMG, FRIEND_INFO, type FriendKind } from "@/components/Friends";
import { Page } from "@/components/Shell";
import {
  DEEP_TEXT,
  NAME_MAX,
  QUESTIONS,
  TYPE_TEXT,
  addMember,
  chemistry,
  cleanName,
  comboTitle,
  decodeBoard,
  encodeBoard,
  friendName,
  matchCards,
  modeOn,
  scoreQuiz,
  summarizeBoard,
  type Member,
} from "@/lib/quiz";
import { ELEMENTS, EL_FRIEND, EL_HANJA, EL_WORD } from "@/lib/reading";
import type { Element } from "@/lib/saju";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import { shareCard } from "@/lib/share-card";

export const Route = createFileRoute("/quiz")({
  validateSearch: (s: Record<string, unknown>): { b?: string } =>
    typeof s["b"] === "string" && s["b"].length > 0 ? { b: s["b"] } : {},
  // 링크를 카카오톡·문자에 붙이면 "OO님은 달토! 너는?" 미리보기가 뜨도록 서버에서 태그를 만든다.
  head: ({ match }) => {
    const b = (match.search as { b?: string }).b;
    const board = b ? decodeBoard(b) : null;
    const last = board?.at(-1);
    const title = last
      ? `${last.name}님은 ${friendName(last.primary)}! 너의 오행 친구는?`
      : "30초 오행 친구 테스트";
    const desc = last
      ? `${board!.length}명이 모인 오행 모임 판. 나도 참여하고 우리 케미를 확인해요.`
      : SITE_DESC;
    const image = last
      ? `${SITE_URL}${FRIEND_IMG[EL_FRIEND[last.primary]]}`
      : `${SITE_URL}/restore/hero.jpg`;
    return {
      meta: [
        { title: `${title} | ${SITE_NAME}` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Quiz,
});

const NICK_KEY = "ohaeng:quiz-nick:v1";
function loadNick(): string {
  try {
    return cleanName(localStorage.getItem(NICK_KEY) ?? "");
  } catch {
    return "";
  }
}
function saveNick(n: string) {
  try {
    localStorage.setItem(NICK_KEY, n);
  } catch {
    /* 저장소를 못 쓰는 환경은 건너뛴다 */
  }
}

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const EL_COLOR: Record<Element, string> = {
  목: "#3b8f7b",
  화: "#d6463a",
  토: "#e8b23a",
  금: "#b9b4c9",
  수: "#4a4d78",
};

const btnMain =
  "font-display w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] active:translate-y-0.5 disabled:opacity-50";
const btnSub =
  "font-display w-full rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0] py-3 text-base shadow-[3px_3px_0_var(--line)] active:translate-y-0.5";

function Board({ members, me }: { members: Member[]; me?: Member }) {
  const sum = summarizeBoard(members);
  const max = Math.max(1, ...ELEMENTS.map((e) => sum.counts[e]));
  return (
    <div className="hj-card bg-[#fffaf0] p-4 text-left">
      <p className="font-display text-lg">
        오행 모임 판 <span className="text-[var(--stamp)]">{members.length}명</span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {members.map((m, i) => {
          const f = EL_FRIEND[m.primary];
          const mine = me !== undefined && i === members.length - 1;
          return (
            <li
              key={`${m.name}-${i}`}
              className="flex items-center gap-1 rounded-full border-2 border-[var(--line)] py-0.5 pl-1 pr-2.5 text-sm"
              style={{ background: FRIEND_INFO[f].tint }}
            >
              <img
                src={FRIEND_IMG[f]}
                alt=""
                className="h-7 w-7 rounded-full object-cover object-top"
                draggable={false}
              />
              <span className="font-bold">{m.name}</span>
              {mine && <span className="text-[10px] text-[var(--stamp)]">나</span>}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-1.5">
        {ELEMENTS.map((e) => (
          <div key={e} className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 font-bold">
              {EL_HANJA[e]} {friendName(e)}
            </span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#efe3c8]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(sum.counts[e] / max) * 100}%`,
                  background: EL_COLOR[e],
                }}
              />
            </div>
            <span className="w-5 text-right tabular-nums">{sum.counts[e]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed">{sum.line}</p>
    </div>
  );
}

const WALKERS: FriendKind[] = ["seonbi", "ssi", "tiger", "rabbit", "turtle"];
const CHEER = [
  "가볍게 시작해 봐요!",
  "좋아요, 술술~",
  "벌써 세 번째예요!",
  "솔직하게 골라 주세요",
  "절반 가까이 왔어요!",
  "슬슬 결과가 궁금하죠?",
  "거의 다 왔어요",
  "조금만 더 힘내요!",
  "마지막 한 걸음 전!",
  "마지막 문항이에요!",
];
const NUM = ["①", "②", "③", "④"];

function Sticker({
  icon,
  title,
  tint,
  children,
}: {
  icon: string;
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hj-card rise-in overflow-hidden bg-[#fffaf0] text-left">
      <div
        className="flex items-center gap-2 border-b-2 border-dashed border-[#c9a76e] px-4 py-2"
        style={{ background: tint }}
      >
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <p className="font-display text-[17px]">{title}</p>
      </div>
      <div className="px-4 py-3 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

function ScoreBars({ counts }: { counts: Record<Element, number> }) {
  return (
    <div className="space-y-1.5">
      {ELEMENTS.map((e) => (
        <div key={e} className="flex items-center gap-2 text-xs">
          <span className="w-[68px] shrink-0 text-left font-bold">
            {EL_HANJA[e]} {friendName(e)}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#efe3c8]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(counts[e] / 8) * 100}%`, background: EL_COLOR[e] }}
            />
          </div>
          <span className="w-7 text-right tabular-nums">{counts[e]}</span>
        </div>
      ))}
    </div>
  );
}

function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[430px] overflow-hidden">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: `${(i * 37 + 9) % 96}%`,
              animationDelay: `${(i % 9) * 0.28}s`,
              "--dx": `${((i % 5) - 2) * 28}px`,
              transform: `scale(${0.7 + (i % 4) * 0.2})`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Quiz() {
  const { b } = Route.useSearch();
  const incoming = useMemo(() => (b ? decodeBoard(b) : null), [b]);
  const badLink = b !== undefined && incoming === null;

  const [stage, setStage] = useState<"intro" | "ask" | "done">("intro");
  const [nick, setNick] = useState("");
  // 저장해 둔 닉네임은 화면이 뜬 뒤에 불러온다(서버 화면과 첫 화면을 같게 유지).
  useEffect(() => {
    setNick((cur) => (cur === "" ? loadNick() : cur));
  }, []);
  const [order, setOrder] = useState<number[][]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [petals, setPetals] = useState(false);
  // 마지막 문항 뒤 "두근두근" 연출 → 결과 등장. 움직임 줄이기 설정이면 기다리지 않는다.
  useEffect(() => {
    if (stage !== "done") {
      setRevealed(false);
      setPetals(false);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const a = window.setTimeout(() => {
      setRevealed(true);
      if (!reduce) setPetals(true);
    }, reduce ? 0 : 2200);
    const b = window.setTimeout(() => setPetals(false), reduce ? 0 : 6600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [stage]);

  const name = cleanName(nick);
  const score = stage === "done" ? scoreQuiz(answers) : null;

  function start() {
    if (!name) return;
    saveNick(name);
    setOrder(QUESTIONS.map(() => shuffled(4)));
    setAnswers([]);
    setNote("");
    setStage("ask");
  }
  function choose(optIndex: number) {
    const next = [...answers, optIndex];
    setAnswers(next);
    if (next.length === QUESTIONS.length) setStage("done");
  }
  function back() {
    if (answers.length === 0) setStage("intro");
    else setAnswers(answers.slice(0, -1));
  }

  // ── 소개 ──
  if (stage === "intro")
    return (
      <Page active="홈" blossom>
        <section className="relative z-10 px-4 pt-6 text-center">
          <p className="text-sm font-bold text-[var(--stamp)]">
            {incoming ? "친구가 모임 판을 보냈어요" : "생년월일 없이 30초"}
          </p>
          <h1 className="font-display mt-1 text-[28px] leading-tight">
            {incoming
              ? `${incoming.at(-1)!.name}님은 ${friendName(incoming.at(-1)!.primary)}!`
              : "나의 오행 친구는"}
            <br />
            {incoming ? "너는 어떤 친구야?" : "누구일까요?"}
          </h1>
          {badLink && (
            <p className="mt-3 rounded-xl bg-[#fbe3de] p-3 text-sm">
              링크를 읽지 못했어요. 새 판으로 시작할게요.
            </p>
          )}
          {incoming ? (
            <div className="mt-5">
              <Board members={incoming} />
            </div>
          ) : (
            <div className="mt-4 flex items-end justify-center">
              {(["seonbi", "ssi", "tiger", "rabbit", "turtle"] as const).map((k) => (
                <img
                  key={k}
                  src={FRIEND_IMG[k]}
                  alt={FRIEND_INFO[k].name}
                  className="h-24 w-[19%] object-contain"
                  draggable={false}
                />
              ))}
            </div>
          )}
          <label className="mt-6 block text-left text-sm font-bold" htmlFor="nick">
            친구들에게 보여 줄 닉네임 (최대 {NAME_MAX}자)
          </label>
          <input
            id="nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={NAME_MAX * 2}
            placeholder="예: 지은"
            autoComplete="nickname"
            className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] bg-[#fffaf0] px-4 py-3 text-lg outline-none focus:border-[var(--stamp)]"
          />
          <button type="button" disabled={!name} onClick={start} className={`${btnMain} mt-4`}>
            테스트 시작하기 (10문항)
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
            재미로 보는 성향 놀이예요. 사주 풀이가 아니고, 링크에는 닉네임과
            결과만 들어가요. 생년월일은 묻지 않아요.
          </p>
        </section>
      </Page>
    );

  // ── 질문 ──
  if (stage === "ask") {
    const qi = answers.length;
    const q = QUESTIONS[qi]!;
    const ord = order[qi] ?? [0, 1, 2, 3];
    const pct = Math.min(94, (qi / QUESTIONS.length) * 100);
    return (
      <Page active="홈">
        <section className="px-4 pt-5">
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={back} className="font-bold text-[var(--ink-soft)]">
              ‹ 이전
            </button>
            <span className="font-bold tabular-nums">
              {qi + 1} / {QUESTIONS.length}
            </span>
          </div>
          <div className="relative mt-9">
            <div
              className="wiggle-walk absolute -top-[42px] z-10"
              style={{ left: `calc(${pct}% - 20px)` }}
              aria-hidden
            >
              <Friend kind={WALKERS[qi % 5]!} size={44} className="hop" />
            </div>
            <div
              className="h-3 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[#efe3c8]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={QUESTIONS.length}
              aria-valuenow={qi}
            >
              <div
                className="h-full rounded-full bg-[var(--stamp)] transition-all"
                style={{ width: `${(qi / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-center text-[13px] font-bold text-[var(--stamp)]">
            {CHEER[qi]}
          </p>
          <h2 key={qi} className="font-display rise-in mt-4 text-[22px] leading-snug">
            {q.q}
          </h2>
          <ul className="mt-5 space-y-3">
            {ord.map((oi, k) => (
              <li key={`${qi}-${oi}`} className="rise-in" style={{ animationDelay: `${k * 70}ms` }}>
                <button
                  type="button"
                  onClick={() => choose(oi)}
                  className="flex w-full items-start gap-2.5 rounded-2xl border-2 border-[var(--line)] bg-[#fffaf0] px-3.5 py-3.5 text-left text-[15px] leading-snug shadow-[3px_3px_0_var(--line)] active:translate-y-0.5 active:bg-[#f3e6c8]"
                >
                  <span className="font-display mt-px text-[var(--stamp)]">{NUM[k]}</span>
                  <span>{q.options[oi]!.t}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </Page>
    );
  }

  // ── 결과 기다리는 연출 ──
  if (stage === "done" && !revealed)
    return (
      <Page active="홈">
        <section className="px-4 pt-16 text-center">
          <p className="font-display text-[26px] leading-snug">
            {name}님의 오행 친구를
            <br />
            찾는 중이에요…
          </p>
          <div className="mt-8 flex items-end justify-center gap-1" aria-hidden>
            {WALKERS.map((k) => (
              <Friend key={k} kind={k} size={70} className="hop" />
            ))}
          </div>
          <p className="mt-6 text-sm text-[var(--ink-soft)]">두근두근 ♡</p>
        </section>
      </Page>
    );

  // ── 결과 ──
  if (!score)
    return (
      <Page>
        <p className="p-6 text-center">결과를 계산하지 못했어요. 다시 해 볼까요?</p>
        <div className="px-4">
          <button type="button" onClick={() => setStage("intro")} className={btnMain}>
            처음으로
          </button>
        </div>
      </Page>
    );

  const me: Member = { name, primary: score.primary, secondary: score.secondary };
  const board = addMember(incoming ?? [], me);
  const code = encodeBoard(board);
  const link = `${typeof window === "undefined" ? SITE_URL : window.location.origin}/quiz?b=${code}`;
  const kind = EL_FRIEND[me.primary];
  const info = FRIEND_INFO[kind];
  const t = TYPE_TEXT[me.primary];
  const subKind = EL_FRIEND[me.secondary];
  const inviter = incoming?.at(-1);
  const d = DEEP_TEXT[me.primary];
  const ds = DEEP_TEXT[me.secondary];
  const combo = comboTitle(me.primary, me.secondary);
  const matches = matchCards(me.primary);

  async function sendBoard() {
    const text = `${name}님은 ${info.name}(${t.nick})! 너는 어떤 오행 친구야? 모임 판에 참여해 줘 👇`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "오행 친구 모임 판", text, url: link });
        setNote("공유했어요!");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setNote("링크를 복사했어요. 단톡방에 붙여 넣어 보세요!");
    } catch {
      setNote("공유를 취소했거나 못 했어요. 아래 링크를 길게 눌러 복사해 보세요.");
    }
  }
  async function saveCard() {
    const r = await shareCard(
      {
        kind,
        title: combo,
        sub: `${EL_HANJA[me.primary]}${EL_WORD[me.primary]}의 기운 · 부캐 ${friendName(me.secondary)}`,
        name,
        url: link.split("?")[0]!,
        subKind: subKind,
        count: board.length,
      },
      `${name}님은 ${info.name}! 너의 오행 친구도 찾아봐 → ${link}`,
    );
    setNote(
      r === "shared"
        ? "공유했어요!"
        : r === "downloaded"
          ? "결과 카드를 저장했어요."
          : "카드를 만들지 못했어요. 잠시 후 다시 해 보세요.",
    );
  }

  const shareBtns = (
    <div className="space-y-3">
      <button type="button" onClick={() => void sendBoard()} className={btnMain}>
        {incoming ? "내 결과 넣어서 다음 친구에게 넘기기" : "친구들에게 도전장 보내기"}
      </button>
      <button type="button" onClick={() => void saveCard()} className={btnSub}>
        결과 카드 이미지로 저장·공유
      </button>
    </div>
  );

  return (
    <Page active="홈" blossom>
      {petals && <Petals />}
      <section className="relative z-10 px-4 pt-5 text-center">
        <span className="rounded-full border-2 border-[var(--ink-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--ink-soft)]">
          재미용 성향 놀이 · 사주 풀이 아님
        </span>
        <h1 className="font-display pop-in mt-2 text-[24px] leading-tight">
          {name}님의 오행 친구는
          <br />
          {info.name}!
        </h1>
        <div
          className="hj-card pop-in relative mx-auto mt-4 px-4 pb-4 pt-5"
          style={{ background: info.tint }}
        >
          <span className="stamp-in font-display absolute right-3 top-3 rounded-lg border-[3px] border-[var(--stamp)] bg-[#fffaf0]/90 px-2 py-0.5 text-lg text-[var(--stamp)]">
            福
          </span>
          <Friend kind={kind} size={170} className="bob mx-auto" />
          <p className="font-display mt-1 text-[22px] leading-tight">{combo}</p>
          <p className="mt-0.5 text-sm">
            {EL_HANJA[me.primary]} {EL_WORD[me.primary]}의 기운 · {t.line}
          </p>
          <p className="mt-2 flex flex-wrap justify-center gap-1.5">
            {d.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border-2 border-[var(--line)] bg-[#fffaf0] px-2 py-0.5 text-[12px] font-bold"
              >
                {tag}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-4">{shareBtns}</div>
        {note && (
          <p role="status" className="mt-3 text-sm font-bold text-[var(--stamp)]">
            {note}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <Sticker icon="📊" title="내 오행 점수 (10문항)" tint="#f3e6c8">
            <ScoreBars counts={score.counts} />
          </Sticker>

          <Sticker icon="🌟" title={`${info.name}는 이런 친구예요`} tint={info.tint}>
            <ul className="space-y-1.5">
              {t.traits.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
            <p className="mt-3">
              <b>✨ 이럴 때 빛나요</b>
              <br />
              {t.shine}
            </p>
            <p className="mt-2">
              <b>🌱 조심하면 좋은 점</b>
              <br />
              {t.care}
            </p>
          </Sticker>

          <Sticker icon="💘" title="연애할 때" tint="#fbd9d4">
            {d.love}
          </Sticker>
          <Sticker icon="💼" title="일하고 공부할 때" tint="#d3ead9">
            {d.work}
          </Sticker>
          <Sticker icon="🫶" title="친구 사이에서" tint="#f8e4ae">
            {d.friends}
          </Sticker>
          <Sticker icon="👛" title="돈 쓰는 스타일" tint="#d5e1f3">
            {d.money}
          </Sticker>

          <Sticker icon="🌧️" title="마음이 지칠 때" tint="#e4e2ee">
            <p>
              <b>이럴 때 힘들어요</b>
              <br />
              {d.stress}
            </p>
            <p className="mt-2">
              <b>이렇게 풀어 보세요</b>
              <br />
              {d.relief}
            </p>
          </Sticker>

          <Sticker icon="🎭" title={`숨은 부캐 ${friendName(me.secondary)}`} tint={FRIEND_INFO[subKind].tint}>
            <div className="flex items-start gap-3">
              <Friend kind={subKind} size={72} className="shrink-0" />
              <div>
                <p>{TYPE_TEXT[me.secondary].sub}.</p>
                <p className="mt-1.5">
                  <b>깨어나는 순간</b>
                  <br />
                  {modeOn(me.secondary)}
                </p>
                <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                  “{ds.short}” 모습이 가끔 튀어나와요.
                </p>
              </div>
            </div>
          </Sticker>

          <Sticker icon="🤝" title="나와 어울리는 친구들" tint="#f3e6c8">
            <ul className="space-y-3">
              {matches.map((m) => (
                <li key={m.label} className="flex items-start gap-2.5">
                  <Friend kind={EL_FRIEND[m.el]} size={52} className="shrink-0" />
                  <p className="text-[14px] leading-snug">
                    <b>{m.label}</b>
                    <br />
                    {m.text}
                  </p>
                </li>
              ))}
            </ul>
          </Sticker>

          <div className="hj-card rise-in border-dashed bg-[#fffdf4] p-4 text-left">
            <p className="font-display text-lg">🍀 오늘의 주문 · 행운 놀이</p>
            <p className="font-display mt-2 text-center text-[19px] leading-snug text-[var(--stamp)]">
              “{d.mantra}”
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["행운의 색", d.lucky.color],
                  ["행운의 소품", d.lucky.item],
                  ["행운의 간식", d.lucky.food],
                  ["행운의 한마디", d.lucky.word],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#f3e6c8] px-3 py-2">
                  <dt className="text-[11px] text-[var(--ink-soft)]">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
              🍀 오늘의 작은 미션: {t.tip}
            </p>
          </div>
        </div>

        {inviter && (
          <div className="hj-card mt-4 bg-[#fffaf0] p-4 text-left">
            <p className="font-display text-lg">
              {inviter.name}님과 나의 케미 · {chemistry(name, me.primary, inviter.name, inviter.primary).title}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed">
              {chemistry(name, me.primary, inviter.name, inviter.primary).text}
            </p>
          </div>
        )}

        <div className="mt-4">
          <Board members={board} me={me} />
        </div>

        <div className="mt-5">{shareBtns}</div>
        <p className="mt-2 break-all text-[11px] text-[var(--ink-soft)]">{link}</p>

        <div className="hj-card mt-6 bg-[var(--su)] p-4 text-left text-[#fffaf0]">
          <p className="font-display text-lg">진짜 내 사주도 궁금해졌다면?</p>
          <p className="mt-0.5 text-xs text-[#d8d4e6]">
            태어난 날로 계산하는 무료 사주와, 둘의 오행으로 보는 궁합이 있어요.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/input"
              className="font-display flex-1 rounded-full border-2 border-[var(--line)] bg-[#fffaf0] py-2.5 text-center text-[15px] text-[var(--line)]"
            >
              내 사주 보기
            </Link>
            <Link
              to="/compat"
              className="font-display flex-1 rounded-full border-2 border-[var(--line)] bg-[var(--stamp)] py-2.5 text-center text-[15px] text-white"
            >
              궁합 보기
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStage("intro");
            setAnswers([]);
            setNote("");
          }}
          className="mt-4 text-sm text-[var(--ink-soft)] underline"
        >
          처음부터 다시 하기
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          이 테스트는 사주 계산이 아니라 일상 선택으로 보는 성향 놀이예요. 행운 색·소품 같은 항목도 재미로만 봐 주세요.
        </p>
      </section>
    </Page>
  );
}
