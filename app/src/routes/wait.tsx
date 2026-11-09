import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";

export const Route = createFileRoute("/wait")({ component: Wait });

// 시안: 엽전 던지기 로딩. 실제 연결 때는 서버 응답 시간으로 바꾼다(여기 숫자는 데모).
const EXPECTED_SEC = 45;
const LINES = [true, false, true, true, false, true]; // 육효 느낌의 여섯 줄(양/음, 장식)

function Wait() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const percent = Math.min(95, Math.round((sec / EXPECTED_SEC) * 95));
  const lit = Math.min(6, Math.floor(percent / 16) + 1);
  const left = Math.max(5, EXPECTED_SEC - sec);
  return (
    <Page>
      <section className="px-4 pt-6 text-center">
        <p className="text-sm font-bold text-[var(--stamp)]">
          오리 점쟁이가 엽전을 던지는 중
        </p>
        <h1 className="font-display mt-1 text-[26px] leading-tight">
          오늘 들어올 귀인이
          <br />몇 명인지 세는 중…
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
          <div className="mx-auto mt-4 h-1.5 w-40 rounded-full bg-black/30" />
          <div className="mt-5 flex flex-col items-center gap-2" aria-hidden>
            {LINES.map((solid, i) => (
              <div
                key={i}
                className="flex gap-3 transition-opacity duration-500"
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

        <div className="mt-5">
          <div className="h-5 overflow-hidden rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0]">
            <div
              className="h-full bg-[var(--hwa)] transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="font-display mt-2 text-lg">{percent}%</p>
          <p className="text-sm text-[var(--ink-soft)]">
            예상 남은 시간: 약 {left}초 (어림한 값이에요)
          </p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            화면을 나가도 계속 진행돼요
          </p>
        </div>

        <div className="hj-card mt-6 bg-[#dfe9f7] p-4 text-left">
          <p className="font-display text-base">문의하기</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            3분이 지나도 안 끝나면 먼저{" "}
            <b className="text-[var(--stamp)]">새로고침</b>을 해주세요.
          </p>
        </div>
      </section>
    </Page>
  );
}
