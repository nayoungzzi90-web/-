import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ASSETS, COOKIE_PRELOAD } from "@/components/ttotto/Art";
import {
  OPEN_MS,
  buildCookieResult,
  cookieReduce,
  kstDateKey,
  loadTodayResult,
  persistTodayResult,
  saveToNoteBox,
  type CookieResult,
  type KV,
} from "@/lib/daily-cookie";
import { useStore } from "@/lib/store";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/daily-cookie")({
  head: () => ({
    meta: [{ title: "오늘의 운세쿠키 · 또또사주" }],
    links: COOKIE_PRELOAD.map((href) => ({ rel: "preload", as: "image", href })),
  }),
  component: DailyCookie,
});

const memory = new Map<string, string>();
function storage(): KV {
  try {
    const s = window.localStorage;
    s.getItem("tt.probe");
    return s;
  } catch {
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) };
  }
}
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// 오늘의 운세쿠키(03)와 오늘의 쪽지(04)는 한 화면에서 상태(idle → loading → opening → revealed / error)만 바뀐다.
function DailyCookie() {
  const nav = useNavigate();
  const { me, hydrated } = useStore();
  const [state, dispatch] = useReducer(cookieReduce, "idle");
  const [result, setResult] = useState<CookieResult | null>(null);
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameFromOpening = useRef(false);
  const [imgsReady, setImgsReady] = useState(false);

  // 쿠키 그림을 미리 받아 둔다(열 때 그림이 늦게 뜨지 않게). 2초가 지나면 그대로 진행한다.
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setImgsReady(true); } };
    const t = window.setTimeout(finish, 2000);
    Promise.all(COOKIE_PRELOAD.map((src) => new Promise<void>((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = src; }))).then(finish);
    return () => window.clearTimeout(t);
  }, []);

  // 재접속·새로고침: 오늘 받은 결과를 복원한다.
  useEffect(() => {
    if (!hydrated) return;
    const saved = loadTodayResult(storage(), new Date(), me);
    if (saved) {
      setResult(saved);
      dispatch("RESTORE");
    }
  }, [hydrated, me]);

  // 열리는 동안 약 1.25초 뒤에 결과 고정. 화면을 떠나면 타이머를 정리한다.
  useEffect(() => {
    if (state !== "opening") return;
    cameFromOpening.current = true;
    const t = window.setTimeout(() => dispatch("DONE"), OPEN_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  // 모션이 끝난 뒤 결과 제목으로 포커스를 옮긴다.
  useEffect(() => {
    if (state === "revealed" && cameFromOpening.current) headingRef.current?.focus();
  }, [state]);

  // 한국 자정이 지나면(화면을 켜 둔 채) 새 쿠키가 도착한 상태로 돌아간다.
  useEffect(() => {
    if (!result) return;
    const id = window.setInterval(() => {
      if (kstDateKey(new Date()) !== result.dateKey) {
        setResult(null);
        setNotice("");
        cameFromOpening.current = false;
        dispatch("RESET");
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [result]);

  const open = useCallback(async () => {
    if (state !== "idle" && state !== "error") return; // 연타 방지(버튼도 비활성화)
    setNotice("");
    dispatch(state === "error" ? "RETRY" : "START");
    try {
      await Promise.resolve();
      const r = persistTodayResult(storage(), buildCookieResult(new Date(), me), me);
      setResult(r);
      dispatch(reducedMotion() ? "SKIP_MOTION" : "READY");
    } catch {
      dispatch("FAIL");
    }
  }, [state, me]);

  const share = async () => {
    if (!result) return;
    const url = `${location.origin}/daily-cookie`;
    const text = `오늘의 운세쿠키에서 받은 쪽지: ${result.title} — ${result.message}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: TT.cookie.title, text, url });
        setNotice("");
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNotice("링크를 복사했어요.");
      }
    } catch (e) {
      // 공유 창을 닫은 것은 실패가 아니다.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNotice("공유하지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
    }
  };
  const save = () => {
    if (!result) return;
    const out = saveToNoteBox(storage(), result);
    setNotice(out === "saved" ? "이 기기의 쪽지함에 저장했어요." : out === "already" ? "오늘 쪽지는 이미 이 기기에 저장되어 있어요." : "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
  };
  const back = () => (window.history.length > 1 ? window.history.back() : void nav({ to: "/" }));

  const shown = state === "opening" || state === "revealed";
  const revealed = state === "revealed";
  const longMsg = !!result && result.message.length > 80;
  const actionInside = !!result && !longMsg && result.action.length <= 34 && result.message.length <= 44;
  return (
    <div className="tt">
      <div className="tt-wrap pb-8">
        <header className="tt-header">
          <button type="button" className="tt-back" onClick={back} aria-label="뒤로 가기">
            <span aria-hidden className="text-[24px] font-extrabold">←</span>
          </button>
          <span className="tt-header-title">
            {shown ? "오늘의 쪽지" : TT.cookie.title}
            {!shown && <span className="tt-badge">{TT.home.badge}</span>}
          </span>
        </header>

        <main aria-busy={state === "loading" || state === "opening"}>
          {!shown && (
            <div className="mt-5 text-center">
              <h1 className="text-[clamp(28px,8vw,34px)] font-extrabold leading-tight">{TT.cookie.headline}</h1>
              <p className="mt-1 text-[17px]">{TT.cookie.subtitle}</p>
            </div>
          )}
          {shown && result?.isSample && (
            <p className="mt-4 text-center">
              <span className="tt-badge">{result.kind === "cheer" ? "오늘의 응원 메시지 · 결과 예시" : TT.sampleResult.label}</span>
            </p>
          )}

          <div className={`tt-scene is-${state} mt-3`}>
            {/* 캐릭터 장면: 원본 시안에서 분리한 한 장짜리 그림(쿠키를 든 또또). 조각·손은 분리 레이어가 아니므로 열 때는 흔들림으로 표현한다. */}
            <div className="tt-char" role="img" aria-label={shown ? "쪽지를 꺼낸 또또" : "양손으로 쿠키를 든 또또"}>
              <img src={ASSETS.cookieScene} alt="" aria-hidden className="tt-scene-art" draggable={false} />
            </div>

            {/* 쪽지: 빈 종이 그림과 실제 글자를 한 그룹으로 앞에서 확대된다 */}
            {shown && result && (
              <div className="tt-paper-grp">
                <div className="tt-paper" aria-labelledby="tt-note-title">
                  <img src={ASSETS.paper} alt="" aria-hidden className="tt-paper-img" draggable={false} />
                  <section className="tt-paper-text">
                    <h2 id="tt-note-title" ref={headingRef} tabIndex={-1} className="text-[clamp(22px,6.4vw,27px)] font-extrabold leading-tight outline-none">
                      {result.title}
                    </h2>
                    <div className="tt-note-body">
                      {!longMsg && <p className="mt-1.5 text-[16px] leading-snug">{result.message}</p>}
                      {actionInside && (
                        <>
                          <p className="mt-2"><span className="tt-pill">{result.actionTitle}</span></p>
                          <p className="mt-1 text-[15px] leading-snug">{result.action}</p>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>

          {/* 글이 길거나 종이에 다 들어가지 않으면 종이 아래에서 이어서 보여 준다 */}
          {revealed && result && (longMsg || !actionInside) && (
            <div className="tt-note-more mt-3 rounded-[18px] border-[3px] border-[var(--tt-ink)] bg-white px-4 py-3">
              {longMsg && <p className="text-[16px] leading-relaxed">{result.message}</p>}
              <p className={longMsg ? "mt-3" : ""}><span className="tt-pill">{result.actionTitle}</span></p>
              <p className="mt-1 text-[16px] leading-relaxed">{result.action}</p>
            </div>
          )}

          {!shown && state !== "error" && (
            <div className="mt-5">
              <button type="button" className="tt-btn tt-primary" onClick={open} disabled={state !== "idle" || !hydrated || !imgsReady}>
                {state === "loading" ? "쿠키를 열고 있어요…" : TT.cookie.button}
              </button>
              <p className="mt-3 text-center text-[15px] text-[var(--tt-muted)]">{TT.cookie.footer}</p>
              {!me && (
                <p className="mt-2 text-center text-[14px] text-[var(--tt-muted)]">
                  생년월일을 아직 넣지 않았다면 오늘의 응원 메시지가 나와요.{" "}
                  <Link to="/input" className="font-bold underline">내 사주로 받으려면 입력하기</Link>
                </p>
              )}
            </div>
          )}
          {state === "error" && (
            <div className="mt-5 text-center" role="alert">
              <p className="text-[17px] font-extrabold">쿠키를 열지 못했어요.</p>
              <p className="mt-1 text-[15px] text-[var(--tt-muted)]">결과를 만드는 데 문제가 생겼어요. 다시 시도해 주세요.</p>
              <button type="button" className="tt-btn tt-primary mt-3" onClick={open}>다시 시도</button>
            </div>
          )}

          {shown && (
            <div className={`tt-actions is-${state} mt-4 space-y-3`} style={!revealed ? { pointerEvents: "none" } : undefined} aria-hidden={!revealed}>
              <button type="button" className="tt-btn tt-primary" onClick={share} disabled={!revealed} tabIndex={revealed ? 0 : -1}>
                {TT.sampleResult.share}
              </button>
              <button type="button" className="tt-btn tt-sub" onClick={save} disabled={!revealed} tabIndex={revealed ? 0 : -1}>
                {TT.sampleResult.save}
              </button>
              <p role="status" className="min-h-[1.5em] text-center text-[14px] font-bold">{revealed ? notice : ""}</p>
              <p className="text-center text-[15px] text-[var(--tt-muted)]">{TT.sampleResult.footer}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
