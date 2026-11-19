import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("로그인 뒤 이동 경로", () => {
  it("같은 사이트 안의 경로만 허용한다", () => {
    expect(safeNext("/my")).toBe("/my");
    expect(safeNext("/story/basic")).toBe("/story/basic");
  });
  it("바깥 주소·이상한 형태는 홈으로 보낸다", () => {
    for (const bad of [undefined, null, "", "my", "//evil.com", "/\\evil.com", "https://evil.com", "/a\nb", "/a\\b"]) {
      expect(safeNext(bad as string | null | undefined)).toBe("/");
    }
  });
});
