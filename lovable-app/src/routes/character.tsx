import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";
import { shareText, shareUrl } from "@/lib/share";
import { renderShareCard } from "@/lib/share-card";
import { Friend, FRIEND_INFO, type FriendKind } from "@/components/Friends";
import { ResultSection } from "@/components/ResultSection";
import { EL_HANJA, EL_PLAIN, elementSentence, pillarParts, stemElement } from "@/lib/pillar-view";
import type { BirthInput, Element, Pillar, SajuPreview } from "@/lib/saju";

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

const EL_FRIEND: Record<Element, FriendKind> = {
  목: "seonbi",
  화: "ssi",
  토: "tiger",
  금: "rabbit",
  수: "turtle",
};
const CELL: Record<Element, string> = {
  목: "bg-teal text-white",
  화: "bg-vermilion text-white",
  토: "bg-gold text-foreground",
  금: "bg-[#e8e6ea] text-foreground",
  수: "bg-indigo text-white",
};

function birthChips(me: BirthInput): string[] {
  const [y, m, d] = me.date.split("-");
  return [
    `${y}년 ${m}월 ${d}일`,
    me.calendar === "lunar" ? "음력" : "양력",
    me.time ?? "시간 모름",
    me.gender === "f" ? "여성" : "남성",
    "본인",
  ];
}

