import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { ReadingBlock } from "@/components/ReadingBlock";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";

export const Route = createFileRoute("/basic")({
  head: () => ({
    meta: [
      { title: "기본 사주 풀이 — 오행 친구들" },
      { name: "description", content: "일간과 오행 균형으로 보는 나의 기본 성향과 조언." },
      { property: "og:title", content: "기본 사주 풀이 — 오행 친구들" },
      { property: "og:description", content: "오행 균형으로 보는 나의 기본 사주" },
    ],
  }),
  component: BasicPage,
});

function BasicPage() {
  const { me } = useStore();
  const q = useQuery({
    queryKey: ["saju", me],
    queryFn: () => getSajuPreview({ data: me! }),
    enabled: !!me,
  });
  if (!me)
    return (
      <Shell title="기본사주">
        <NeedBirth />
      </Shell>
    );
  if (q.isLoading)
    return (
      <Shell title="기본사주">
        <div className="card-hanji mt-3 p-8 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-3 font-serif">만세력을 계산하고 있어요…</p>
        </div>
      </Shell>
    );
  const p = q.data;
  if (!p?.ok || !p.pillars || !p.elements) {
    return (
      <Shell title="기본사주">
        <div className="card-hanji mt-3 p-6 text-center">
          <p className="text-4xl">🚧</p>
          <p className="mt-3 font-serif text-lg">아직 지원하지 않는 입력이에요</p>
          <p className="mt-1 text-sm text-muted-foreground">{p?.error}</p>
        </div>
      </Shell>
    );
  }
  const c = characterFor(p.pillars.day.stem, p.elements);
  return (
    <Shell title="기본사주">
      <MockBadge />
      <h1 className="mt-3 font-serif text-xl font-bold">{me.name}님의 기본 사주</h1>
      <Section title="일간">
        {p.pillars.day.ko} · {c.element} — {c.personality}{" "}
        <span className="text-[11px] text-muted-foreground">(성격 설명은 창작 표현)</span>
      </Section>
      <ReadingBlock product="basic" />
    </Shell>
  );
}
