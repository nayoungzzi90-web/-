// R-015 공개 사주 미리보기 요청 제한 (서버 전용).
// - 영속 공유 한도: DB RPC public.saju_rate_limit_hit (service_role 전용, SQL은 docs/migrations/REVIEW_ONLY, 미적용)
// - 원시 IP는 저장/로그/응답하지 않음: HMAC-SHA256(RATE_LIMIT_PEPPER)으로만 식별
// - x-forwarded-for 등 클라이언트 조작 가능 헤더는 기본 신뢰하지 않음
// - production: 영속 한도 실패/비밀값 누락 시 fail-closed
// - preview: 명시적으로 표시된 인스턴스별 메모리 한도(보안 아님)

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_SEC = 60;
/** 신뢰 헤더가 없을 때 모든 요청이 공유하는 키 — 더 엄격한 한도 */
export const UNKNOWN_KEY_MAX = 10;
export const RATE_SCOPE = "saju_preview";

/** 프록시가 덮어써 검증하는 헤더만 허용 (x-forwarded-for 제외) */
export const ALLOWED_TRUSTED_HEADERS = ["cf-connecting-ip", "true-client-ip", "x-real-ip"] as const;

export type RateMode = "production" | "preview";
export type RateDecision =
  | { allowed: true; backend: "persistent" | "preview-memory-best-effort" }
  | { allowed: false; reason: "limited" | "unavailable" };

export interface RateRpc {
  hit(scope: string, identityHash: string, max: number, windowSec: number): Promise<{ allowed: boolean }>;
}

export interface RateEnv {
  mode: RateMode;
  pepper: string | undefined;
  trustedHeader: string | undefined;
}

export function readRateEnv(isDev: boolean): RateEnv {
  const m = process.env["RATE_LIMIT_MODE"];
  return {
    // 배포 빌드(isDev=false)는 RATE_LIMIT_MODE와 무관하게 항상 production(fail-closed)
    mode: !isDev ? "production" : m === "production" ? "production" : "preview",
    pepper: process.env["RATE_LIMIT_PEPPER"],
    trustedHeader: process.env["TRUSTED_CLIENT_IP_HEADER"],
  };
}

/** 허용 목록의 설정 헤더 하나만 읽는다. 형식이 이상하면 unknown 공유 키. */
export function resolveClientIdentity(
  getHeader: (name: string) => string | undefined,
  trustedHeader: string | undefined,
): { key: string; shared: boolean } {
  const h = trustedHeader?.trim().toLowerCase();
  if (!h || !(ALLOWED_TRUSTED_HEADERS as readonly string[]).includes(h)) return { key: "unknown", shared: true };
  const v = getHeader(h)?.trim();
  if (!v || v.length > 45 || !/^[0-9a-fA-F:.]+$/.test(v)) return { key: "unknown", shared: true };
  return { key: v, shared: false };
}

export async function hmacIdentity(pepper: string, raw: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${RATE_SCOPE}|${raw}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

// 미리보기 전용 메모리 한도 (인스턴스별·휘발성, 보안 아님)
const mem = new Map<string, { start: number; n: number }>();
export function previewMemoryHit(key: string, max: number, now = Date.now()): boolean {
  if (mem.size > 5000) for (const [k, v] of mem) if (now - v.start > RATE_LIMIT_WINDOW_SEC * 1000) mem.delete(k);
  const h = mem.get(key);
  if (!h || now - h.start > RATE_LIMIT_WINDOW_SEC * 1000) { mem.set(key, { start: now, n: 1 }); return 1 <= max; }
  h.n++;
  return h.n <= max;
}
export function _resetPreviewMemory() { mem.clear(); }
export function _previewMemoryKeys(): string[] { return [...mem.keys()]; }

export async function checkRateLimit(opts: {
  env: RateEnv;
  getHeader: (name: string) => string | undefined;
  rpc: RateRpc | null;
}): Promise<RateDecision> {
  const { env } = opts;
  const id = resolveClientIdentity(opts.getHeader, env.trustedHeader);
  const max = id.shared ? UNKNOWN_KEY_MAX : RATE_LIMIT_MAX;

  if (!env.pepper || env.pepper.length < 32 || !opts.rpc) {
    if (env.mode === "production") return { allowed: false, reason: "unavailable" };
    // pepper 없음: 원시 IP를 절대 저장하지 않도록 모든 요청을 공유 unknown 키(엄격 한도)로 처리
    return previewMemoryHit("unknown", UNKNOWN_KEY_MAX)
      ? { allowed: true, backend: "preview-memory-best-effort" }
      : { allowed: false, reason: "limited" };
  }

  const hash = await hmacIdentity(env.pepper, id.key);
  try {
    const r = await opts.rpc.hit(id.shared ? `${RATE_SCOPE}_unknown` : RATE_SCOPE, hash, max, RATE_LIMIT_WINDOW_SEC);
    return r.allowed ? { allowed: true, backend: "persistent" } : { allowed: false, reason: "limited" };
  } catch {
    if (env.mode === "production") return { allowed: false, reason: "unavailable" };
    const memKey = id.shared ? "unknown" : `h:${hash}`;
    return previewMemoryHit(memKey, max)
      ? { allowed: true, backend: "preview-memory-best-effort" }
      : { allowed: false, reason: "limited" };
  }
}

/** service_role 클라이언트로 RPC 호출 — 핸들러 내부에서만 동적 import */
export async function createSupabaseRateRpc(): Promise<RateRpc | null> {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"] || !process.env["SUPABASE_URL"]) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    async hit(scope, identityHash, max, windowSec) {
      // 함수 시그니처는 리뷰 SQL 기준. 미적용 상태면 오류 → production fail-closed
      const rpc = supabaseAdmin.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
      const { data, error } = await rpc("saju_rate_limit_hit", {
        p_scope: scope, p_identity_hash: identityHash,
      });
      if (error) throw new Error("rate rpc failed");
      void max; void windowSec; // 한도·창은 DB 함수에 고정(클라이언트·앱 값 비신뢰)
      if (typeof data !== "boolean") throw new Error("rate rpc bad shape");
      return { allowed: data };
    },
  };
}
