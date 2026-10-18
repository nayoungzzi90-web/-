import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { BirthForm } from "@/components/BirthForm";
import { Paywall } from "@/components/Paywall";
import { setStore, useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";
import type { Element } from "@/lib/saju";

export const Route = createFileRoute("/compatibility")({
  head: () => ({
    meta: [
      { title: "궁합 — 오행 친구들" },
      { name: "description", content: "두 사람의 오행 캐릭터로 보는 귀여운 궁합 풀이." },
      { property: "og:title", content: "궁합 — 오행 친구들" },
      { property: "og:description", content: "우리 둘의 오행 궁합은?" },
    ],
  }),
  component: CompatPage,
});

const STEM_ELEM: Element[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const ORDER = ["목", "화", "토", "금", "수"];
function relation(a: string, b: string) {
  const d = (ORDER.indexOf(b) - ORDER.indexOf(a) + 5) % 5;
  return [
    { s: 80, t: "같은 기운", d: "서로를 잘 이해하는 거울 같은 사이예요." },
    { s: 92, t: "서로 살려주는 상생", d: "한 사람이 다른 사람을 자연스럽게 키워줘요." },
    { s: 65, t: "조율이 필요한 상극", d: "부딪힘이 성장의 계기가 돼요. 대화가 열쇠!" },
    { s: 65, t: "조율이 필요한 상극", d: "서로 다른 속도를 존중해 주세요." },
    { s: 88, t: "도움받는 상생", d: "상대가 나에게 든든한 힘이 되어 줘요." },
  ][d]!;
}

function CompatPage() {
  const { me, partner } = useStore();
  const qMe = useQuery({
    queryKey: ["saju", me],
    queryFn: () => getSajuPreview({ data: me! }),
    enabled: !!me,
  });
  const qPartner = useQuery({
    queryKey: ["saju", partner],
    queryFn: () => getSajuPreview({ data: partner! }),
    enabled: !!partner,
  });
  if (!me)
    return (
      <Shell title="궁합">
        <NeedBirth />
      </Shell>
    );
  if (!partner)
    return (
      <Shell title="궁합">
        <h1 className="mb-4 font-serif text-xl font-bold">상대의 출생정보</h1>
        <BirthForm submitLabel="궁합 보기" onSubmit={(b) => setStore({ partner: b })} />
      </Shell>
    );
  if (qMe.isLoading || qPartner.isLoading) {
    return (
      <Shell title="궁합">
        <div className="card-hanji mt-3 p-8 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-3 font-serif">만세력을 계산하고 있어요…</p>
        </div>
      </Shell>
    );
  }
  const pa = qMe.data,
    pb = qPartner.data;
  if (!pa?.ok || !pa.pillars || !pa.elements || !pb?.ok || !pb.pillars || !pb.elements) {
    return (
      <Shell title="궁합">
        <div className="card-hanji mt-3 p-6 text-center">
          <p className="text-4xl">🚧</p>
          <p className="mt-3 font-serif text-lg">아직 지원하지 않는 입력이에요</p>
          <p className="mt-1 text-sm text-muted-foreground">{pa?.error ?? pb?.error}</p>
        </div>
      </Shell>
    );
  }
  const a = characterFor(pa.pillars.day.stem, pa.elements);
  const b = characterFor(pb.pillars.day.stem, pb.elements);
  const r = relation(STEM_ELEM[pa.pillars.day.stem]!, STEM_ELEM[pb.pillars.day.stem]!);
  return (
    <Shell title="궁합">
      <MockBadge />
      <div className="card-hanji mt-3 p-5 text-center">
        <div className="flex items-center justify-center gap-4 text-5xl">
          <span>{a.emoji}</span>
          <span className="text-2xl text-primary">♥</span>
          <span>{b.emoji}</span>
        </div>
        <p className="mt-2 text-sm">
          {a.name} × {b.name}
        </p>
        <h1 className="mt-1 font-serif text-xl font-bold">{r.t}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ※ 궁합 관계·점수는 재미를 위한 창작 표현이에요.
        </p>
      </div>
      <Section title="한 줄 궁합">{r.d}</Section>
      <Paywall id={`compat:${partner.date}`} label="궁합" price="990원" coins={4}>
        <Section title="궁합 점수">{r.s}점</Section>
        <Section title="함께하면 좋은 것">
          {a.strengths[0]}과 {b.strengths[0]}을 합치면 무엇이든 해낼 수 있어요.
        </Section>
        <Section title="조심할 점">
          {a.weaknesses[0]} vs {b.weaknesses[0]} — 서운함은 그날 바로 풀어요.
        </Section>
      </Paywall>
      <button
        className="mt-4 w-full text-sm text-muted-foreground underline"
        onClick={() => setStore({ partner: null })}
      >
        다른 사람과 보기
      </button>
    </Shell>
  );
}
