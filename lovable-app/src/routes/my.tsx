import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell, Section } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { setStore, useStore } from "@/lib/store";
import { clearMyBirth } from "@/lib/user-fns";

export const Route = createFileRoute("/my")({
  head: () => ({
    meta: [
      { title: "마이페이지 — 오행 친구들" },
      { name: "description", content: "내 출생정보, 열어본 풀이, 엽전을 관리해요." },
      { property: "og:title", content: "마이페이지 — 오행 친구들" },
      { property: "og:description", content: "내 풀이 보관함" },
    ],
  }),
  component: MyPage,
});

const LABEL: Record<string, string> = { basic: "기본 사주", love: "심층 연애운" };

function MyPage() {
  const { me, unlocked, coins, signedIn, email } = useStore();
  return (
    <Shell title="마이">
      {signedIn ? (
        <div className="card-hanji p-5">
          <p className="font-serif text-lg font-bold">{me ? `${me.name}님` : "손님"}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
          <p className="mt-2 text-sm">
            🪙 보유 엽전 <span className="font-bold">{coins}닢</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/input"
              className="inline-block rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary"
            >
              출생정보 {me ? "수정" : "입력"}
            </Link>
            <Link
              to="/charge"
              className="inline-block rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary"
            >
              엽전 충전
            </Link>
            <Link
              to="/ledger"
              className="inline-block rounded-full border border-input bg-card px-4 py-2 text-sm"
            >
              엽전 내역
            </Link>
            <button
              className="rounded-full border border-input bg-card px-4 py-2 text-sm"
              onClick={async () => {
                await supabase.auth.signOut();
                toast("로그아웃했어요");
              }}
            >
              로그아웃
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <Link to="/account-delete" className="underline">
              회원 탈퇴
            </Link>
          </p>
        </div>
      ) : (
        <div className="card-hanji p-6 text-center">
          <p className="text-4xl">🏮</p>
          <p className="mt-3 font-serif text-lg">로그인하면 기록이 저장돼요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            출생정보, 열어본 풀이, 엽전을 언제든 다시 볼 수 있어요.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
          >
            로그인 / 회원가입
          </Link>
        </div>
      )}
      <Section title="열어본 풀이">
        {unlocked.length === 0 ? (
          "아직 없어요."
        ) : (
          <ul>
            {unlocked.map((u) => (
              <li key={u}>· {LABEL[u] ?? "궁합"}</li>
            ))}
          </ul>
        )}
      </Section>
      {me && (
        <button
          className="mt-4 w-full text-sm text-destructive underline"
          onClick={async () => {
            if (!confirm("출생정보를 지울까요? 엽전과 열람 기록은 유지돼요.")) return;
            setStore({ me: null, partner: null });
            try {
              await clearMyBirth();
            } catch {
              toast("지우지 못했어요. 다시 시도해 주세요.");
            }
          }}
        >
          내 출생정보 지우기
        </button>
      )}
    </Shell>
  );
}
