import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TrialResponse } from "./ai-trial.server";
import type { StorySectionResponse } from "./ai-story.server";

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

// 섹션 한 장씩 요청(휴대폰 브라우저가 1분 넘게 응답이 없는 요청을 끊는 문제를 피한다).
export const STORY_TOTAL = 8; // ai-story.server.ts 의 STORY_SECTIONS 개수와 같아야 한다(시험이 확인)
const priorSchema = z.object({
  id: z.string().max(32),
  title: z.string().max(60),
  headline: z.string().max(200),
  body: z.string().max(4000),
});
const sectionSchema = schema.extend({
  index: z.number().int().min(0).max(STORY_TOTAL - 1),
  prior: z.array(priorSchema).max(STORY_TOTAL),
  fix: z.string().max(600).optional(),
  giveUp: z.boolean().optional(),
});
export const runAiStorySectionFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sectionSchema.parse(input))
  .handler(async ({ data }): Promise<StorySectionResponse> => {
    try {
      const { readTrialConfig } = await import("./ai-trial.server");
      const { runAiStorySection } = await import("./ai-story.server");
      return await runAiStorySection(data, { config: readTrialConfig(process.env) });
    } catch {
      return {
        ok: false,
        error: "AI 풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
  });
