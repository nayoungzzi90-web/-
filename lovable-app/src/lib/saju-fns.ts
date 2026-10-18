import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { SajuPreview } from "./saju";

// R-001 시범/검토용 사주 미리보기. 공개(비로그인) 호출 가능 — 회원 데이터를 읽지 않고 계산만 수행.
// 음력 변환은 서버(lunar-conversion.server.ts)에서만 수행한다.
// 요청 제한은 rate-limit.server.ts (R-015): 영속 DB 한도 우선, production에서 실패 시 fail-closed.

const MAX_FIELD_LEN = 64;
function sanitize(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  for (const k of ["calendar", "date", "time", "name", "gender"]) {
    const v = o[k];
    if (typeof v === "string" && v.length > MAX_FIELD_LEN) return null;
  }
  return { calendar: o["calendar"], leap: o["leap"], date: o["date"], time: o["time"] };
}

export const getSajuPreview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sanitize(input))
  .handler(async ({ data }): Promise<SajuPreview> => {
    const base = { finalApproved: false as const };
    try {
      const rl = await import("./rate-limit.server");
      const decision = await rl.checkRateLimit({
        env: rl.readRateEnv(import.meta.env.DEV),
        getHeader: (n) => { try { return getRequestHeader(n) ?? undefined; } catch { return undefined; } },
        rpc: await rl.createSupabaseRateRpc().catch(() => null),
      });
      if (!decision.allowed) {
        return {
          ok: false,
          error: decision.reason === "limited"
            ? "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
            : "지금은 계산을 이용할 수 없어요. 잠시 후 다시 시도해 주세요.",
          ...base,
        };
      }
      const { previewFromBirthInput } = await import("./saju-engine.server");
      return previewFromBirthInput(data);
    } catch {
      return { ok: false, error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", ...base };
    }
  });
