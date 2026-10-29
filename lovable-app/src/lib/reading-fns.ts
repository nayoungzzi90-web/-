import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OutSection, ReadingProduct, UnlockClient } from "./reading.server";

// 풀이(3,000자 이상, 규칙형) 서버 함수. 본문은 서버에서만 만들고, **열람 권한이 없으면 잠긴 섹션의 본문을 응답에 넣지 않는다.**
//  - getReadingPreview: 공개(비로그인) 호출 가능 — 앞쪽 무료 섹션만 본문, 나머지는 제목+짧은 미리보기. 요청 제한 적용.
//  - getReadingFull   : 로그인 필수 — unlocked_readings 에 열람 기록(spend_coins 로 생성)이 있을 때만 전체 본문.
const birthSchema = z.object({
  name: z.string().max(64).optional(),
  calendar: z.enum(["solar", "lunar"]),
  leap: z.boolean(),
  date: z.string().length(10),
  time: z.string().max(5).nullable(),
  gender: z.enum(["f", "m"]),
});
export const readingInputSchema = z.object({
  product: z.enum(["basic", "love", "compat"]),
  me: birthSchema,
  partner: birthSchema.optional(),
});

export type ReadingResponse =
  | {
      ok: true;
      product: ReadingProduct;
      unlocked: boolean;
      sections: OutSection[];
      chars: number;
      needsReview: boolean;
      reviewReasons: string[];
      meta: { rules: string; engine: string; mode: "template"; crossCheck: "match" };
    }
  | { ok: false; error: string };

const FAIL = (error: string): ReadingResponse => ({ ok: false, error });

export const getReadingPreview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => readingInputSchema.parse(input))
  .handler(async ({ data }): Promise<ReadingResponse> => {
    try {
      const { rateGate } = await import("./rate-gate.server");
      const gate = await rateGate();
      if (!gate.allowed) return FAIL(gate.error);
      const { buildReading, shapeSections } = await import("./reading.server");
      const r = buildReading(data);
      if (!r.ok) return r;
      return {
        ok: true,
        product: r.product,
        unlocked: false,
        sections: shapeSections(r.sections, false),
        chars: r.chars,
        needsReview: r.needsReview,
        reviewReasons: r.reviewReasons,
        meta: r.meta,
      };
    } catch {
      return FAIL("풀이를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    }
  });

export const getReadingFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => readingInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReadingResponse> => {
    try {
      const { rateGate } = await import("./rate-gate.server");
      const gate = await rateGate();
      if (!gate.allowed) return FAIL(gate.error);
      const { buildReading, isUnlocked, shapeSections, unlockIdFor } =
        await import("./reading.server");
      const r = buildReading(data);
      if (!r.ok) return r;
      // 열람 권한은 서버가 DB 에서 직접 확인한다(클라이언트가 보낸 값은 믿지 않는다). RLS 로 본인 기록만 읽힌다.
      const unlocked = await isUnlocked(
        context.supabase as unknown as UnlockClient,
        context.userId,
        unlockIdFor(data.product, data.partner),
      );
      return {
        ok: true,
        product: r.product,
        unlocked,
        sections: shapeSections(r.sections, unlocked),
        chars: r.chars,
        needsReview: r.needsReview,
        reviewReasons: r.reviewReasons,
        meta: r.meta,
      };
    } catch {
      return FAIL("풀이를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    }
  });
