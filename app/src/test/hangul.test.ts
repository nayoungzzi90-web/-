import { describe, expect, it } from "vitest";
import { hangulOnly } from "@/lib/hangul";
import { buildReading, buildVerdict } from "@/lib/reading";
import { computeDaeunForBirth } from "@/lib/daeun";
import { previewFromBirthInput } from "@/lib/saju-engine";

const HANJA = /[㐀-䶿一-鿿]/;

describe("한글만으로 바꾸기", () => {
  it("괄호 한자·간지·오행 글자를 한글로 바꾼다", () => {
    expect(hangulOnly("쇠(金)가 하나도 없어요")).toBe("쇠가 하나도 없어요");
    expect(hangulOnly("올해 丙午(병오)년은")).toBe("올해 병오년은");
    expect(hangulOnly("일지 未(흙)가")).toBe("일지 미(흙)가");
    expect(hangulOnly("다섯 기운의 지도: 木2 火2 土2 金0 水2")).toBe("다섯 기운의 지도: 나무 2 불 2 흙 2 쇠 0 물 2");
    expect(hangulOnly("불(火) 기운 위에 흙(土) 기운")).toBe("불 기운 위에 흙 기운");
  });
  it("한자가 없는 문장은 그대로 둔다", () => {
    const t = "조용히 오래 타오르는 집중력이에요.";
    expect(hangulOnly(t)).toBe(t);
  });
  it("모든 풀이·점괘 문장을 바꾸면 한자가 하나도 남지 않고, '병오(병오)' 같은 되풀이도 없다", () => {
    const now = new Date("2026-11-12T12:00:00+09:00");
    let n = 0;
    for (let y = 1960; y <= 2010; y += 5)
      for (let m = 1; m <= 12; m++) {
        const me = {
          name: "테스트", calendar: "solar" as const, leap: false,
          date: `${y}-${String(m).padStart(2, "0")}-${String((y % 27) + 1).padStart(2, "0")}`,
          time: m % 3 === 0 ? null : "10:20", gender: (m % 2 ? "f" : "m") as "f" | "m",
        };
        const p = previewFromBirthInput(me);
        const rd = buildReading(p, now, computeDaeunForBirth(me));
        if (!rd) continue;
        n++;
        const texts = rd.sections.flatMap((s) => [s.eyebrow, s.title, ...s.body]);
        for (const c of ["이직", "연애", "돈", "시험", "가족", "우울", "그냥"]) {
          const v = buildVerdict(p, `${c} 고민`, now)!;
          texts.push(v.headline, v.text, v.personal, ...v.todo);
        }
        for (const t of texts) {
          const k = hangulOnly(t);
          expect(k, t).not.toMatch(HANJA);
          expect(k).not.toMatch(/([가-힣]+)\(\1\)/);
          expect(k).not.toMatch(/\(\s*\)/);
        }
      }
    expect(n).toBeGreaterThan(100);
  });
});
