import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Cloud } from "@/components/minhwa/Scene";
import { EL_CELL, FRIENDS, KIND_BY_ELEMENT } from "@/components/minhwa/data";
import {
  CoinIcon,
  FriendImg,
  MhButton,
  MhHeader,
  MhTabBar,
} from "@/components/minhwa/ui";
import {
  buildReading,
  branchElement,
  stemElement,
  EL_WORD,
} from "@/lib/reading";
import { computeDaeunForBirth } from "@/lib/daeun";
import { previewFromBirthInput } from "@/lib/saju-engine";
import type { BirthInput } from "@/lib/saju";
import { useStore } from "@/lib/store";

// 시안 ③ 무료 결과 화면 복원. 값은 실제 계산 엔진 결과이고, 입력이 없으면 샘플(1990-05-15 14:30)을 쓴다.
// 시안의 십성 라벨(비견·정인 등)은 검증 전 규칙이라 쓰지 않고, 칸 아래에는 오행 이름만 적는다.
export const Route = createFileRoute("/restore/result")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "시안 복원 · 결과" },
    ],
  }),
  component: RestoreResult,
});

const SAMPLE: BirthInput = {
  name: "샘플",
  calendar: "solar",
  leap: false,
  date: "1990-05-15",
  time: "14:30",
  gender: "f",
};

function RestoreResult() {
  const { me } = useStore();
  const input = me ?? SAMPLE;
  const isSample = !me;
  const preview = useMemo(() => previewFromBirthInput(input), [input]);
  const rd = useMemo(
    () => buildReading(preview, new Date(), computeDaeunForBirth(input)),
    [preview, input],
  );

  if (!preview.ok || !preview.pillars || !rd)
    return (
      <div className="skin-minhwa mh-paper min-h-screen">
        <MhHeader title="내 사주 원국" coins={0} />
        <p role="alert" className="p-6 text-center">
          {preview.error ?? "계산할 수 없어요."}
        </p>
      </div>
    );

  const kind = KIND_BY_ELEMENT[rd.dayEl];
  const f = FRIENDS[kind];
  const cols = [
    { label: "시주", p: preview.pillars.hour },
    { label: "일주", p: preview.pillars.day, me: true },
    { label: "월주", p: preview.pillars.month },
    { label: "연주", p: preview.pillars.year },
  ];

  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md">
        <MhHeader title="내 사주 원국" coins={0} />

        {/* 일주 요약 카드 */}
        <section
          className="relative mx-3 mt-2 overflow-hidden rounded-[22px] border-2 bg-[#fbf1da] px-4 py-4 shadow-[0_3px_0_rgba(160,120,70,0.25)]"
          style={{ borderColor: "#c9a76e" }}
        >
          <svg
            className="pointer-events-none absolute right-0 top-0"
            width="160"
            height="70"
            viewBox="0 0 160 70"
            aria-hidden
          >
            <circle cx="110" cy="30" r="22" fill="#f7cf6a" opacity="0.85" />
            <Cloud x={70} y={26} s={1.2} />
          </svg>
          <div className="relative flex items-center gap-3">
            <FriendImg kind={kind} height={112} />
            <div className="min-w-0">
              <p
                className="text-[14px] font-extrabold"
                style={{ color: f.color }}
              >
                나의 일주
              </p>
              <p className="mh-title text-[30px] leading-tight">
                {preview.pillars.day.hanja}{" "}
                <span className="text-[20px]">{preview.pillars.day.ko}</span>
              </p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--mh-ink-soft)]">
                {f.name}({f.element} {f.hanja}) · {rd.image}. {rd.trait}.
              </p>
            </div>
          </div>
        </section>

        {/* 사주 원국표 */}
        <section className="mh-card mx-3 mt-4 px-3 pb-3 pt-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="mh-title text-[22px]">사주 원국표</h2>
            <span className="text-[12px] text-[var(--mh-ink-soft)]">
              {isSample
                ? "샘플 데이터"
                : `${input.date.replace(/-/g, ".")}${input.time ? ` ${input.time}` : " (시간 모름)"}`}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {cols.map((c) => (
              <p
                key={c.label}
                className="text-[14px] font-bold"
                style={{ color: c.me ? "var(--mh-red)" : "var(--mh-ink)" }}
              >
                {c.label}
              </p>
            ))}
            {(["stem", "branch"] as const).map((row) =>
              cols.map((c) => {
                if (!c.p)
                  return (
                    <div
                      key={c.label + row}
                      className="flex h-[92px] items-center justify-center rounded-[14px] border-2 border-dashed text-[12px] text-[var(--mh-ink-soft)]"
                      style={{ borderColor: "var(--mh-line)" }}
                    >
                      시간 모름
                    </div>
                  );
                const el =
                  row === "stem"
                    ? stemElement(c.p.stem)
                    : branchElement(c.p.branch);
                const hanja =
                  row === "stem" ? c.p.hanja.charAt(0) : c.p.hanja.charAt(1);
                const cell = EL_CELL[el];
                return (
                  <div
                    key={c.label + row}
                    className="flex h-[92px] items-center justify-center rounded-[14px] border-2"
                    style={{
                      background: cell.bg,
                      color: cell.fg,
                      borderColor:
                        c.me && row === "stem"
                          ? "var(--mh-red)"
                          : "rgba(43,35,32,0.25)",
                      boxShadow:
                        c.me && row === "stem"
                          ? "0 0 0 2px var(--mh-red)"
                          : undefined,
                    }}
                  >
                    <span className="mh-title text-[44px] leading-none">
                      {hanja}
                    </span>
                  </div>
                );
              }),
            )}
            {cols.map((c) => (
              <p
                key={c.label + "n"}
                className="text-[13px] text-[var(--mh-ink-soft)]"
              >
                {c.p
                  ? `${EL_WORD[stemElement(c.p.stem)]}·${EL_WORD[branchElement(c.p.branch)]}`
                  : "-"}
              </p>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-[var(--mh-ink-soft)]">
            위 줄은 하늘 글자(천간), 아래 줄은 땅 글자(지지)예요. 칸 색은
            오방색: 목 청록, 화 적, 토 황, 금 백, 수 쪽빛.
          </p>
        </section>

        <div className="mx-3 mt-5">
          <MhButton disabled icon={<CoinIcon size={26} />}>
            전체 풀이 준비 중
          </MhButton>
          <p className="mt-2 text-center text-[14px] text-[var(--mh-ink-soft)]">
            내 엽전 0닢 ·{" "}
            <Link
              to="/restore/charge"
              className="font-bold text-[var(--mh-indigo)] underline"
            >
              충전하기 ›
            </Link>
          </p>
        </div>
      </div>
      <MhTabBar active="box" />
    </div>
  );
}
