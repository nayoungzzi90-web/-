import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CoinIcon } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "내 정보 · 또또사주" }] }),
  component: MyPage,
});

function MyPage() {
  const { loaded, signedIn, email, coins } = useAuth();
  const { me } = useStore();
  const [out, setOut] = useState(false);
  return (
    <TtShell title="내 정보">
      {!loaded ? (
        <p className="mt-8 text-center text-[var(--tt-muted)]" role="status">불러오는 중…</p>
      ) : signedIn ? (
        <section className="hj-card p-5">
          <p className="text-[22px]">{me?.name ? `${me.name}님` : "또또 친구"}</p>
          <p className="mt-0.5 break-all text-[13px] text-[var(--tt-muted)]">{email}</p>
          <p className="tt-price-note mt-4" style={{ marginLeft: 0 }}>
            <CoinIcon size={22} />
            <b className="tt-price-one">{coins ?? "–"}</b>
            <b>닢</b>
          </p>
          {coins === null && <p className="mt-2 text-[13px] text-[var(--tt-muted)]">닢을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p>}
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--tt-muted)]">충전과 내역은 준비 중이에요. 지금은 결제가 열려 있지 않아요.</p>
          <div className="mt-4 grid gap-2">
            <Link to="/input" className="tt-btn tt-sub">출생정보 {me ? "수정" : "입력"}</Link>
            <button
              type="button"
              className="tt-btn tt-sub"
              disabled={out}
              onClick={async () => {
                setOut(true);
                try {
                  await supabase.auth.signOut();
                } finally {
                  setOut(false);
                }
              }}
            >
              로그아웃
            </button>
          </div>
        </section>
      ) : (
        <section className="hj-card p-5 text-center">
          <p className="text-[20px]">로그인하면 내 닢을 볼 수 있어요</p>
          <p className="mt-1 text-[14px] text-[var(--tt-muted)]">내 사주와 오늘의 운세쿠키는 로그인 없이도 볼 수 있어요.</p>
          <Link to="/auth" className="tt-btn tt-primary mt-4">로그인 / 회원가입</Link>
        </section>
      )}
    </TtShell>
  );
}
