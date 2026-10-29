import { describe, expect, it } from "vitest";
import { birthObjectSchema, inviteInputSchema, unlockInputSchema } from "@/lib/user-fns";

describe("서버 함수 입력 검증", () => {
  it("열람: 정상 값 통과, 이상한 값 거부", () => {
    expect(unlockInputSchema.safeParse({ id: "basic", cost: 4 }).success).toBe(true);
    expect(unlockInputSchema.safeParse({ id: "compat:1993-03-09", cost: 1 }).success).toBe(true);
    for (const bad of [
      null,
      undefined,
      "x",
      {},
      { id: "compat:x", cost: 1 },
      { id: "", cost: 4 },
      { id: "basic", cost: -1 },
      { id: "basic", cost: 1.5 },
      { id: "basic", cost: "4" },
      { id: "a".repeat(65), cost: 4 },
      { id: "a b", cost: 4 },
      { id: "basic", cost: 1e9 },
    ]) {
      expect(unlockInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
  it("초대 코드: 영숫자·_- 만, 32자 이하", () => {
    expect(inviteInputSchema.safeParse({ code: "AB12-cd_3" }).success).toBe(true);
    for (const bad of [
      null,
      {},
      { code: "" },
      { code: "   " },
      { code: "a".repeat(33) },
      { code: "a;drop" },
      { code: 123 },
    ]) {
      expect(inviteInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
  it("출생정보: 객체만 통과(세부 검증은 serializeBirth)", () => {
    expect(birthObjectSchema.safeParse({ calendar: "solar" }).success).toBe(true);
    for (const bad of [null, undefined, "x", 1, []])
      expect(birthObjectSchema.safeParse(bad).success).toBe(false);
  });
});
