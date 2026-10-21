import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { Paywall } from "@/components/Paywall";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";
import type { Element } from "@/lib/saju";
import { PRODUCTS, won } from "@/lib/coins";

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

const ADVICE: Record<Element, string> = {
  목: "초록 식물과 아침 산책이 기운을 북돋아요.",
  화: "햇볕과 웃음, 따뜻한 색이 힘이 돼요.",
  토: "규칙적인 식사와 정리정돈이 중심을 잡아줘요.",
  금: "맺고 끊음, 깔끔한 계획이 행운을 불러요.",
  수: "충분한 수면과 독서가 지혜를 채워요.",
};

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
  const els = Object.entries(p.elements) as [Element, number][];
  const weak = [...els].sort((a, b) => a[1] - b[1])[0]![0];
  const strong = [...els].sort((a, b) => b[1] - a[1])[0]![0];
  return (
    <Shell title="기본사주">
      <MockBadge />
      <h1 className="mt-3 font-serif text-xl font-bold">{me.name}님의 기본 사주</h1>
      <Section title="일간">
        {p.pillars.day.hanja}({p.pillars.day.ko}) · {c.element} — {c.personality}{" "}
        <span className="text-[11px] text-muted-foreground">(성격 설명은 창작 표현)</span>
      </Section>
      <Paywall
        id="basic"
        label={PRODUCTS.basic.label}
        price={won(PRODUCTS.basic.coins)}
        coins={PRODUCTS.basic.coins}
      >
        <Section title="가장 강한 기운">
          {strong}의 기운이 두드러져요. 이 힘을 장점으로 쓰면 주변의 신뢰를 얻어요.
        </Section>
        <Section title="채우면 좋은 기운">
          {weak}의 기운이 상대적으로 약해요. {ADVICE[weak]}
        </Section>
        <Section title="근거">
          일간 {p.pillars.day.hanja} 및 오행 개수 분포({p.charCount}글자)를 바탕으로 한 규칙형
          풀이입니다. 엔진 {p.engineVersion}, 검증 진행 중.
        </Section>
      </Paywall>
    </Shell>
  );
}
