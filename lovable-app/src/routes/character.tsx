import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";
import { shareText, shareUrl } from "@/lib/share";
import { renderShareCard } from "@/lib/share-card";
import type { Element, SajuPreview } from "@/lib/saju";

export const Route = createFileRoute("/character")({
  head: () => ({
    meta: [
      { title: "나의 오행 캐릭터 — 오행 친구들" },
      { name: "description", content: "일간으로 찾은 나만의 민화 캐릭터와 사주 4주." },
      { property: "og:title", content: "나의 오행 캐릭터" },
      { property: "og:description", content: "나를 닮은 오행 친구를 확인해 보세요." },
    ],
  }),
  component: CharacterPage,
});

const TONE = {
  teal: "bg-teal",
  vermilion: "bg-vermilion",
  gold: "bg-gold",
  indigo: "bg-indigo",
  muted: "bg-secondary",
};
const EL_COLOR: Record<Element, string> = {
  목: "bg-teal",
  화: "bg-vermilion",
  토: "bg-gold",
  금: "bg-muted-foreground",
  수: "bg-indigo",
};

export function SajuResult({ p, me }: { p: SajuPreview; me: { name: string } }) {
  const pillars = p.pillars!;
  const elements = p.elements!;
  const c = characterFor(pillars.day.stem, elements);
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  const { inviteCode } = useStore();
  const text = shareText(c);
  const PILLAR_LABEL: [string, { hanja: string; ko: string } | null][] = [
    ["연주", pillars.year],
    ["월주", pillars.month],
    ["일주", pillars.day],
    ["시주", pillars.hour],
  ];
  return (
    <>
      {p.calendarConversion && (
        <div className="mt-3 rounded-2xl border border-border bg-card p-3 text-xs">
          입력 음력 {p.calendarConversion.originalDate} (
          {p.calendarConversion.isLeapMonth ? "윤달" : "평달"}) → 양력{" "}
          {p.calendarConversion.convertedSolarDate}
          <span className="block text-[11px] text-muted-foreground">
            변환: {p.calendarConversion.sourceName} · 공식 기관 실시간 대조 전(검토용)
          </span>
        </div>
      )}
      {p.needsReview && (
        <div className="mt-3 rounded-2xl border border-gold bg-gold/10 p-4 text-sm">
          ⚠️ 검토 필요: {p.reviewReasons?.join(" ")}
        </div>
      )}
      {/* 공유 카드: 출생일·시각 미노출 */}
      <div className="card-hanji mt-3 overflow-hidden text-center">
        <div className={`${TONE[c.tone]} py-8`}>
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-card text-7xl shadow-lg">
            {c.emoji}
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground">
            일주 {pillars.day.ko} · {c.element}의 기운
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold">
            {c.epithet} <span className="text-primary">{c.name}</span>
          </h1>
          <p className="mt-2 text-sm">{c.personality}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ※ 캐릭터·칭호·성격 설명은 재미를 위한 창작 표현이에요.
          </p>
        </div>
      </div>
      <Section title="사주 4주">
        <div className="grid grid-cols-4 gap-2 text-center">
          {PILLAR_LABEL.map(([label, pl]) => (
            <div key={label} className="rounded-xl border border-border bg-card py-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-1 font-serif text-lg font-bold">{pl ? pl.ko : "미상"}</p>
              <p className="text-[11px] text-muted-foreground">{pl ? "\u00a0" : "시간 모름"}</p>
            </div>
          ))}
        </div>
        {!pillars.hour && (
          <p className="mt-2 text-xs text-muted-foreground">
            출생 시간 미상: 시주는 추측하지 않고 3주(6글자)만 계산했어요.
          </p>
        )}
      </Section>
      <Section title={`오행 분포 (${p.charCount}글자 기준)`}>
        {(Object.keys(elements) as Element[]).map((k) => (
          <div key={k} className="my-1.5 flex items-center gap-2">
            <span className="w-6 font-serif">{k}</span>
            <div className="h-3 flex-1 rounded-full bg-muted">
              <div
                className={`h-3 rounded-full ${EL_COLOR[k]}`}
                style={{ width: `${(elements[k] / total) * 100}%` }}
              />
            </div>
            <span className="w-4 text-right text-xs">{elements[k]}</span>
          </div>
        ))}
      </Section>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        계산: {p.source} · 엔진 {p.engineVersion} · {p.clockPolicy}
        <br />
        {p.accuracyNote}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="rounded-full border border-primary py-3 font-bold text-primary"
          onClick={async () => {
            const url = shareUrl(location.origin, inviteCode);
            try {
              // 카드 이미지를 파일로 공유할 수 있으면 이미지와 함께, 아니면 문구+링크만
              const blob = await renderShareCard(c).catch(() => null);
              const file = blob
                ? new File([blob], "ohaeng-friend.png", { type: "image/png" })
                : null;
              if (file && navigator.canShare?.({ files: [file] }))
                await navigator.share({ files: [file], text: `${text} ${url}` });
              else if (navigator.share) await navigator.share({ text, url });
              else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                toast("문구와 링크를 복사했어요");
              }
            } catch {
              /* 사용자가 공유를 닫은 경우 등 */
            }
          }}
        >
          공유하기
        </button>
        <Link
          to="/today"
          className="rounded-full bg-primary py-3 text-center font-bold text-primary-foreground"
        >
          오늘의 운세
        </Link>
      </div>
    </>
  );
}

function CharacterPage() {
  const { me } = useStore();
  const q = useQuery({
    queryKey: ["saju", me],
    queryFn: () => getSajuPreview({ data: me! }),
    enabled: !!me,
  });
  if (!me)
    return (
      <Shell title="캐릭터">
        <NeedBirth />
      </Shell>
    );
  if (q.isLoading) {
    return (
      <Shell title="캐릭터">
        <div className="card-hanji mt-3 p-8 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-3 font-serif">만세력을 계산하고 있어요…</p>
        </div>
      </Shell>
    );
  }
  const p = q.data;
  if (!p || !p.ok) {
    return (
      <Shell title="캐릭터">
        <div className="card-hanji mt-3 p-6 text-center">
          <p className="text-4xl">🚧</p>
          <p className="mt-3 font-serif text-lg">아직 지원하지 않는 입력이에요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {p?.error ?? "계산에 문제가 생겼어요. 다시 시도해 주세요."}
          </p>
          <Link
            to="/input"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
          >
            다시 입력하기
          </Link>
        </div>
      </Shell>
    );
  }
  return (
    <Shell title="캐릭터">
      <MockBadge />
      <SajuResult p={p} me={me} />
    </Shell>
  );
}
