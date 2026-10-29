// 공개 계산 요청 제한 관문(서버 전용). getSajuPreview 와 풀이 서버 함수가 함께 쓴다.
// 영속 DB 한도를 우선하고, production 에서 실패하면 fail-closed (rate-limit.server.ts, R-015).
import { getRequestHeader } from "@tanstack/react-start/server";

export type GateResult = { allowed: true } | { allowed: false; error: string };

export async function rateGate(): Promise<GateResult> {
  const rl = await import("./rate-limit.server");
  const decision = await rl.checkRateLimit({
    env: rl.readRateEnv(import.meta.env.DEV),
    getHeader: (n) => {
      try {
        return getRequestHeader(n) ?? undefined;
      } catch {
        return undefined;
      }
    },
    rpc: await rl.createSupabaseRateRpc().catch(() => null),
  });
  if (decision.allowed) return { allowed: true };
  return {
    allowed: false,
    error:
      decision.reason === "limited"
        ? "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
        : "지금은 계산을 이용할 수 없어요. 잠시 후 다시 시도해 주세요.",
  };
}
