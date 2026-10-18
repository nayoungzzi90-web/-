import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, NeedBirth, MockBadge, Section } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { getSajuPreview } from "@/lib/saju-fns";
import { characterFor } from "@/lib/characters";
import { dayOfYearKst, kstToday } from "@/lib/saju";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "오늘의 운세 — 오행 친구들" }, { name: "description", content: "한국 시간 기준 오늘의 흐름과 일·재물·관계 조언." }, { property: "og:title", content: "오늘의 운세 — 오행 친구들" }, { property: "og:description", content: "매일 바뀌는 오행 친구의 한 줄 조언" }] }),
  component: TodayPage,
});

// 아래 문구들은 재미를 위한 창작 콘텐츠 (명리 해석 아님)
const FLOW = ["잔잔한 물결처럼 차분히 흘러가는 날", "봄볕이 드는 듯 기운이 오르는 날", "한 박자 쉬어가면 복이 오는 날", "작은 인연이 큰 기쁨이 되는 날", "정리하고 다듬기 좋은 날"];
const WORK = ["미뤄둔 일을 하나만 끝내 보세요.", "회의에서 먼저 의견을 내면 좋아요.", "꼼꼼한 확인이 실수를 막아줘요."];
const MONEY = ["충동구매는 내일로 미뤄요.", "작은 저축이 든든한 날이에요.", "선물에 쓰는 돈은 아깝지 않아요."];
const LOVE = ["먼저 안부 문자를 보내 보세요.", "경청이 최고의 대화가 돼요.", "고마움을 말로 표현해 보세요."];
const ACT = ["따뜻한 차 한 잔 마시기", "10분 산책하기", "책상 정리하기", "좋아하는 노래 듣기"];

function TodayPage() {
  const { me } = useStore();
  const q = useQuery({ queryKey: ["saju", me], queryFn: () => getSajuPreview({ data: me! }), enabled: !!me });
  if (!me) return <Shell title="오늘운세"><NeedBirth /></Shell>;
  if (q.isLoading) return <Shell title="오늘운세"><div className="card-hanji mt-3 p-8 text-center"><p className="text-4xl">⏳</p><p className="mt-3 font-serif">만세력을 계산하고 있어요…</p></div></Shell>;
  const p = q.data;
  if (!p || !p.ok || !p.pillars || !p.elements) {
    return <Shell title="오늘운세"><div className="card-hanji mt-3 p-6 text-center"><p className="text-4xl">🚧</p><p className="mt-3 font-serif text-lg">아직 지원하지 않는 입력이에요</p><p className="mt-1 text-sm text-muted-foreground">{p?.error}</p></div></Shell>;
  }
  const c = characterFor(p.pillars.day.stem, p.elements);
  const day = kstToday();
  // 같은 날·같은 일간이면 같은 문구 (창작 콘텐츠 회전, 사주 해석 아님)
  const pick = (dayOfYearKst(day) + p.pillars.day.stem);
  const at = (arr: string[], salt: number) => arr[(pick + salt) % arr.length]!;
  return (
    <Shell title="오늘운세">
      <MockBadge />
      <div className="card-hanji mt-3 p-5 text-center">
        <p className="text-xs text-muted-foreground">{day} (한국 기준)</p>
        <p className="mt-2 text-5xl">{c.emoji}</p>
        <h1 className="mt-2 font-serif text-xl font-bold">{at(FLOW, 0)}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">※ 오늘의 문구는 재미를 위한 창작 콘텐츠예요.</p>
      </div>
      <Section title="💼 일">{at(WORK, 1)}</Section>
      <Section title="🪙 재물">{at(MONEY, 2)}</Section>
      <Section title="🤝 관계">{at(LOVE, 3)}</Section>
      <Section title="🍀 오늘의 작은 행동">{at(ACT, 4)}</Section>
    </Shell>
  );
}
