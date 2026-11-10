import { describe, expect, it } from "vitest";
import { compat, personFromPreview, type Person } from "@/lib/compat";
import { decodeInvite, encodeInvite } from "@/lib/invite";
import { previewFromBirthInput } from "@/lib/saju-engine";

const mk = (name: string, date: string, time: string | null = "12:00") =>
  personFromPreview(
    name,
    previewFromBirthInput({
      name,
      calendar: "solar",
      leap: false,
      date,
      time,
      gender: "f",
    }),
  )!;

describe("궁합", () => {
  const a = mk("나영", "1990-05-15", "14:30");
  const b = mk("민수", "1992-03-02");
  it("같은 입력이면 같은 결과이고 온도는 0~99", () => {
    expect(compat(a, b)).toEqual(compat(a, b));
    const t = compat(a, b).temp;
    expect(t).toBeGreaterThanOrEqual(60);
    expect(t).toBeLessThanOrEqual(99);
  });
  it("검증 전 용어를 쓰지 않는다", () => {
    const all = JSON.stringify([compat(a, b), compat(b, a), compat(a, a)]);
    expect(all).not.toMatch(
      /격국|용신|신강|신약|십성|대운|세운|합충|삼합|육합/,
    );
  });
  it("같은 사람끼리는 쌍둥이 케미", () => {
    expect(compat(a, a).kind).toBe("twin");
  });
  it("모든 일간 조합이 세 종류 중 하나로 계산된다", () => {
    const kinds = new Set<string>();
    for (let s1 = 0; s1 < 10; s1++)
      for (let s2 = 0; s2 < 10; s2++) {
        const p = (s: number): Person => ({
          name: "가",
          stem: s,
          branch: 0,
          counts: { 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 },
        });
        kinds.add(compat(p(s1), p(s2)).kind);
      }
    expect([...kinds].sort()).toEqual(["support", "train", "twin"]);
  });
});

describe("초대 코드", () => {
  const a = mk("나영", "1990-05-15", "14:30");
  it("왕복하고 생년월일 같은 값은 담지 않는다", () => {
    const code = encodeInvite(a);
    expect(decodeInvite(code)).toEqual(a);
    expect(Buffer.from(code, "base64url").toString("utf8")).not.toContain(
      "1990",
    );
  });
  it("한글 이름도 안전하게 왕복한다", () => {
    const p = { ...a, name: "김나영" };
    expect(decodeInvite(encodeInvite(p))?.name).toBe("김나영");
  });
  it("잘못된 코드는 모두 거부한다", () => {
    for (const bad of [
      "",
      "abc",
      "!!!",
      "e30",
      encodeInvite({ ...a, name: "" }),
      "A".repeat(300),
    ])
      expect(decodeInvite(bad)).toBeNull();
    const evil = btoa(JSON.stringify([1, "x", 99, 0, [1, 1, 1, 1, 4]])).replace(
      /=+$/,
      "",
    );
    expect(decodeInvite(evil)).toBeNull();
    const badSum = btoa(
      JSON.stringify([1, "x", 1, 1, [1, 1, 1, 1, 1]]),
    ).replace(/=+$/, "");
    expect(decodeInvite(badSum)).toBeNull();
  });
});
