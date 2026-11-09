import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend, FRIEND_INFO } from "@/components/Friends";
import { Basis } from "@/components/ResultParts";
import { Page } from "@/components/Shell";
import { dailyFortune } from "@/lib/daily";
import { EL_FRIEND, EL_HANJA, EL_WORD, stemElement } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";
import { kstToday } from "@/lib/saju";
import { setStore, useStore } from "@/lib/store";
import { shareCard } from "@/lib/share-card";

export const Route = createFileRoute("/today")({ component: Today });

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function Today() {
  const { me, lastDaily, streak, hydrated } = useStore();
  const today = kstToday();
  const [opened, setOpened] = useState(false);
  const stem = useMemo(() => {
    if (!me) return null;
    const p = previewFromBirthInput(me);
    return p.ok && p.pillars ? p.pillars.day.stem : null;
  }, [me]);
  const f = useMemo(
    () => (stem === null ? null : dailyFortune(stem, today)),
    [stem, today],
  );

  // 연속 방문 도장: 하루에 한 번만 센다.
  useEffect(() => {
    if (!hydrated || !opened || !f || lastDaily === today) return;
    setStore({
      lastDaily: today,
      streak: lastDaily === addDays(today, -1) ? streak + 1 : 1,
    });
  }, [hydrated, opened, f, lastDaily, today, streak]);

  if (!hydrated)
    return (
      <Page>
        <p className="p-6 text-center">불러오는 중…</p>
      </Page>
    );
  if (!me || stem === null)
    return (
      <Page>
        <section className="px-4 pt-8 text-center">
          <Friend kind="turtle" size={110} className="mx-auto bob" />
          <p className="font-display mt-3 text-xl">
            내 일주를 먼저 알아야 복주머니를 열 수 있어요꽥
          </p>
          <Link
            to="/input"
            className="font-display mt-5 inline-block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] px-7 py-3 text-white shadow-[4px_4px_0_var(--line)]"
          >
            내 사주 입력하기
          </Link>
        </section>
      </Page>
    );
  if (!f)
    return (
      <Page>
        <p className="p-6 text-center">오늘의 운세를 계산하지 못했어요.</p>
      </Page>
    );

  const myEl = stemElement(stem);
  const kind = EL_FRIEND[myEl];
  const shown = lastDaily === today ? streak : opened ? streak : streak;
  const stamps = Math.min(7, Math.max(shown, lastDaily === today ? 1 : 0));

  return (
    <Page>
      <section className="px-4 pt-5 text-center">
        <p className="text-sm font-bold text-[var(--stamp)]">
          {today.replace(/-/g, ".")} · {me.name}님의 오늘
        </p>
        {!opened ? (
          <>
            <h1 className="font-display mt-1 text-[26px] leading-tight">
              오늘의 복주머니가
              <br />
              기다리고 있어요
            </h1>
            <button
              type="button"
              onClick={() => setOpened(true)}
              aria-label="복주머니 열기"
              className="mx-auto mt-6 block"
            >
              <svg viewBox="0 0 120 130" width="190" className="bob">
                <path
                  d="M30 30C20 50 8 80 22 105C35 125 85 125 98 105C112 80 100 50 90 30Z"
                  fill="#d6463a"
                  stroke="#2b2233"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M30 30C40 22 80 22 90 30L86 42C70 36 50 36 34 42Z"
                  fill="#e8b23a"
                  stroke="#2b2233"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M60 30V12M60 12C50 4 44 12 52 18M60 12C70 4 76 12 68 18"
                  fill="none"
                  stroke="#2b2233"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <text
                  x="60"
                  y="86"
                  textAnchor="middle"
                  fontSize="34"
                  fontWeight="700"
                  fill="#fffaf0"
                  fontFamily="serif"
                >
                  福
                </text>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setOpened(true)}
              className="font-display mt-4 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)]"
            >
              복주머니 열기
            </button>
          </>
        ) : (
          <>
            <div
              className="hj-card mt-3 px-4 pb-4 pt-5 text-left"
              style={{ background: FRIEND_INFO[kind].tint }}
            >
              <div className="flex items-center gap-3">
                <Friend
                  kind={kind}
                  accessory="sunglasses"
                  size={88}
                  className="bob shrink-0"
                />
                <div>
                  <p className="text-[11px] font-extrabold text-[var(--stamp)]">
                    {FRIEND_INFO[kind].name}의 오늘 한마디
                  </p>
                  <p className="font-display text-[21px] leading-snug">
                    {f.headline}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed">{f.line}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-[#e3f2ea] p-3">
                  <p className="font-extrabold">이러면 좋아요</p>
                  <ul className="mt-1 space-y-0.5">
                    {f.doList.map((t) => (
                      <li key={t}>· {t}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-[#fde4e1] p-3">
                  <p className="font-extrabold">이건 피해요</p>
                  <ul className="mt-1 space-y-0.5">
                    {f.avoidList.map((t) => (
                      <li key={t}>· {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-sm font-bold">
                오늘의 행운 색: {f.luckyColor} ({EL_HANJA[f.luckyEl]}{" "}
                {EL_WORD[f.luckyEl]})
              </p>
              <Basis items={f.basis} />
            </div>

            <div className="hj-card mt-3 bg-[#fffaf0] p-4 text-left">
              <p className="font-display text-lg">연속 방문 도장</p>
              <div className="mt-2 flex justify-between">
                {Array.from({ length: 7 }, (_, i) => (
                  <span
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-extrabold ${i < stamps ? "border-[var(--stamp)] bg-[var(--stamp)] text-white" : "border-[var(--ink-soft)] text-[var(--ink-soft)]"}`}
                  >
                    {i < stamps ? "福" : i + 1}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">
                {stamps >= 7
                  ? "7일 연속! 오늘의 오행 친구 배지를 받았어요"
                  : `${7 - stamps}일 더 열면 7일 연속 배지를 받아요`}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void shareCard(
                  {
                    kind,
                    title: f.headline,
                    sub: `${today.replace(/-/g, ".")} 오늘의 복주머니`,
                    name: me.name,
                    url: location.origin,
                  },
                  `오늘의 복주머니: ${f.headline} ${location.origin}`,
                )
              }
              className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] py-3 shadow-[3px_3px_0_var(--line)]"
            >
              오늘의 한마디 공유하기
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
              오늘의 일진(日辰)과 내 일간의 오행 관계로 만든 재미용 한 줄이에요.
              점수나 예언이 아니에요.
            </p>
          </>
        )}
      </section>
    </Page>
  );
}
