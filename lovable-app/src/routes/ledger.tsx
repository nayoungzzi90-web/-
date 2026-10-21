import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { LedgerView } from "@/components/LedgerView";
import { useStore } from "@/lib/store";
import { getMyLedger } from "@/lib/user-fns";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "엽전 내역 — 오행 친구들" },
      { name: "description", content: "엽전 충전·사용·보상 내역을 확인해요." },
      { property: "og:title", content: "엽전 내역 — 오행 친구들" },
      { property: "og:description", content: "엽전 내역 보기" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const { signedIn } = useStore();
  const { data, isLoading } = useQuery({
    queryKey: ["my-ledger"],
    queryFn: () => getMyLedger(),
    enabled: signedIn,
  });
  return (
    <Shell title="엽전 내역">
      {!signedIn ? (
        <div className="card-hanji p-5 text-center">
          <p className="font-serif font-bold">로그인하면 엽전 내역을 볼 수 있어요</p>
          <Link
            to="/auth"
            className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
          >
            로그인
          </Link>
        </div>
      ) : (
        <LedgerView rows={data?.rows ?? []} unavailable={!!data?.unavailable} loading={isLoading} />
      )}
    </Shell>
  );
}
