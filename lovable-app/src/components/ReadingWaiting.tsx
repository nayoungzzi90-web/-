import { useEffect, useState } from "react";

// 풀이를 기다리는 동안 보여 주는 화면: 오행 친구들이 돌아가며 나오고, 궁금증을 키우는 한 줄과 오행 상식을 보여 준다.
// 진행률은 거짓 숫자 대신 "작성 중" 표시(막대는 움직임만)로 둔다.
const FRIENDS = ["🌳", "🔥", "⛰️", "⚔️", "🌊"];
const TEASERS = [
  "태어난 날의 기운을 한 글자씩 읽고 있어요",
  "내 안의 숨은 강점을 찾는 중이에요",
  "나와 닮은 오행 친구를 불러오는 중…",
  "올해 나에게 어울리는 흐름을 살펴보고 있어요",
  "마음속 고민에 맞는 이야기를 고르는 중이에요",
  "거의 다 됐어요. 조금만 기다려 주세요",
];
const FACTS = [
  "나무(목)는 봄, 불(화)은 여름, 흙(토)은 계절이 바뀌는 때, 쇠(금)는 가을, 물(수)은 겨울의 기운이에요.",
  "오행에는 좋고 나쁨이 없어요. 내가 자주 쓰는 기운과 덜 쓰는 기운을 알려 주는 지도예요.",
  "같은 나무라도 큰 소나무와 담쟁이 넝쿨은 성격이 아주 달라요. 그래서 사람마다 풀이가 달라져요.",
  "물이 없는 사주라면 산책이나 물 마시기 같은 작은 습관이 균형을 잡아 줄 수 있어요.",
  "내 사주에 없는 기운은 약점이 아니라 '의식적으로 챙기면 좋은 부분'이에요.",
];

export function ReadingWaiting({ intervalMs = 3200 }: { intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return (
    <div className="card-hanji mt-4 p-6 text-center" role="status" aria-live="polite">
      <p className="text-5xl motion-safe:animate-bounce" aria-hidden="true">
        {FRIENDS[i % FRIENDS.length]}
      </p>
      <p className="mt-3 font-serif text-lg font-bold">{TEASERS[i % TEASERS.length]}</p>
      <div
        className="mx-auto mt-4 h-2 w-40 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div className="h-2 w-1/3 rounded-full bg-primary motion-safe:animate-pulse" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">풀이를 쓰는 중이에요</p>
      <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        💡 {FACTS[i % FACTS.length]}
      </p>
    </div>
  );
}
