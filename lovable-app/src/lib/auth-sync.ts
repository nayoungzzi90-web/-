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
        // 초대 링크로 들어온 방문자는 연결만 한다. 보상은 이 친구가 처음 결제하고 환불 기간이 지난 뒤 초대한 분께 간다.
        let ref: string | null = null;
        try {
          ref = localStorage.getItem("ref") ?? sessionStorage.getItem("ref");
          localStorage.removeItem("ref");
          sessionStorage.removeItem("ref");
        } catch {
          /* 저장소를 못 쓰는 환경 */
        }
        if (ref) {
          const r = await applyInvite({ data: { code: ref } });
          if (r.granted) toast("초대 링크가 연결됐어요. 친구의 초대 덕분에 만났어요 🪙");
        }
      } catch {
        // 회원 정보를 못 불러와도 로그인 자체는 된 상태다. 화면이 계속 로그인 화면으로 보이지 않게 로그인 상태는 반영한다.
        if (!cancelled) {
          setStore({ loaded: true, signedIn: true, email });
          toast("내 정보를 불러오지 못했어요.", { description: "잠시 뒤 새로고침해 주세요." });
        }
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
          concern: "",
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
