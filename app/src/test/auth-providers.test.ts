import { describe, expect, it } from "vitest";
import { PROVIDER_INFO, oauthErrorKo, parseProviders } from "@/lib/auth-providers";

describe("소셜 로그인 제공자 설정", () => {
  it("알려진 제공자만 고정 순서(카카오·네이버·구글)로", () => {
    expect(parseProviders("google, kakao ,naver")).toEqual(["kakao", "naver", "google"]);
    expect(parseProviders("GOOGLE")).toEqual(["google"]);
  });
  it("모르는 값·중복·빈 값은 버린다", () => {
    expect(parseProviders("facebook,google,google")).toEqual(["google"]);
    expect(parseProviders("")).toEqual([]);
    expect(parseProviders(undefined)).toEqual([]);
  });
  it("네이버는 커스텀 제공자 id 를 쓴다", () => {
    expect(PROVIDER_INFO.naver.supabaseId).toBe("custom:naver");
    expect(PROVIDER_INFO.google.supabaseId).toBe("google");
  });
  it("오류 문구", () => {
    expect(oauthErrorKo("Unsupported provider: provider is not enabled")).toContain("준비 중");
    expect(oauthErrorKo("boom")).toContain("문제가");
  });
});
