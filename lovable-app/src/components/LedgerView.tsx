import { ledgerText, type LedgerRow } from "@/lib/charge";

/** 엽전 내역 화면(표시 전용). */
export function LedgerView({
  rows,
  unavailable,
  loading,
}: {
  rows: LedgerRow[];
  unavailable: boolean;
  loading: boolean;
}) {
  if (loading)
    return <p className="mt-6 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  if (unavailable)
    return (
      <p role="status" className="card-hanji mt-4 p-5 text-center text-sm text-muted-foreground">
        엽전 내역은 아직 준비 중이에요.
      </p>
    );
  if (rows.length === 0)
    return (
      <p className="card-hanji mt-4 p-5 text-center text-sm text-muted-foreground">
        아직 엽전 내역이 없어요.
      </p>
    );
  return (
    <ul className="mt-4 space-y-2" aria-label="엽전 내역">
      {rows.map((r) => (
        <li key={r.id} className="card-hanji flex items-center justify-between p-3 text-sm">
          <span>{ledgerText(r)}</span>
          <time className="text-xs text-muted-foreground" dateTime={r.createdAt}>
            {new Date(r.createdAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </li>
      ))}
    </ul>
  );
}
