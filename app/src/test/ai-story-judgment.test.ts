import { describe, expect, it } from "vitest";
import { buildStoryFacts } from "@/lib/ai-story-facts";
import { branchLinks, computeNeed, computeStrength, elementSignal, moodOf, stageSignal } from "@/lib/ai-story-judgment";
import { ELEMENTS, relation, stemElement } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";

// 일반 이론 판정(원문 규칙 구현이 아님, 전문가 검증 전)의 내부 일관성 시험. 명리학적 정확성의 검증이 아니다.
const charts = (() => {
  const out: { date: string; time: string | null }[] = [];
  for (let y = 1950; y <= 2040; y += 3)
    for (let m = 1; m <= 12; m += 1)
      out.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(((y + m) % 27) + 1).padStart(2, "0")}`, time: (y + m) % 4 === 0 ? null : "09:40" });
  return out;
})();
const pre = (c: { date: string; time: string | null }) =>
  previewFromBirthInput({ name: "t", calendar: "solar", leap: false, date: c.date, time: c.time, gender: "f" });
const HANJA = /[㐀-䶿一-鿿]/;

describe("일간 강약 후보 판정", () => {
  it("득령·득지·득세 예/아니오 개수와 이름이 일치한다(4단계, 점수 합산 없음)", () => {
    const seen = new Set<string>();
    for (const c of charts) {
      const p = pre(c);
      if (!p.ok || !p.pillars) continue;
      const st = computeStrength(p.pillars);
      const n = Number(st.ryeong) + Number(st.ji) + Number(st.se);
      expect(st.label).toBe(n === 3 ? "신강" : n === 2 ? "신강 경향" : n === 1 ? "신약 경향" : "신약");
      expect(st.side).toBe(n >= 2 ? "strong" : "weak");
      expect(st.evidence).toHaveLength(3);
      seen.add(st.label);
    }
    expect(seen.size).toBe(4); // 네 가지 판정이 모두 실제로 나온다
  });
  it("토월은 지장간까지 보는 잠정 규칙이 적용된다(정화 일간 × 미월)", () => {
    const p = pre({ date: "1995-07-15", time: "10:20" });
    const st = computeStrength(p.pillars!);
    expect(st.ryeong).toBe(true);
    expect(st.evidence[0]).toContain("토월");
  });
});

describe("필요한 기운(용신 후보) 판정", () => {
  it("모든 표본에서 후보 구성·우선 규칙·희신·기신이 일관된다", () => {
    for (const c of charts) {
      const p = pre(c);
      if (!p.ok || !p.pillars || !p.elements) continue;
      const st = computeStrength(p.pillars);
      const need = computeNeed(p.pillars, p.elements, st);
      const dayEl = stemElement(p.pillars.day.stem);
      expect(need.eokbu.length).toBeGreaterThan(0);
      for (const e of need.eokbu)
        expect(st.side === "strong" ? ["gives", "rules", "pressed"] : ["helps", "same"]).toContain(relation(dayEl, e));
      expect(ELEMENTS).toContain(need.primary);
      expect(relation(need.primary, need.hee)).toBe("helps");
      expect(relation(need.primary, need.gi)).toBe("pressed");
      // 조후가 급한 계절(겨울·여름)이면 조후 기운이 먼저, 아니면 억부 후보 중 하나
      if (need.johuUrgent) expect(need.primary).toBe(need.johu);
      else expect(need.eokbu).toContain(need.primary);
      expect(need.status).toBe("CANDIDATE");
    }
  });
  it("겨울생은 불, 여름생은 물이 조후 기운이다", () => {
    const winter = pre({ date: "2001-12-20", time: "10:00" }); // 자월
    const summer = pre({ date: "2001-07-20", time: "10:00" }); // 미월
    for (const [p, el] of [[winter, "화"], [summer, "수"]] as const) {
      const need = computeNeed(p.pillars!, p.elements!, computeStrength(p.pillars!));
      expect(need.johu).toBe(el);
      expect(need.primary).toBe(el);
    }
  });
});

describe("분위기 판정과 충·육합", () => {
  it("신호의 +와 -를 세어 구간을 정한다(가중치 없음)", () => {
    expect(moodOf(["+", "+", "0"]).label).toBe("오르는 구간");
    expect(moodOf(["+", "-", "0"]).label).toBe("엇갈리는 구간");
    expect(moodOf(["0", "0", "0"]).label).toBe("엇갈리는 구간");
    expect(moodOf(["-", "-", "+"]).label).toBe("쉬어가는 구간");
  });
  it("12운성 단계 신호: 장생·관대·건록·제왕은 +, 병·사·묘·절은 -, 나머지는 0", () => {
    const sig = Array.from({ length: 12 }, (_, i) => stageSignal(i)).join("");
    expect(sig).toBe("+0+++0----00".replace(/^(.{0})/, "$1")); // 장생+ 목욕0 관대+ 건록+ 제왕+ 쇠0 병- 사- 묘- 절- 태0 양0
  });
  it("필요한 기운·희신은 +, 기신은 -", () => {
    const p = pre({ date: "1995-07-15", time: "10:20" });
    const need = computeNeed(p.pillars!, p.elements!, computeStrength(p.pillars!));
    expect(elementSignal(need.primary, need)).toBe("+");
    expect(elementSignal(need.hee, need)).toBe("+");
    expect(elementSignal(need.gi, need)).toBe("-");
  });
  it("지지 충·육합 찾기: 사해충, 오미합", () => {
    const p = pre({ date: "1995-07-15", time: "10:20" }); // 연지 해, 월지 미, 일지 미, 시지 사
    expect(branchLinks(5, p.pillars!)).toContain("연지 해 ↔ 충"); // 사(5) ↔ 해(11)
    expect(branchLinks(6, p.pillars!)).toEqual(expect.arrayContaining(["월지 미 ↔ 육합", "일지 미 ↔ 육합"])); // 오(6) ↔ 미(7)
  });
});

describe("사실 블록의 새 내용", () => {
  const f = buildStoryFacts({ name: "t", calendar: "solar", leap: false, date: "1995-07-15", time: "10:20", gender: "f" }, new Date("2026-11-12T12:00:00+09:00"))!;
  it("강약·필요한 기운·대운 전체·향후 5년이 모두 들어 있고 한자가 없다", () => {
    for (const w of ["[일간 강약 관찰", "[균형과 필요한 기운", "[오행 상징 대응", "[10년 단위 인생 흐름", "[향후 5년", "교운기", "분위기 판정"]) expect(f.text).toContain(w);
    expect(f.text).not.toMatch(HANJA);
    expect(f.years).toEqual([2026, 2027, 2028, 2029, 2030]);
    for (const y of f.years) expect(f.text).toContain(`${y}년`);
    expect(f.daeunNow).toBe("병술");
    expect(f.strengthLabel).toBe("신강 경향");
    expect(f.needName).toBe("물");
  });
  it("대운은 지금 대운에만 [지금] 표시가 있고 열 개가 모두 나온다", () => {
    expect((f.text.match(/\[지금\]/g) ?? []).length).toBe(1);
    expect((f.text.match(/ 대운 만 \d+세~/g) ?? []).length).toBe(10);
  });
  it("판정 용어 '격국'은 사실에 없다", () => {
    expect(f.text).not.toContain("격국");
  });
});

import { branchRelations, positionsOf, stemRelations } from "@/lib/ai-story-relations";
import { observeNeed } from "@/lib/ai-story-judgment";

describe("합·충·형·파·해 발견 계층(성립은 판정하지 않음)", () => {
  const p = pre({ date: "1995-07-15", time: "10:20" }).pillars!; // 을해 계미 정미 을사
  const base = positionsOf(p);
  it("원국: 월간 계↔일간 정 천간충 후보, 연지 해↔시지 사 충", () => {
    expect(stemRelations(base)).toContain("월간 계 ↔ 일간 정: 천간충(부딪힘) 후보");
    expect(branchRelations(base)).toContain("연지 해 ↔ 시지 사: 충");
  });
  it("천간충은 정책으로 끌 수 있다", () => {
    expect(stemRelations(base, undefined, { stemClash: false }).some((x) => x.includes("천간충"))).toBe(false);
  });
  it("세운 오(午): 월지·일지 미와 육합 후보, 사·미와 사오미 방합 후보(세 글자)", () => {
    const r = branchRelations(base, { label: "세운 땅", branch: 6 });
    expect(r).toEqual(expect.arrayContaining(["세운 땅 오 ↔ 월지 미: 육합 후보", "세운 땅 오 ↔ 일지 미: 육합 후보"]));
    expect(r.some((x) => x.startsWith("사오미 방합 후보"))).toBe(true);
    expect(r.every((x) => !x.includes("성립했") && !x.includes("합화되"))).toBe(true);
  });
  it("세운 유(酉): 사유축 반합 후보(왕지 유 포함), 신(申)+사: 육합·파·형이 함께 발견된다", () => {
    expect(branchRelations(base, { label: "세운 땅", branch: 9 }).some((x) => x.startsWith("사유축 반합 후보"))).toBe(true);
    const r = branchRelations(base, { label: "세운 땅", branch: 8 });
    for (const k of ["육합 후보", "파", "형 후보"]) expect(r.some((x) => x.includes("시지 사") && x.endsWith(k))).toBe(true);
  });
  it("천간합 후보: 무(戊)↔계(癸) 이고 합화 성립은 쓰지 않는다", () => {
    const r = stemRelations(base, { label: "세운 하늘", stem: 4 });
    expect(r.some((x) => x.includes("무 ↔ 월간 계") && x.includes("천간합 후보") && x.includes("판정하지 않음"))).toBe(true);
  });
  it("삼합: 원국에 인·오·술 세 글자가 모두 있으면 삼합 후보", () => {
    const fake = [{ label: "연", stem: 0, branch: 2 }, { label: "월", stem: 1, branch: 6 }, { label: "일", stem: 2, branch: 10 }];
    expect(branchRelations(fake).some((x) => x.startsWith("인오술 삼합 후보"))).toBe(true);
  });
  it("자형 후보: 같은 글자(오오)", () => {
    const fake = [{ label: "연", stem: 0, branch: 6 }, { label: "월", stem: 1, branch: 6 }];
    expect(branchRelations(fake)).toContain("연지 오 ↔ 월지 오: 자형 후보");
  });
});

describe("필요한 기운의 실제 작용 관찰", () => {
  it("1995-07-15: 물이 하늘 글자 1개·땅 글자 뿌리 1개, 그 뿌리(해)는 시지 사와 충 → 힘을 쓸 가능성 보통", () => {
    const p = pre({ date: "1995-07-15", time: "10:20" }).pillars!;
    const e = observeNeed(p, "수");
    expect(e.stemCount).toBe(1);
    expect(e.rootCount).toBe(1);
    expect(e.clashedRoots).toBe(1);
    expect(e.level).toBe("보통");
  });
  it("모든 표본에서 등급이 개수·충 상태와 일관된다", () => {
    for (const c of charts) {
      const p = pre(c);
      if (!p.ok || !p.pillars) continue;
      for (const el of ELEMENTS) {
        const e = observeNeed(p.pillars, el);
        const live = e.rootCount - e.clashedRoots;
        expect(e.level).toBe(e.stemCount > 0 && live > 0 ? "튼튼" : e.stemCount > 0 || live > 0 ? "보통" : "약함");
        expect(e.clashedRoots).toBeLessThanOrEqual(e.rootCount);
      }
    }
  });
});

describe("문장 품질: 조사 자리 표시가 없다", () => {
  it("판정 설명 문장 전체에 (을)(를)(이)(가) 같은 자리 표시가 없다", () => {
    for (const c of charts) {
      const p = pre(c);
      if (!p.ok || !p.pillars || !p.elements) continue;
      const st = computeStrength(p.pillars);
      const need = computeNeed(p.pillars, p.elements, st);
      const texts = [...st.evidence, need.eokbuNote, need.johuNote, need.primaryReason, observeNeed(p.pillars, need.primary).evidence];
      for (const t of texts) {
        expect(t).not.toMatch(/\((을|를|이|가|은|는|와|과)\)|을\(를\)|이\(가\)/);
        expect(t).not.toMatch(/[\u3400-\u4DBF\u4E00-\u9FFF]/);
      }
    }
  });
});
