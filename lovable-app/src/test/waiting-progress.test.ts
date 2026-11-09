import { describe, expect, it } from "vitest";
import { estimateWait, WAIT_CAP_PERCENT } from "@/lib/waiting-progress";

describe("예상 진행률", () => {
  it("처음엔 0%, 예상 시간의 절반이면 45% 안팎, 남은 시간은 5초 단위", () => {
    expect(estimateWait(0, 45)).toEqual({ percent: 0, remainingSec: 45 });
    const mid = estimateWait(22, 45);
    expect(mid.percent).toBe(44);
    expect(mid.remainingSec).toBe(25);
  });
  it("예상 시간 직전에도 90%를 넘지 않고, 시간이 지나면 남은 시간 대신 null", () => {
    expect(estimateWait(44, 45).percent).toBeLessThanOrEqual(90);
    expect(estimateWait(45, 45).remainingSec).toBeNull();
  });
  it("아무리 오래 걸려도 95%를 넘기지 않는다(끝나기 전 100% 거짓말 금지)", () => {
    for (const s of [60, 120, 600, 100000]) {
      const r = estimateWait(s, 45);
      expect(r.percent).toBeLessThanOrEqual(WAIT_CAP_PERCENT);
      expect(r.percent).toBeGreaterThanOrEqual(90);
    }
  });
  it("진행률은 시간이 갈수록 줄어들지 않는다", () => {
    let prev = -1;
    for (let s = 0; s < 400; s += 3) {
      const p = estimateWait(s, 45).percent;
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
  it("이상한 값도 안전하다(음수·너무 짧은 예상 시간)", () => {
    expect(estimateWait(-5, 45).percent).toBe(0);
    expect(estimateWait(5, 1).percent).toBeLessThanOrEqual(90);
  });
});
