import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { Paywall } from "@/components/Paywall";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";

export const Route = createFileRoute("/love")({
  head: () => ({
    meta: [
      { title: "심층 연애운 — 오행 친구들" },
      { name: "description", content: "나의 연애 스타일, 끌리는 유형, 올해 인연의 흐름." },
      { property: "og:title", content: "심층 연애운 — 오행 친구들" },
      { property: "og:description", content: "오행 친구가 알려주는 연애운" },
    ],
  }),
  component: LovePage,
});

// 창작 콘텐츠 (명리 해석 아님)
const STYLE: Record<string, [string, string]> = {
  목: ["천천히 신뢰를 쌓는 직진형", "따뜻하게 품어주는 화·토 기운의 사람"],
  화: ["표현이 풍부한 열정형", "차분히 받아주는 토·수 기운의 사람"],
  토: ["한결같은 헌신형", "밝게 이끌어주는 화·금 기운의 사람"],
  금: ["기준이 확실한 신중형", "포근한 토·목 기운의 사람"],
  수: ["깊이 스며드는 감성형", "든든한 금·목 기운의 사람"],
};

function LovePage() {
  const { me } = useStore();
  const q = useQuery({
    queryKey: ["saju", me],
    queryFn: () => getSajuPreview({ data: me! }),
    enabled: !!me,
  });
  if (!me)
    return (
      <Shell title="연애운">
        <NeedBirth />
      </Shell>
    );
  if (q.isLoading)
    return (
      <Shell title="연애운">
        <div className="card-hanji mt-3 p-8 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-3 font-serif">만세력을 계산하고 있어요…</p>
        </div>
      </Shell>
    );
  const p = q.data;
  if (!p?.ok || !p.pillars || !p.elements) {
    return (
      <Shell title="연애운">
        <div className="card-hanji mt-3 p-6 text-center">
          <p className="text-4xl">🚧</p>
          <p className="mt-3 font-serif text-lg">아직 지원하지 않는 입력이에요</p>
          <p className="mt-1 text-sm text-muted-foreground">{p?.error}</p>
        </div>
      </Shell>
    );
  }
  const c = characterFor(p.pillars.day.stem, p.elements);
  const [style, match] = STYLE[c.element]!;
  return (
    <Shell title="연애운">
      <MockBadge />
      <h1 className="mt-3 font-serif text-xl font-bold">🌸 {c.name}의 연애운</h1>
      <Section title="연애 스타일">
        {style} <span className="text-[11px] text-muted-foreground">(창작 표현)</span>
      </Section>
      <Paywall id="love" label="심층 연애운" price="3,900원" coins={12}>
        <Section title="끌리는 인연">{match}에게 마음이 열려요.</Section>
        <Section title="연애 조언">
          나의 강점인 '{c.strengths[1]}'을 보여주고, '{c.weaknesses[0]}'은 조금 내려놓아 보세요.
        </Section>
      </Paywall>
    </Shell>
  );
}
