import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Friend, FRIEND_INFO } from "@/components/Friends";
import { ManseExtra } from "@/components/ManseExtra";
import { computeDaeunForBirth } from "@/lib/daeun";
import { Basis, Fold, Locked, ManseTable } from "@/components/ResultParts";
import { Page } from "@/components/Shell";
import {
  buildReading,
  buildVerdict,
  EL_HANJA,
  EL_WORD,
  ELEMENTS,
} from "@/lib/reading";
import { EL_BG } from "@/components/ResultParts";
import { previewFromBirthInput } from "@/lib/saju-engine";
import { shareCard } from "@/lib/share-card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/result")({ component: Result });

function Result() {
  const nav = useNavigate();
  const { me, concern, hydrated } = useStore();
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (hydrated && !me) void nav({ to: "/input" });
  }, [hydrated, me, nav]);
  const preview = useMemo(() => (me ? previewFromBirthInput(me) : null), [me]);
  const rd = useMemo(
    () =>
      preview
        ? buildReading(preview, new Date(), me ? computeDaeunForBirth(me) : null)
        : null,
    [preview, me],
  );
  const verdict = useMemo(
    () => (preview ? buildVerdict(preview, concern) : null),
    [preview, concern],
  );

  if (!me || !preview)
    return (
      <Page active="내 결과">
        <p className="p-6 text-center">불러오는 중…</p>
      </Page>
    );
  if (!preview.ok || !rd || !preview.pillars)
    return (
      <Page active="내 결과">
        <section className="px-4 pt-8 text-center">
          <p className="font-display text-xl">앗, 계산할 수 없었어요</p>
          <p role="alert" className="mt-2 text-sm">
            {preview.error}
          </p>
          <Link
            to="/input"
            className="font-display mt-5 inline-block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] px-6 py-2.5"
          >
            다시 입력하기
          </Link>
        </section>
      </Page>
    );

  const info = FRIEND_INFO[rd.friend];
  const [yy, mm, dd] = me.date.split("-");
  const total = Object.values(rd.counts).reduce((a, b) => a + b, 0);
  const text = `나의 오행 친구는 ${info.name}! (${rd.image})`;

  return (
    <Page active="내 결과">
      <section className="mx-3 mt-3">
        {preview.calendarConversion && (
          <div className="mb-3 rounded-2xl border-2 border-[var(--line)] bg-[#fffaf0] p-3 text-xs">
            입력 음력 {preview.calendarConversion.originalDate} (
            {preview.calendarConversion.isLeapMonth ? "윤달" : "평달"}) → 양력{" "}
            {preview.calendarConversion.convertedSolarDate}
            <span className="block text-[11px] text-[var(--ink-soft)]">
              변환: {preview.calendarConversion.sourceName} · 공식 기관 실시간
              대조 전(검토용)
            </span>
          </div>
        )}
        {preview.needsReview && (
          <div className="mb-3 rounded-2xl border-2 border-[var(--to)] bg-[#fff3cf] p-3 text-sm font-bold">
            ⚠️ 검토 필요: {preview.reviewReasons?.join(" ")}
          </div>
        )}

        <div className="hj-card bg-[var(--to)] px-4 py-5 text-center">
          <h1 className="font-display text-[22px]">{me.name}님의 사주풀이</h1>
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            {[
              `${yy}년 ${mm}월 ${dd}일`,
              me.calendar === "lunar" ? "음력" : "양력",
              me.time ?? "시간 모름",
              me.gender === "f" ? "여성" : "남성",
              "본인",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border-2 border-[var(--line)] bg-[#fffaf0] px-2.5 py-0.5 text-xs font-extrabold"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {concern.trim() && (
          <div className="relative mt-5 rounded-md border-2 border-dashed border-[var(--ink-soft)] bg-[#fffdf5] p-4">
            <span className="absolute -top-2.5 left-4 rotate-[-2deg] rounded bg-[var(--stamp)] px-2 py-0.5 text-[11px] font-extrabold text-white">
              내가 적어둔 고민
            </span>
            <p className="mt-1 whitespace-pre-wrap text-[15px]">{concern}</p>
          </div>
        )}

        {verdict && (
          <div className="hj-card relative mt-3 bg-[var(--su)] px-4 pb-4 pt-5 text-[#fffaf0]">
            <span
              className="font-display absolute -right-2 -top-3 flex h-14 w-14 rotate-12 items-center justify-center rounded-full border-[3px] border-[var(--stamp)] bg-[#fffaf0] text-[var(--stamp)]"
              aria-hidden
            >
              점괘
            </span>
            <p className="text-xs font-bold text-[#cfcbe0]">
              오행 친구의 한 줄 판정 · 고민 분류 &lsquo;{verdict.category}
              &rsquo;
            </p>
            <p className="font-display mt-1 pr-10 text-[24px] leading-tight">
              {verdict.headline}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#e6e2f3]">
              {verdict.text}
            </p>
            <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
              <p className="font-extrabold text-[var(--to)]">이번 주 해볼 일</p>
              <ul className="mt-1 space-y-0.5">
                {verdict.todo.map((t) => (
                  <li key={t}>☐ {t}</li>
                ))}
              </ul>
            </div>
            <Basis items={verdict.basis} />
            <p className="mt-2 text-[10px] text-[#a9a5c0]">
              고민 글자에서 키워드를 찾아 분류한 재미용 점괘예요. 중요한 결정은
              스스로의 판단이 먼저예요.
            </p>
          </div>
        )}

        <div
          className="hj-card relative mt-4 overflow-hidden px-4 pb-4 pt-5"
          style={{ background: info.tint }}
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/50" />
          <p className="text-[11px] font-extrabold text-[var(--stamp)]">
            나의 오행 친구 · 일간 {preview.pillars.day.hanja.charAt(0)}(
            {EL_WORD[rd.dayEl]})
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Friend
              kind={rd.friend}
              accessory="sunglasses"
              size={104}
              className="bob shrink-0"
            />
            <div>
              <p className="font-display text-[26px] leading-none">
                {info.name}
              </p>
              <p className="mt-1 text-sm font-bold">
                {info.role} · {rd.image}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">{rd.trait}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const r = await shareCard(
                {
                  kind: rd.friend,
                  title: rd.image,
                  sub: `${EL_HANJA[rd.dayEl]} ${EL_WORD[rd.dayEl]}의 기운`,
                  name: me.name,
                  url: location.origin,
                },
                `${text} ${location.origin}`,
              );
              setMsg(
                r === "shared"
                  ? ""
                  : r === "downloaded"
                    ? "카드 이미지를 저장했어요"
                    : "공유에 실패했어요. 다시 눌러주세요",
              );
            }}
            className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[#fffaf0] py-2.5 text-[15px] shadow-[3px_3px_0_var(--line)]"
          >
            내 오행 친구 카드 공유하기
          </button>
          {msg && (
            <p role="status" className="mt-2 text-center text-xs font-bold">
              {msg}
            </p>
          )}
        </div>

        <ManseTable pillars={preview.pillars} />
        <ManseExtra me={me} pillars={preview.pillars} />

        <section
          className="mt-4 hj-card bg-[#fffaf0] p-4"
          aria-label="오행 막대"
        >
          <p className="font-display text-lg">다섯 기운</p>
          {ELEMENTS.map((k) => (
            <div key={k} className="my-1.5 flex items-center gap-2">
              <span className="w-14 text-sm font-bold">
                {k} {EL_WORD[k]}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[#fffdf5]">
                <div
                  className="h-full"
                  style={{
                    width: `${(rd.counts[k] / total) * 100}%`,
                    background: EL_BG[k],
                  }}
                />
              </div>
              <span className="w-4 text-right text-sm font-bold">
                {rd.counts[k]}
              </span>
            </div>
          ))}
        </section>

        <h2 className="font-display mt-7 px-1 text-xl">오행 친구의 풀이</h2>
        {rd.sections.map((s, i) => (
          <Fold
            key={s.id}
            open={i === 0}
            eyebrow={s.eyebrow}
            title={s.title}
            friend={s.friend}
            summary={s.summary}
          >
            {s.body.map((b) => (
              <p key={b}>{b}</p>
            ))}
            <Basis items={s.basis} />
          </Fold>
        ))}

        <Locked
          eyebrow="연애운"
          title="내 사주 속 인연의 결"
          teaser="일지와 월지의 기운으로 연애의 속도와 어울리는 상대의 결을 더 깊게 읽을 수 있어요."
          price="1닢"
        />
        <Locked
          eyebrow="재물복"
          title="돈이 붙는 방식"
          teaser="오행의 균형으로 돈을 모으는 방식과 새는 구멍을 더 깊게 읽을 수 있어요."
          price="1닢"
        />

        <div className="hj-card mt-5 bg-[#dfe9f7] p-4">
          <p className="font-display text-lg">내 고민, 더 깊게 풀어볼까요?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            연애운·재물복에 올해 흐름까지 풀어주는 기본 사주 풀이는 준비
            중이에요.
          </p>
          <button
            type="button"
            disabled
            className="font-display mt-3 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[#cfc9c0] py-3 text-[#6b5f70]"
          >
            기본 사주 풀이 · 준비 중
          </button>
        </div>
        <div className="hj-card mt-3 bg-[#fbd9d4] p-4">
          <p className="font-display text-lg">친구랑 오행 케미도 볼래요?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            링크를 보내면 친구가 자기 정보를 넣고 바로 우리 궁합을 봐요.
          </p>
          <Link
            to="/compat"
            className="font-display mt-3 block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-2.5 text-center text-white shadow-[3px_3px_0_var(--line)]"
          >
            궁합 보러 가기
          </Link>
        </div>
        <div className="hj-card mt-3 bg-[#d3ead9] p-4">
          <p className="font-display text-lg">내일도 복주머니 열어볼래요?</p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            하루 한 번 공짜. 연속으로 열면 도장이 쌓여요.
          </p>
          <Link
            to="/today"
            className="font-display mt-3 block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] py-2.5 text-center shadow-[3px_3px_0_var(--line)]"
          >
            오늘의 복주머니 열기
          </Link>
        </div>

        <p className="mt-5 px-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          계산: {preview.source} · 엔진 {preview.engineVersion} ·{" "}
          {preview.clockPolicy}
          <br />
          {preview.accuracyNote}
          <br />
          풀이 문장은 오행 개수와 상생·상극 관계만 쓰는 재미용 해석이에요.
          격국·용신 같은 판정은 검증 전이라 쓰지 않아요.
        </p>
      </section>
    </Page>
  );
}
