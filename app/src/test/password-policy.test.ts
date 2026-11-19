import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password-policy";

describe("가입 비밀번호 기준", () => {
  it("8자 미만·72자 초과 거부", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(passwordProblem("abc1234")).toContain("8자 이상");
    expect(passwordProblem("a".repeat(73) + "1")).toContain("72자");
    expect(passwordProblem("Abcd1234x")).toBeNull();
  });
  it("흔한 비밀번호·반복 글자·이메일 포함 거부", () => {
    expect(passwordProblem("password")).toContain("흔한");
    expect(passwordProblem("12345678")).toContain("흔한");
    expect(passwordProblem("aaaaaaaa")).toContain("반복");
    expect(passwordProblem("hongGildong!1", "honggildong@example.com")).toContain("이메일");
    expect(passwordProblem("zzzz1234Q", "ab@example.com")).toBeNull(); // 짧은 아이디는 검사 안 함
  });
  it("한글·공백이 섞여도 길이만 본다", () => {
    expect(passwordProblem("사주팔자가좋아요1")).toBeNull();
    expect(passwordProblem("a b c d e f")).toBeNull();
  });
});