export function SajuResult({ p, me }: { p: SajuPreview; me: BirthInput }) {
  const pillars = p.pillars!;
  const elements = p.elements!;
  const c = characterFor(pillars.day.stem, elements);
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  const { inviteCode, concern } = useStore();
  const text = shareText(c);
  const dayEl = stemElement(pillars.day.stem);
  const friend = FRIEND_INFO[EL_FRIEND[dayEl]];
  const COLUMNS: [string, Pillar | null, boolean][] = [
    ["시주", pillars.hour, false],
    ["일주", pillars.day, true],
    ["월주", pillars.month, false],
    ["연주", pillars.year, false],
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

      {/* 제목 띠: 이름과 입력한 출생 정보 */}
      <div className="card-hanji mt-3 bg-gold p-4 text-center">
        <h1 className="font-serif text-xl font-bold">{me.name}님의 사주풀이</h1>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {birthChips(me).map((t) => (
            <span
              key={t}
              className="rounded-full border-2 border-[#2b1d2e] bg-card px-2.5 py-0.5 text-[11px] font-bold"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {concern && (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-border bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground">내가 입력한 고민</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{concern}</p>
        </div>
      )}

      {/* 나의 오행 친구 */}
      <div className="card-hanji mt-3 flex items-center gap-4 bg-[#fbe9c2] p-4">
        <Friend kind={EL_FRIEND[dayEl]} size={96} className="shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-primary">나의 오행 친구</p>
          <p className="font-serif text-xl font-bold">
            {friend.name} <span className="text-sm">· {friend.role}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {EL_HANJA[dayEl]} {EL_PLAIN[dayEl]}의 기운 · 일주 {pillars.day.hanja} {pillars.day.ko}
          </p>
        </div>
      </div>

      {/* 만세력 표 */}
      <section className="card-hanji mt-3 overflow-hidden" aria-label="만세력">
        <h2 className="bg-teal py-2 text-center font-serif text-base font-bold text-white">
          만세력
        </h2>
        <div className="grid grid-cols-4 gap-px bg-border text-center">
          {COLUMNS.map(([label, pl, mine]) => (
            <p
              key={label}
              className={`bg-muted py-1.5 text-[11px] ${mine ? "font-bold text-primary" : "text-muted-foreground"}`}
            >
              {label}
              {mine ? " · 나" : ""}
            </p>
          ))}
          {(["stem", "branch"] as const).map((row) =>
            COLUMNS.map(([label, pl]) => {
              if (!pl)
                return (
                  <div
                    key={`${row}-${label}`}
                    className="flex h-20 items-center justify-center bg-card text-[11px] text-muted-foreground"
                  >
                    시간 모름
                  </div>
                );
              const g = pillarParts(pl)[row];
              return (
                <div
                  key={`${row}-${label}`}
                  className={`flex h-20 flex-col items-center justify-center ${CELL[g.element]}`}
                >
                  <span className="font-serif text-3xl font-bold leading-none">{g.hanja}</span>
                  <span className="mt-1 text-[11px] opacity-90">
                    {g.ko} · {EL_PLAIN[g.element]}
                  </span>
                </div>
              );
            }),
          )}
        </div>
        <p className="p-3 text-[11px] leading-relaxed text-muted-foreground">
          위 줄은 하늘 글자(천간), 아래 줄은 땅 글자(지지)예요. 칸 색은 글자의 오행이에요: 나무
          청록, 불 붉은색, 흙 황금, 쇠 회색, 물 남색.
          {!pillars.hour && " 출생 시간 미상: 시주는 추측하지 않고 6글자만 계산했어요."}
        </p>
      </section>

      <ResultSection eyebrow="한마디로" title={`${c.epithet} ${c.name}`} defaultOpen>
        <p>{c.personality}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 캐릭터·칭호·성격 설명은 재미를 위한 창작 표현이에요.
        </p>
      </ResultSection>

      <ResultSection eyebrow="오행으로 보는 사주" title={`${p.charCount}글자 속 다섯 기운`}>
        <p className="mb-2">{elementSentence(elements)}</p>
        {(Object.keys(elements) as Element[]).map((k) => (
          <div key={k} className="my-1.5 flex items-center gap-2">
            <span className="w-14 font-serif text-xs">
              {k} {EL_PLAIN[k]}
            </span>
            <div className="h-3 flex-1 rounded-full bg-muted">
              <div
                className={`h-3 rounded-full ${EL_COLOR[k]}`}
                style={{ width: `${(elements[k] / total) * 100}%` }}
              />
            </div>
            <span className="w-4 text-right text-xs">{elements[k]}</span>
          </div>
        ))}
      </ResultSection>

      <ResultSection eyebrow="일주 이야기" title={`${pillars.day.hanja} ${pillars.day.ko} 일주`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {c.emoji}
          </span>
          <p>
            태어난 날의 하늘 글자는 {pillars.day.hanja.slice(0, 1)}({EL_PLAIN[dayEl]})이에요. 이
            글자가 &lsquo;나 자신&rsquo;을 대표해서, 일간 캐릭터는 <b>{c.name}</b>
            이에요.
          </p>
        </div>
      </ResultSection>

      <ResultSection eyebrow="나만의 매력" title="이런 점이 빛나요">
        <ul className="flex flex-wrap gap-2">
          {c.strengths.map((t) => (
            <li
              key={t}
              className="rounded-full border-2 border-[#2b1d2e] bg-[#e3f2ea] px-3 py-1 text-xs font-bold"
            >
              {t}
            </li>
          ))}
        </ul>
      </ResultSection>

      <ResultSection eyebrow="쓴소리 좀 할게" title="이런 점은 조심해요">
        <ul className="flex flex-wrap gap-2">
          {c.weaknesses.map((t) => (
            <li
              key={t}
              className="rounded-full border-2 border-[#2b1d2e] bg-[#fde4e1] px-3 py-1 text-xs font-bold"
            >
              {t}
            </li>
          ))}
        </ul>
      </ResultSection>

      <div className="card-hanji mt-3 bg-[#e6e4fa] p-4 text-sm leading-relaxed">
        <p className="font-serif font-bold">더 자세한 풀이가 궁금하다면</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {concern
            ? "적어주신 고민은 AI 풀이가 열리면 풀이에 반영돼요. 지금은 규칙으로 만든 기본 풀이를 볼 수 있어요."
            : "엽전 1닢으로 기본 사주 풀이를 볼 수 있어요."}
        </p>
        <Link
          to="/basic"
          className="mt-3 block rounded-full border-2 border-[#2b1d2e] bg-primary py-2.5 text-center font-bold text-primary-foreground shadow-[3px_3px_0_#2b1d2e]"
        >
          기본 사주 풀이 보기
        </Link>
      </div>

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
