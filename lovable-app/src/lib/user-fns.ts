import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BirthInput } from "./saju";

export interface MyData {
  me: BirthInput | null;
  coins: number;
  unlocked: string[];
  inviteCode: string | null;
  meError?: string;
}

export const getMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.rpc("ensure_user_setup");
    const [bp, w, ur, ic] = await Promise.all([
      supabase.from("birth_profiles").select("name, calendar, leap, birth_date, birth_input_original, birth_time, gender").eq("user_id", userId).maybeSingle(),
      supabase.from("wallets").select("coins").eq("user_id", userId).maybeSingle(),
      supabase.from("unlocked_readings").select("reading_id").eq("user_id", userId),
      supabase.from("invite_codes").select("code").eq("user_id", userId).maybeSingle(),
    ]);
    const { deserializeBirth } = await import("./birth-persistence.server");
    const dr = bp.data ? deserializeBirth(bp.data) : null;
    return {
      me: dr && dr.ok ? dr.me : null,
      ...(dr && !dr.ok ? { meError: dr.error } : {}),
      coins: w.data?.coins ?? 0,
      unlocked: (ur.data ?? []).map((x) => x.reading_id),
      inviteCode: ic.data?.code ?? null,
    } satisfies MyData;
  });

export const saveBirth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input as BirthInput)
  .handler(async ({ data, context }) => {
    const { serializeBirth } = await import("./birth-persistence.server");
    const r = serializeBirth(data);
    if (!r.ok) throw new Error(r.error); // 잘못된 입력은 DB write 없음
    // created_at은 보내지 않아 기존 값 보존, user_id는 인증된 본인만(RLS)
    const { error } = await context.supabase
      .from("birth_profiles")
      .upsert({ user_id: context.userId, ...r.row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error("저장하지 못했어요. 다시 시도해 주세요.");
    return { ok: true };
  });

export const clearMyBirth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("birth_profiles").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const unlockReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; cost: number }) => input)
  .handler(async ({ data, context }) => {
    const { data: coins, error } = await context.supabase.rpc("spend_coins", { p_reading_id: data.id, p_cost: data.cost });
    if (error) {
      // cost는 DB 카탈로그 가격으로 서버에서 재검증된다(클라이언트 값 신뢰 금지).
      throw new Error(
        error.message.includes("READING_DISABLED")
          ? "지금은 열 수 없어요. 계산 엔진 검증 중이에요."
          : error.message.includes("INSUFFICIENT_COINS")
            ? "업전이 부족해요. 친구를 초대해 업전을 모아보세요!"
            : "열람에 문제가 생겼어요. 다시 시도해 주세요.",
      );
    }
    return { coins: coins ?? 0 };
  });

export const applyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase.rpc("ensure_user_setup");
    const { data: ok } = await context.supabase.rpc("apply_invite", { p_code: data.code });
    if (!ok) return { granted: false as const };
    const { data: w } = await context.supabase.from("wallets").select("coins").eq("user_id", context.userId).maybeSingle();
    return { granted: true as const, coins: w?.coins ?? 0 };
  });
