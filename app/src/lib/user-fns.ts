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

// 닢 내역(원장). 표가 아직 없으면(운영에 SQL 미적용) unavailable 로 알린다. 읽기 전용, RLS 로 본인 행만 읽힌다.
export const getMyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as {
      from(t: string): {
        select(c: string): {
          eq(
            c: string,
            v: string,
          ): {
            order(
              c: string,
              o: { ascending: boolean },
            ): {
              limit(n: number): PromiseLike<{
                data:
                  | {
                      id: number;
                      delta: number;
                      reason: string;
                      ref: string | null;
                      balance_after: number;
                      created_at: string;
                    }[]
                  | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    };
    const { data, error } = await sb
      .from("coin_ledger")
      .select("id, delta, reason, ref, balance_after, created_at")
      .eq("user_id", context.userId)
      .order("id", { ascending: false })
      .limit(100);
    if (error) return { unavailable: true as const, rows: [] as never[] };
    return {
      unavailable: false as const,
      rows: (data ?? []).map((r) => ({
        id: r.id,
        delta: r.delta,
        reason: r.reason,
        ref: r.ref,
        balanceAfter: r.balance_after,
        createdAt: r.created_at,
      })),
    };
  });
