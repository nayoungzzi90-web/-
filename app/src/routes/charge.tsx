import { Link, createFileRoute } from "@tanstack/react-router";
import { CoinIcon } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { useAuth } from "@/lib/auth-store";
import { PACKS } from "@/lib/charge";

export const Route = createFileRoute("/charge")({
  head: () => ({ meta: [{ title: "닢 충전 · 또또사주" }] }),
  component: ChargePage,
});

// 닢 충전 화면. 결제는 꺼져 있어(PAYMENTS_MODE 기본 꺼짐) 팩 목록과 안내만 보여 주고 아무것도 청구하지 않는다.
function ChargePage() {
  const { signedIn, coins, loaded } = useAuth();
  return (
    <TtShell title="닢 충전">
      <section className="hj-card p-5 text-center">
        <p className="text-[14px] text-[var(--tt-muted)]">내 닢</p>
        <p className="tt-price-note mt-2" style={{ marginInline: "auto" }}>
          <CoinIcon size={22} />
          <b className="tt-price-one">{signedIn ? (coins ?? "–") : "–"}</b>
          <b>닢</b>
        </p>
        <p className="mt-2 text-[13px] text-[var(--tt-muted)]">1닢 = 1,000원</p>
      </section>

      <p role="status" className="mt-4 rounded-[14px] bg-[#fff3ec] px-4 py-3 text-center text-[14.5px] font-bold text-[#a2491f]">
        결제는 아직 준비 중이에요. 준비가 끝나면 여기서 충전할 수 있어요.
      </p>

      {loaded && !signedIn && (
        <div className="hj-card mt-4 p-5 text-center">
          <p className="text-[18px]">로그인하면 내 닢을 볼 수 있어요</p>
          <Link to="/auth" search={{ next: "/charge" }} className="tt-btn tt-primary mt-3">로그인</Link>
        </div>
      )}

      <ul className="mt-4 space-y-2.5" aria-label="충전 팩">
        {PACKS.map((p) => (
          <li key={p.coins} className="flex items-center justify-between rounded-[18px] border border-[var(--hair)] bg-white p-4">
            <div className="flex items-center gap-2.5">
              <CoinIcon size={26} />
              <div>
                <p className="text-[19px] leading-none">{p.label}</p>
                <p className="mt-1 text-[14px] text-[var(--tt-muted)]">{p.price}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#f6f0e4] px-4 py-2 text-[15px] font-bold text-[var(--tt-muted)]" aria-disabled="true">준비 중</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">충전한 닢의 환불·유효기간 등은 이용약관에 따라요(준비 중).</p>
      <Link to="/my" className="tt-btn tt-sub mt-4">내 정보로 가기</Link>
    </TtShell>
  );
}
