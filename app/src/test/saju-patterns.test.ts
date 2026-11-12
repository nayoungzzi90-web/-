import { describe, expect, it } from "vitest";
import { buildChartPacket } from "../lib/saju-packet";
import { buildPatternTags, PATTERN_CRITERIA } from "../lib/saju-patterns";

const NOW = new Date("2026-11-12T03:00:00Z");
const tags = (date: string, time: string, g: "f" | "m" = "f") =>
  buildPatternTags(buildChartPacket({ name: "", calendar: "solar", leap: false, date, time, gender: g }, NOW)!.packet);

describe("구조 패턴 태그", () => {
  it("검증 사례 1990-04-19 01:10 여성(경오·경진·갑인·갑자)", () => {
    const t = tags("1990-04-19", "01:10");
    const names = t.map((x) => x.태그);
    expect(names).toContain("간여지동");
    expect(names).toEqual(expect.arrayContaining(["양팔통", "같은 천간 병존", "편관 중첩", "군비쟁재"]));
    expect(names).not.toContain("관인상생");
    expect(names).not.toContain("비겁 과다");
    expect(names).not.toContain("관인상생"); // 관성(연간·월간)과 인성(시지) 사이에 일주가 끼어 인접하지 않는다
    expect(t.find((x) => x.태그 === "식상생재")?.근거.join()).toMatch(/월지 편재/);
  });
  it("기준 목록의 태그와 판정 가능한 태그가 같다", () => {
    expect(PATTERN_CRITERIA.map((c) => c.태그)).toHaveLength(PATTERN_CRITERIA.length);
  });
  it("여러 사주에서 태그가 갈리고 모두 기준 목록에 있는 이름이다", () => {
    const all = ["1990-04-19", "1985-03-05", "1978-11-30", "2001-07-21", "1969-12-02", "1996-09-14"].flatMap((d) => tags(d, "10:00", "m").map((x) => x.태그));
    expect(new Set(all).size).toBeGreaterThan(1);
    for (const x of all) expect(PATTERN_CRITERIA.map((c) => c.태그)).toContain(x);
  });
});

describe("재생관·현침살·패킷 연결", () => {
  it("검증 사례: 패킷에 구조패턴태그와 현침살이 들어가고, 태그 이름이 facts와 같다", () => {
    const b = buildChartPacket({ name: "", calendar: "solar", leap: false, date: "1990-04-19", time: "01:10", gender: "f" }, NOW)!;
    expect(b.packet.구조패턴태그.map((t) => t.태그)).toEqual(expect.arrayContaining(["간여지동", "식상생재", "현침살"]));
    expect(b.packet.신살.해당.map((x) => x.이름)).toContain("현침살");
    expect(b.sinsalNames).toContain("현침살");
    expect(b.tags).toEqual(b.packet.구조패턴태그.map((t) => t.태그));
  });
  it("재생관: 재성과 관성이 인접하면 태그가 붙는다", () => {
    const names = ["1990-04-19", "1985-03-05", "1978-11-30", "2001-07-21", "1969-12-02", "1996-09-14", "1988-08-08", "1975-01-25"].flatMap((d) => tags(d, "10:00", "m").map((x) => x.태그));
    expect(names).toContain("재생관");
  });
});
