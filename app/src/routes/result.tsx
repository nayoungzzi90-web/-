import { useEffect, useMemo } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ManseExtra } from "@/components/ManseExtra";
import { computeDaeunForBirth } from "@/lib/daeun";
import { Locked, ManseTable, ReadingCard } from "@/components/ResultParts";
import { hangulOnly as ko } from "@/lib/hangul";
import { TtShell } from "@/components/ttotto/TtShell";
import {
  buildReading,
  buildVerdict,
  EL_WORD,
  ELEMENTS,
} from "@/lib/reading";
import { EL_BG } from "@/components/ResultParts";
import { previewFromBirthInput } from "@/lib/saju-engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/result")({ component: Result });

function Result() {
  const nav = useNavigate();
  const { me, concern, hydrated } = useStore();
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
      <TtShell title="내 사주 결과">
        <p className="py-10 text-center text-[17px]">불러오는 중…</p>
      </TtShell>
    );
  if (!preview.ok || !rd || !preview.pillars)
    return (
      <TtShell title="내 사주 결과">
        <section className="pt-6 text-center">
          <p className="text-[24px] font-extrabold">앗, 계산할 수 없었어요</p>
          <p role="alert" className="mt-2 text-[15px]">
            {preview.error}
          </p>
          <Link to="/input" className="tt-btn tt-primary mt-5">
            다시 입력하기
          </Link>
        </section>
      </TtShell>
    );

  const CHAPTER_DEF = [
    { id: "ch-me", title: "나는 어떤 사람일까", ids: ["summary", "inner", "elements", "day", "season"] },
    { id: "ch-stage", title: "인생 무대와 사랑·일·사람", ids: ["stage", "love", "work", "people"] },
    { id: "ch-now", title: "올해와 앞으로", ids: ["year", "daeun"] },
    { id: "ch-tip", title: "쓴소리와 작은 처방", ids: ["advice", "charm", "habit"] },
  ];
  const known = new Set(CHAPTER_DEF.flatMap((c) => c.ids));
  const chapters = CHAPTER_DEF.map((c, i) => ({
    id: c.id,
    title: c.title,
    items: [
      ...rd.sections.filter((s) => c.ids.includes(s.id)),
      // 새 섹션이 생겨도 빠지지 않게 마지막 장 끝에 붙인다
      ...(i === CHAPTER_DEF.length - 1 ? rd.sections.filter((s) => !known.has(s.id)) : []),
    ],
  })).filter((c) => c.items.length > 0);

  const [yy, mm, dd] = me.date.split("-");
  const total = Object.values(rd.counts).reduce((a, b) => a + b, 0);

  return (
    <TtShell title="내 사주 결과" pb="pb-12">
      <section>
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

        <div className="hj-card bg-[var(--tt-yellow)] px-4 py-5 text-center">
          <h1 className="text-[clamp(24px,6.8vw,28px)] leading-tight">{me.name}님의 사주풀이</h1>
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
                className="rounded-full border-2 border-[var(--tt-ink)] bg-white px-2.5 py-0.5 text-[13px] font-extrabold"
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
          <div className="hj-card relative mt-3 bg-[var(--tt-lavender)] px-4 pb-4 pt-5 text-[var(--tt-ink)]">
            <span
              className="font-display absolute -right-2 -top-3 flex h-14 w-14 rotate-12 items-center justify-center rounded-full border-[3px] border-[var(--tt-orange)] bg-white text-[var(--tt-orange)]"
              aria-hidden
            >
              점괘
            </span>
            <p className="text-[13px] font-bold text-[var(--tt-muted)]">
              또또의 한 줄 판정 · 고민 분류 &lsquo;{verdict.category}
              &rsquo;
            </p>
            <p className="mt-1 pr-10 font-display text-[clamp(22px,6.4vw,26px)] leading-tight">
              {ko(verdict.headline)}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed">
              {ko(verdict.text)}
            </p>
            <p className="mt-2 rounded-xl border-2 border-[var(--tt-ink)] bg-white p-3 text-[15px] leading-relaxed">
              <span className="font-extrabold text-[var(--tt-orange)]">
                이 고민에서 나는{" "}
              </span>
              {ko(verdict.personal)}
            </p>
            <div className="mt-3 rounded-xl border-2 border-[var(--tt-ink)] bg-white p-3 text-[15px]">
              <p className="font-extrabold text-[var(--tt-orange)]">이번 주 해볼 일</p>
              <ul className="mt-1 space-y-0.5">
                {verdict.todo.map((t) => (
                  <li key={t}>☐ {ko(t)}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-[12px] text-[var(--tt-muted)]">
              고민 글자에서 키워드를 찾아 분류한 재미용 점괘예요. 중요한 결정은
              스스로의 판단이 먼저예요.
            </p>
          </div>
        )}

        <ManseTable pillars={preview.pillars} />

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

        <h2 className="mt-7 px-1 text-[24px] leading-tight">또또의 풀이</h2>
        <nav
          aria-label="풀이 바로가기"
          className="mt-2 flex flex-wrap gap-1.5 px-1"
        >
          {chapters.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="inline-flex min-h-[40px] items-center rounded-full border-2 border-[var(--tt-ink)] bg-[var(--tt-yellow)] px-3 text-[14px] font-extrabold"
            >
              {i + 1}. {c.title}
            </a>
          ))}
        </nav>
        {chapters.map((c, ci) => (
          <section key={c.id} id={c.id} className="scroll-mt-4">
            <h3 className="font-display mt-6 px-1 text-[19px]">
              <span className="mr-1.5 inline-block rounded-md bg-[var(--stamp)] px-1.5 text-[14px] text-white">
                {ci + 1}
              </span>
              {c.title}
            </h3>
            {c.items.map((s) => (
              <ReadingCard
                key={s.id}
                eyebrow={ko(s.eyebrow)}
                title={ko(s.title)}
                friend={s.friend}
              >
                {s.body.map((b) => (
                  <p key={b}>{ko(b)}</p>
                ))}
              </ReadingCard>
            ))}
          </section>
        ))}

        <ManseExtra me={me} pillars={preview.pillars} />

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

        <div className="hj-card mt-5 bg-[var(--tt-blue)] p-4">
          <p className="text-[22px] font-extrabold leading-tight">친구랑 오행 케미도 볼래요?</p>
          <p className="mt-1 text-[15px] leading-snug text-[var(--tt-muted)]">링크를 보내면 친구가 자기 정보를 넣고 바로 우리 궁합을 봐요.</p>
          <Link to="/compat" className="tt-btn tt-primary mt-3">
            궁합 보러 가기
          </Link>
        </div>
        <div className="hj-card mt-3 bg-[var(--tt-yellow)] p-4">
          <p className="text-[22px] font-extrabold leading-tight">내일도 운세쿠키 열어볼래요?</p>
          <p className="mt-1 text-[15px] leading-snug text-[var(--tt-muted)]">하루에 한 번, 무료로 오늘의 운세를 뽑아요.</p>
          <Link to="/daily-cookie" className="tt-btn tt-sub mt-3">
            오늘의 운세쿠키 열기
          </Link>
        </div>
        <Link to="/" className="mt-4 flex min-h-[48px] items-center justify-center text-[16px] font-bold underline">
          다른 이야기 보러 가기
        </Link>

        <p className="mt-5 px-1 text-[12px] leading-relaxed text-[var(--tt-muted)]">
          계산: {preview.source} · 엔진 {preview.engineVersion} ·{" "}
          {preview.clockPolicy}
          <br />
          {preview.accuracyNote}
          <br />
          풀이 문장은 오행 개수, 상생·상극 관계, 올해 간지와 지금 10년 흐름의
          오행을 일간과 견준 재미용 해석이에요. 격국·용신·신강신약 같은 판정은
          검증 전이라 쓰지 않고, 십성·12운성·신살 표는 참고용이라 풀이 문장에는
          쓰지 않아요.
        </p>
      </section>
    </TtShell>
  );
}
