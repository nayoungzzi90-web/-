import { useEffect, useRef, useState } from "react";
import { Friend, FRIEND_INFO, type FriendKind } from "@/components/Friends";
import { estimateWait } from "@/lib/waiting-progress";

// 풀이를 기다리는 동안 보여 주는 화면: 오행 친구들이 서당 책상에서 돌아가며 나오고,
// 지난 시간으로 어림한 "예상" 진행률과 남은 시간을 보여 준다(끝나기 전에는 95%를 넘기지 않는다).
const ORDER = Object.keys(FRIEND_INFO) as FriendKind[];
const TEASERS = [
  "태어난 날의 기운을 한 글자씩 읽고 있어요",
  "오늘 들어올 귀인이 몇 분인지 세는 중이에요…",
  "내 안의 숨은 강점을 찾는 중이에요",
  "올해 나에게 어울리는 흐름을 살펴보고 있어요",
  "마음속 고민에 맞는 이야기를 고르는 중이에요",
  "거의 다 됐어요. 조금만 기다려 주세요",
];
const FACTS = [
  "나무(목)는 봄, 불(화)은 여름, 흙(토)은 계절이 바뀌는 때, 쇠(금)는 가을, 물(수)은 겨울의 기운이에요.",
  "오행에는 좋고 나쁨이 없어요. 내가 자주 쓰는 기운과 덜 쓰는 기운을 알려 주는 지도예요.",
  "같은 나무라도 큰 소나무와 담쟁이 넝쿨은 성격이 아주 달라요. 그래서 사람마다 풀이가 달라져요.",
  "사주 풀이는 정해진 미래가 아니라, 내가 자주 쓰는 힘과 덜 쓰는 힘을 알아보는 참고 지도예요.",
  "내 사주에 없는 기운은 약점이 아니라 '의식적으로 챙기면 좋은 부분'이에요.",
];

export function ReadingWaiting({
  intervalMs = 3200,
  expectedSec = 45,
}: {
  intervalMs?: number;
  /** 보통 걸리는 시간(초). 이 시간을 기준으로 예상 진행률을 어림한다. */
  expectedSec?: number;
}) {
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const { percent, remainingSec } = estimateWait(elapsed, expectedSec);
  const active = i % ORDER.length;
  return (
    <div className="card-hanji mt-4 p-5 text-center">
      <p className="font-serif text-lg font-bold leading-snug" role="status" aria-live="polite">
        {TEASERS[i % TEASERS.length]}
      </p>
      <div className="mt-4 flex items-end justify-center gap-1 rounded-2xl bg-[#fbe9c2] px-2 pt-4">
        {ORDER.map((k, n) => (
          <Friend
            key={k}
            kind={k}
            size={60}
            className={`shrink-0 transition-transform duration-500 ${n === active ? "-translate-y-2 scale-110" : ""}`}
          />
        ))}
      </div>
      <div className="-mt-1 h-4 rounded-b-2xl border-2 border-[#2b1d2e] bg-[#b98a52]" aria-hidden />
      <div className="mt-5 flex items-center gap-3">
        <div
          className="h-3 flex-1 overflow-hidden rounded-full border-2 border-[#2b1d2e] bg-[#e3d6bd]"
          role="progressbar"
          aria-label="예상 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-bold">{percent}%</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {remainingSec === null
          ? "예상보다 조금 더 걸리고 있어요. 조금만 더 기다려 주세요"
          : `예상 남은 시간: 약 ${remainingSec}초 (어림한 값이에요)`}
      </p>
      <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        💡 {FACTS[i % FACTS.length]}
      </p>
      <p className="mt-3 rounded-xl border border-border p-3 text-left text-xs leading-relaxed">
        <b className="text-primary">3분이 지나도 안 끝나나요?</b>
        <br />
        먼저 화면을 새로고침해 주세요. 그래도 안 되면 잠시 뒤에 다시 시도해 주세요.
      </p>
    </div>
  );
}
