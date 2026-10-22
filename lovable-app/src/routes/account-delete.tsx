import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { AccountDeleteView } from "@/components/AccountDeleteView";
import { supabase } from "@/integrations/supabase/client";
import { accountErrorKo } from "@/lib/account-messages";
import { setStore, useStore } from "@/lib/store";
import { deleteMyAccount, getAccountDeletionStatus } from "@/lib/user-fns";

export const Route = createFileRoute("/account-delete")({
  head: () => ({
    meta: [
      { title: "회원 탈퇴 — 오행 친구들" },
      { name: "description", content: "회원 탈퇴 안내와 처리" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountDeletePage,
});

function AccountDeletePage() {
  const { signedIn, coins } = useStore();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data } = useQuery({
    queryKey: ["account-deletion-status"],
    queryFn: () => getAccountDeletionStatus(),
  });

  const run = async (input: { confirm: string; forfeit: boolean }) => {
    setBusy(true);
    setMessage("");
    try {
      await deleteMyAccount({ data: input });
      await supabase.auth.signOut();
      setStore({
        signedIn: false,
        email: null,
        inviteCode: null,
        me: null,
        partner: null,
        coins: 0,
        unlocked: [],
      });
      toast("탈퇴가 완료됐어요. 이용해 주셔서 고마워요.");
      nav({ to: "/" });
    } catch (e) {
      setMessage(accountErrorKo(e instanceof Error ? e.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="회원 탈퇴">
      <AccountDeleteView
        signedIn={signedIn}
        coins={coins}
        enabled={data ? data.enabled : null}
        busy={busy}
        message={message}
        onDelete={run}
      />
    </Shell>
  );
}
