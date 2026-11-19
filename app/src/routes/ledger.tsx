import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TtShell } from "@/components/ttotto/TtShell";
import { useAuth } from "@/lib/auth-store";
import { ledgerText, type LedgerRow } from "@/lib/charge";
import { getMyLedger } from "@/lib/user-fns";

export const Route = createFileRoute("/ledger")({
  head: () => ({ meta: [{ title: "닢 내역 · 또또사주" }] }),
  component: LedgerPage,
});

type Load = { state: "loading" } | { state: "unavailable" } | { state: "ok"; rows: LedgerRow[] };

function LedgerPage() {
  const { loaded, signedIn } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    if (!signedIn) return;
    let off = false;
    getMyLedger()
      .then((r) => !off && setLoad(r.unavailable ? { state: "unavailable" } : { state: "ok", rows: r.rows }))
      .catch(() => !off && setLoad({ state: "unavailable" }));
    return () => {
      off = true;
    };
  }, [signedIn]);

  return (
    <TtShell title="닢 내역">
      {!loaded ? (
        <p className="mt-8 text-center text-[var(--tt-muted)]" role="status">불러오는 중…</p>
      ) : !signedIn ? (
        <section className="hj-card p-5 text-center">
          <p className="text-[19px]">로그인하면 닢 내역을 볼 수 있어요</p>
          <Link to="/auth" search={{ next: "/ledger" }} className="tt-btn tt-primary mt-3">로그인</Link>
        </section>
      ) : load.state === "loading" ? (
        <p className="mt-8 text-center text-[var(--tt-muted)]" role="status">불러오는 중…</p>
      ) : load.state === "unavailable" ? (
        <p role="status" className="hj-card p-5 text-center text-[15px] text-[var(--tt-muted)]">닢 내역은 아직 준비 중이에요.</p>
      ) : load.rows.length === 0 ? (
        <p className="hj-card p-5 text-center text-[15px] text-[var(--tt-muted)]">아직 닢 내역이 없어요.</p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label="닢 내역">
          {load.rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--hair)] bg-white p-3.5 text-[15px]">
              <span>{ledgerText(r)}</span>
              <time className="shrink-0 text-[12.5px] text-[var(--tt-muted)]" dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </TtShell>
  );
}
