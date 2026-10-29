import { useQuery } from "@tanstack/react-query";
import { Paywall } from "@/components/Paywall";
import { ReadingView } from "@/components/ReadingView";
import { PRODUCTS, won } from "@/lib/coins";
import { getReadingFull, getReadingPreview } from "@/lib/reading-fns";
import type { BirthInput } from "@/lib/saju";
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
  const id = product === "compat" ? `compat:${partner?.date ?? ""}` : product;
  const isUnlocked = signedIn && unlocked.includes(id);
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
    return <p className="mt-4 text-center text-sm text-muted-foreground">풀이를 만들고 있어요…</p>;
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
  const p = PRODUCTS[product];
  return (
    <>
      <ReadingView sections={data.sections} chars={data.chars} needsReview={data.needsReview} />
      {hasLocked && (
        <Paywall id={id} label={p.label} price={won(p.coins)} coins={p.coins}>
          {null}
        </Paywall>
      )}
    </>
  );
}
