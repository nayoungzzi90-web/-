import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 로그인한 회원의 내 닢 잔액만 읽는다(1단계). 출생정보는 이 기기에만 저장하는 정책이라 서버로 보내지 않는다.
// 읽기 전용: 기존 DB 의 지갑을 본인 권한(RLS)으로 조회할 뿐 쓰지 않는다. 처음 방문한 회원의 지갑은 기존 DB 함수 ensure_user_setup 이 준비한다.
export interface MyData {
  coins: number;
}

export const getMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyData> => {
    const { supabase, userId } = context;
    await supabase.rpc("ensure_user_setup");
    const w = await supabase.from("wallets").select("coins").eq("user_id", userId).maybeSingle();
    return { coins: w.data?.coins ?? 0 };
  });
