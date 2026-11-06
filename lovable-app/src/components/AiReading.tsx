import { useEffect, useRef, useState } from "react";
import { ReadingWaiting } from "@/components/ReadingWaiting";
import type { AiReadingResponse } from "@/lib/ai-reading.server";
import { getAiReadingFn } from "@/lib/reading-fns";
import type { BirthInput } from "@/lib/saju";

/** 다른 요청이 만드는 중일 때 다시 물어보는 간격과 최대 횟수(약 3분) */
const POLL_MS = 8000;
const POLL_MAX = 22;

/**
 * AI 풀이(기본 사주·심층 연애운, 열람한 사람만). 기본은 누르기 전에는 AI 를 부르지 않는다.
 * auto 이면 열릴 때 바로 만들어(서버가 열람 권한·하루 한도·예산을 확인한다) 보여 준다.
 * 서버가 꺼져 있으면(기본) "준비 중" 안내만 보인다. onReady 는 AI 풀이가 화면에 나왔는지 알려 준다.
 */
export function AiReading({
  me,
  product = "basic",
  partner,
  fetcher = (d) => getAiReadingFn({ data: d }),
  pollMs = POLL_MS,
  auto = false,
  onReady,
}: {
  me: BirthInput;
  product?: "basic" | "love" | "compat";
  /** 궁합 상대(궁합일 때만) */
  partner?: BirthInput;
  fetcher?: (d: {
    product: "basic" | "love" | "compat";
    me: BirthInput;
    partner?: BirthInput;
  }) => Promise<AiReadingResponse>;
  pollMs?: number;
  /** true 면 버튼 없이 열릴 때 바로 만든다 */
  auto?: boolean;
  /** AI 풀이가 화면에 나왔을 때만 true */
  onReady?: (ready: boolean) => void;
}) {
  const [res, setRes] = useState<AiReadingResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const polls = useRef(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  const started = useRef(false);
  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    polls.current = 0;
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);
  useEffect(() => {
    onReady?.(!!res && res.ok && res.state === "ready");
  }, [res, onReady]);

  async function ask() {
    setBusy(true);
    try {
      const r = await fetcher({ product, me, ...(partner ? { partner } : {}) });
      if (!alive.current) return;
      if (r.ok && r.state === "running" && polls.current < POLL_MAX) {
        polls.current += 1;
        setTimeout(() => void ask(), pollMs);
        return;
      }
      setRes(
        r.ok && r.state === "running"
          ? {
              ok: true,
              state: "unavailable",
              message: "AI 풀이가 아직 만들어지는 중이에요. 잠시 뒤 다시 눌러 주세요.",
            }
          : r,
      );
      setBusy(false);
    } catch {
      if (!alive.current) return;
      setRes({ ok: false, error: "AI 풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      setBusy(false);
    }
  }

  if (busy || (auto && !res)) return <ReadingWaiting />;
  if (!res)
    return (
      <div className="card-hanji mt-4 p-4 text-center">
        <p className="font-serif font-bold">AI가 다시 쓴 풀이</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          같은 계산 결과를 바탕으로, AI가 읽기 쉬운 말로 다시 써요. 1~2분 걸려요.
        </p>
        <button
          type="button"
          onClick={() => {
            polls.current = 0;
            void ask();
          }}
          className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          AI 풀이 보기
        </button>
      </div>
    );
  if (!res.ok)
    return (
      <p role="alert" className="card-hanji mt-4 p-4 text-center text-sm">
        {res.error}
      </p>
    );
  if (res.state !== "ready")
    return (
      <p role="status" className="card-hanji mt-4 p-4 text-center text-sm text-muted-foreground">
        {res.state === "unavailable" ? res.message : "AI 풀이를 만드는 중이에요."}
      </p>
    );
  return (
    <section className="mt-4 space-y-3" aria-label="AI 풀이">
      <p className="font-serif text-lg font-bold">AI가 다시 쓴 풀이</p>
      {res.trial && (
        <p role="status" className="rounded-xl bg-gold/25 p-3 text-xs leading-relaxed">
          시범 풀이예요. 해석 문장은 아직 명리 전문가의 검수 전이에요. 재미와 자기 이해를 위한
          참고로만 봐 주세요.
        </p>
      )}
      {res.sections.map((s, i) => (
        <details key={s.id} className="card-hanji p-4" open={i === 0}>
          <summary className="cursor-pointer font-serif font-bold">{s.title}</summary>
          {s.headline && <p className="mt-2 text-sm font-bold">{s.headline}</p>}
          <div className="mt-2 space-y-2 text-sm leading-relaxed">
            {s.body.split("\n").map((line, j) => (line.trim() ? <p key={j}>{line}</p> : null))}
          </div>
        </details>
      ))}
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        계산(사주 글자·계절·기운의 관계)은 정해진 규칙으로 하고, AI는 그 결과를 글로만 옮겨요.
        {res.reviewed ? " 다른 AI가 한 번 더 근거와 대조해 확인했어요." : ""}
      </p>
    </section>
  );
}
