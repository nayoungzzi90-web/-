import { describe, expect, it } from "vitest";
import { PACKS, ledgerLabel, ledgerText } from "@/lib/charge";
import { COIN_KRW, won } from "@/lib/coins";

describe("닢 충전 팩·내역 문구", () => {
  it("1닢=1,000원이고 팩은 1~4닢", () => {
    expect(COIN_KRW).toBe(1000);
    expect(won(3)).toBe("3,000원");
    expect(PACKS.map((p) => p.coins)).toEqual([1, 2, 3, 4]);
    expect(PACKS.map((p) => p.amountKrw)).toEqual([1000, 2000, 3000, 4000]);
  });
  it("내역 문구", () => {
    expect(ledgerLabel("purchase")).toBe("닢 충전");
    expect(ledgerLabel("unknown")).toBe("기타");
    expect(ledgerText({ id: 1, delta: 1, reason: "purchase", ref: null, balanceAfter: 3, createdAt: "2026-11-19T00:00:00Z" })).toBe("닢 충전 +1닢 (잔액 3닢)");
    expect(ledgerText({ id: 2, delta: -2, reason: "spend", ref: null, balanceAfter: 1, createdAt: "2026-11-19T00:00:00Z" })).toBe("풀이 열람 -2닢 (잔액 1닢)");
  });
});
