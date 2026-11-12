import { describe, expect, it } from "vitest";
import { buildChartPacket, packetJson } from "../lib/saju-packet";

const GOLD = { name: "홍길동", calendar: "solar" as const, leap: false, date: "1990-04-19", time: "01:10", gender: "f" as const };
const NOW = new Date("2026-11-12T03:00:00Z");

describe("계산 결과 JSON 패킷", () => {
  it("검증 사례: 1990-04-19 01:10 여성 → 庚午·庚辰·甲寅·甲子", () => {
    const b = buildChartPacket(GOLD, NOW)!;
    expect(b).not.toBeNull();
    const g = Object.fromEntries(b.packet.네기둥.map((p) => [p.기둥, p.간지]));
    expect(g).toEqual({ 연주: "경오", 월주: "경진", 일주: "갑인", 시주: "갑자" });
    expect(b.packet.일간.이름).toBe("갑목");
  });
  it("이름·생년월일은 담기지 않고 결과는 결정적이다", () => {
    const a = packetJson(buildChartPacket(GOLD, NOW)!.packet);
    expect(a).not.toContain("홍길동");
    expect(a).not.toContain("1990");
    expect(a).not.toMatch(/[一-鿿]/);
    expect(packetJson(buildChartPacket(GOLD, NOW)!.packet)).toBe(a);
  });
  it("대운·향후 5년·오행 합계가 일관된다", () => {
    const { packet } = buildChartPacket(GOLD, NOW)!;
    expect(packet.향후5년).toHaveLength(5);
    expect(packet.대운.목록.filter((r) => r.지금).length).toBeLessThanOrEqual(1);
    expect(Object.values(packet.오행개수).reduce((x, y) => x + y, 0)).toBe(8);
  });
  it("시간을 모르면 시주가 없다", () => {
    const b = buildChartPacket({ ...GOLD, time: "" }, NOW);
    if (b) expect(b.packet.네기둥.some((p) => p.기둥 === "시주")).toBe(false);
  });
});
