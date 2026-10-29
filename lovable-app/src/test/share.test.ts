import { describe, expect, it } from "vitest";
import { INVITE_HOLD_DAYS } from "@/lib/coins";
import { cleanRef, shareText, shareUrl } from "@/lib/share";

describe("공유 문구·링크", () => {
  it("초대 코드가 올바르면 ?ref= 를 붙이고, 이상하면 붙이지 않는다", () => {
    expect(shareUrl("https://x.kr", "AB12CD34")).toBe("https://x.kr/?ref=AB12CD34");
    expect(shareUrl("https://x.kr/", "AB12CD34")).toBe("https://x.kr/?ref=AB12CD34");
    expect(shareUrl("https://x.kr", null)).toBe("https://x.kr/");
    for (const bad of ["a b", "a&b=1", "../x", "<s>", "", "a".repeat(33)])
      expect(shareUrl("https://x.kr", bad), bad).toBe("https://x.kr/");
  });
  it("링크에서 읽은 ref 는 형식이 맞을 때만 저장한다", () => {
    expect(cleanRef("AB12-cd_3")).toBe("AB12-cd_3");
    for (const bad of [undefined, 5, "", "a b", "x".repeat(33), "<script>"])
      expect(cleanRef(bad)).toBeNull();
  });
  it("공유 문구에는 캐릭터만 있고 출생정보·이름이 들어갈 자리가 없다", () => {
    const t = shareText({
      name: "솔솔 호랑이",
      epithet: "복을 품은",
      personality: "곧게 뻗은 리더",
    });
    expect(t).toBe("나는 복을 품은 솔솔 호랑이! 곧게 뻗은 리더. 너의 오행 친구는?");
    expect(shareText({ name: "넝쿨 토끼", personality: "유연함" })).toContain("나는 넝쿨 토끼!");
  });
  it("보상 보류 기간은 SQL(7일)과 같다", () => {
    expect(INVITE_HOLD_DAYS).toBe(7);
  });
});
