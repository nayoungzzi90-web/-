import { useEffect } from "react";
import { isAuthConfigured, supabase } from "@/integrations/supabase/client";
import { setAuth } from "./auth-store";
import { getMyData } from "./user-fns";

// 로그인 상태와 내 닢 잔액을 화면 상태와 맞춘다. 연결 정보가 없으면 로그인 기능만 꺼진 채로 둔다(다른 화면에는 영향 없음).
export function useAuthSync() {
  useEffect(() => {
    if (!isAuthConfigured()) {
      setAuth({ loaded: true });
      return;
    }
    let cancelled = false;

    async function load(email: string | null) {
      setAuth({ loaded: true, signedIn: true, email });
      try {
        const d = await getMyData();
        if (!cancelled) setAuth({ coins: d.coins });
      } catch {
        // 잔액을 못 불러와도 로그인은 된 상태다. 화면은 "불러오지 못했어요"로 보여 준다.
        if (!cancelled) setAuth({ coins: null });
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) void load(data.session.user.email ?? null);
        else if (!cancelled) setAuth({ loaded: true });
      })
      .catch(() => {
        if (!cancelled) setAuth({ loaded: true });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setAuth({ loaded: true, signedIn: false, email: null, coins: null });
      else if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) void load(session.user.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}
