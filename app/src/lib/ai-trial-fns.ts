import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TrialResponse } from "./ai-trial.server";

// 소유자 전용 AI 풀이 시범. 꺼져 있으면(기본) AI 를 부르지 않고 "준비 중"만 돌려준다.
const birthSchema = z.object({
  name: z.string().max(64).optional(),
  calendar: z.enum(["solar", "lunar"]),
  leap: z.boolean(),
  date: z.string().length(10),
  time: z.string().max(5).nullable(),
  gender: z.enum(["f", "m"]),
});
const schema = z.object({
  me: birthSchema,
  token: z.string().min(1).max(200),
  concern: z.string().max(300).optional(),
  sendConcern: z.boolean().optional(),
});

export const runAiTrialFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<TrialResponse> => {
    try {
      const { readTrialConfig, runAiTrial } = await import("./ai-trial.server");
      return await runAiTrial(data, { config: readTrialConfig(process.env) });
    } catch {
      return {
        ok: false,
        error: "AI 풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
  });

// 풍부한 해석 모드(일반 명리 해석 허용). 같은 안전장치(꺼짐 기본·비밀 토큰·원가 상한)를 쓴다.
export const runAiStoryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<TrialResponse> => {
    try {
      const { readTrialConfig } = await import("./ai-trial.server");
      const { runAiStory } = await import("./ai-story.server");
      return await runAiStory(data, { config: readTrialConfig(process.env) });
    } catch {
      return {
        ok: false,
        error: "AI 풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
  });
