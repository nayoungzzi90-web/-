import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { ChargeView } from "@/components/ChargeView";
import { runCharge, type PaymentsStatus } from "@/lib/charge";
import { setStore, useStore } from "@/lib/store";
import { confirmCoinOrder, createCoinOrder, getMyData, getPaymentsStatus } from "@/lib/user-fns";

export const Route = createFileRoute("/charge")({
  head: () => ({
    meta: [
      { title: "엽전 충전 — 오행 친구들" },
      { name: "description", content: "엽전을 충전해 풀이를 열어보세요." },
      { property: "og:title", content: "엽전 충전 — 오행 친구들" },
      { property: "og:description", content: "엽전 충전하기" },
    ],
  }),
  component: ChargePage,
});

function ChargePage() {
  const { signedIn, coins } = useStore();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const { data: status } = useQuery<PaymentsStatus>({
    queryKey: ["payments-status"],
    queryFn: () => getPaymentsStatus(),
  });

  const buy = async (n: number) => {
    setBusy(n);
    setMessage("");
    const r = await runCharge(n, { createOrder: createCoinOrder, confirmOrder: confirmCoinOrder });
    if (r.ok) {
      try {
        const d = await getMyData();
        setStore({ coins: d.coins });
      } catch {
        if (r.balance !== null) setStore({ coins: r.balance });
      }
      setMessage(`엽전 ${r.coins}닢이 충전됐어요.`);
    } else setMessage(r.message);
    setBusy(null);
  };

  return (
    <Shell title="엽전 충전">
      <ChargeView
        signedIn={signedIn}
        coins={coins}
        status={status ?? null}
        busyCoins={busy}
        message={message}
        onBuy={buy}
      />
    </Shell>
  );
}
