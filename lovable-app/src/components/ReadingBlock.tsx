import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiReading } from "@/components/AiReading";
import { Paywall } from "@/components/Paywall";
import { ReadingWaiting } from "@/components/ReadingWaiting";
import { ReadingView } from "@/components/ReadingView";
import { PRODUCTS, won } from "@/lib/coins";
import { getReadingFull, getReadingPreview } from "@/lib/reading-fns";
import type { BirthInput } from "@/lib/saju";
import { unlockId } from "@/lib/unlock-id";
import { useStore } from "@/lib/store";

/** 기본 사주·연애운·궁합 풀이 블록. 미열람이면 무료 섹션 + 잠금 목록 + 결제 안내, 열람했으면 전체 본문. */
export function ReadingBlock({
  product,
  partner,
}: {
  product: "basic" | "love" | "compat";
  partner?: BirthInput;
}) {
  const { me, signedIn, unlocked } = useStore();
  // AI 풀이가 화면에 나오면 그것을 주 풀이로 보여 주고, 아니면(꺼짐·실패 등) 기존 풀이를 그대로 둔다
  const [aiReady, setAiReady] = useState(false);
  const id = unlockId(product, me, partner) ?? "";
  const isUnlocked = signedIn && id !== "" && unlocked.includes(id);
  const input = { product, me: me!, ...(partner ? { partner } : {}) };
  const preview = useQuery({
    queryKey: ["reading", product, me, partner ?? null],
    queryFn: () => getReadingPreview({ data: input }),
    enabled: !!me && (product !== "compat" || !!partner),
  });
  const full = useQuery({
    queryKey: ["reading-full", product, me, partner ?? null],
    queryFn: () => getReadingFull({ data: input }),
    enabled: !!me && isUnlocked && (product !== "compat" || !!partner),
  });
  const data = isUnlocked && full.data?.ok ? full.data : preview.data;
  if (preview.isLoading || (isUnlocked && full.isLoading && !preview.data))
    return <ReadingWaiting />;
  if (!data)
    return (
      <p className="mt-4 text-center text-sm text-muted-foreground">풀이를 불러오지 못했어요.</p>
    );
  if (!data.ok)
    return (
      <p role="alert" className="card-hanji mt-4 p-4 text-center text-sm">
        {data.error}
      </p>
    );
  const hasLocked = data.sections.some((s) => s.locked);
  // 열람 중일 때만 AI 풀이를 주 풀이로 본다(잠금 상태로 돌아가면 기존 화면으로)
  const showAi = aiReady && isUnlocked && !hasLocked;
  const p = PRODUCTS[product];
  return (
    <>
      {!showAi && (
        <ReadingView sections={data.sections} chars={data.chars} needsReview={data.needsReview} />
      )}
      {showAi && data.needsReview && (
        <p role="status" className="mt-3 rounded-xl bg-gold/25 p-3 text-xs leading-relaxed">
          절입 시각에 가까운 출생이라 일부 해석이 달라질 수 있어요. 출생 시각을 확인하면 더
          정확해져요.
        </p>
      )}
      {isUnlocked && !hasLocked && me && (product !== "compat" || partner) && (
        <AiReading
          me={me}
          product={product}
          {...(partner ? { partner } : {})}
          auto
          onReady={setAiReady}
        />
      )}
      {hasLocked && (
        <Paywall id={id} label={p.label} price={won(p.coins)} coins={p.coins}>
          {null}
        </Paywall>
      )}
    </>
  );
}
