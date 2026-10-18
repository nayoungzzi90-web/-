import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getState, setStore } from "./store";
import { applyInvite, getMyData } from "./user-fns";

// 로그인 상태와 회원 데이터를 화면 상태와 동기화한다.
export function useAuthSync() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;

    async function loadProfile(email: string | null) {
      try {
        const { meError, ...d } = await getMyData();
        if (cancelled) return;
        setStore({ loaded: true, signedIn: true, email, ...d });
        if (meError) toast("저장된 출생정보를 불러오지 못했어요.", { description: meError });
        // 초대 링크로 들어온 방문자에게 1회 보너스 지급
        const ref = sessionStorage.getItem("ref");
        if (ref) {
          sessionStorage.removeItem("ref");
          const r = await applyInvite({ data: { code: ref } });
          if (r.granted) {
            setStore({ coins: r.coins });
            toast("친구 초대 보너스 2닢이 지급됐어요! 🪙");
          }
        }
      } catch {
        if (!cancelled) setStore({ loaded: true });
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) {
          if (!cancelled) setStore({ loaded: true });
          return;
        }
        await loadProfile(data.session.user.email ?? null);
      })
      .catch(() => {
        if (!cancelled) setStore({ loaded: true });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        setStore({
          loaded: true,
          signedIn: false,
          email: null,
          inviteCode: null,
          me: null,
          partner: null,
          coins: 0,
          unlocked: [],
        });
        router.invalidate();
        return;
      }
      router.invalidate();
      if (!session || getState().signedIn) return;
      void loadProfile(session.user.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);
}
