import { describe, expect, it } from "vitest";
import { computeDaeunForBirth } from "@/lib/daeun";
import { buildReading, buildVerdict, classifyConcern, ganjiYearAt, yearGanji } from "@/lib/reading";
import { previewFromBirthInput } from "@/lib/saju-engine";

// 2단계 풀이 심화: 모든 일간·월지 조합에서 빈 문장·깨진 문장이 없고,
// 전문가 검증 전 판정(격국·용신·신강신약·십성·대운·세운)을 단정하지 않는지 확인한다.
const FORBIDDEN = ["격국", "용신", "신강", "신약", "십성", "대운", "세운", "undefined", "NaN", "[object"];

function dates(): string[] {
  const out: string[] = [];
  // 일간 10종 × 월지 12종을 모두 덮도록 1990~2025년에서 약 5일 간격으로 뽑는다.
  for (let y = 1990; y <= 2025; y += 5) {
    for (let m = 1; m <= 12; m++) for (const d of [3, 12, 21, 28]) {
      out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return out;
}

describe("풀이 심화(2단계)", () => {
  it("시간 포함: 섹션 13개, 모든 문장이 채워지고 금지 용어가 없다", () => {
    const stems = new Set<number>();
    const branches = new Set<number>();
    let n = 0;
    for (const date of dates()) {
      const p = previewFromBirthInput({
        name: "테스트",
        calendar: "solar",
        leap: false,
        date,
        time: "10:20",
        gender: "f",
      });
      if (!p.ok || !p.pillars) continue;
      const rd = buildReading(p);
      expect(rd).not.toBeNull();
      stems.add(p.pillars.day.stem);
      branches.add(p.pillars.month.branch);
      expect(rd!.sections.map((s) => s.id)).toEqual([
        "summary", "inner", "elements", "day", "season", "stage",
        "love", "work", "people", "year", "advice", "charm", "habit",
      ]);
      for (const s of rd!.sections) {
        const all = [s.eyebrow, s.title, ...s.summary, ...s.body, ...s.basis];
        for (const t of all) {
          expect(t.trim().length).toBeGreaterThan(1);
          for (const bad of FORBIDDEN) expect(t).not.toContain(bad);
        }
        expect(s.summary).toHaveLength(3);
        expect(s.body.length).toBeGreaterThanOrEqual(1);
      }
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(380);
    expect(stems.size).toBe(10); // 일간 10종 모두 덮음
    expect(branches.size).toBe(12); // 월지 12종 모두 덮음
  });

  it("시간 미상: 시주 없이도 계산되고 안내 문장이 들어간다", () => {
    const p = previewFromBirthInput({
      name: "테스트",
      calendar: "solar",
      leap: false,
      date: "1995-07-15",
      time: null,
      gender: "m",
    });
    const rd = buildReading(p)!;
    const stage = rd.sections.find((s) => s.id === "stage")!;
    expect(stage.body.join(" ")).toContain("시주");
    expect(stage.basis).toHaveLength(3);
  });
});

describe("지금 10년의 계절(대운 연결)", () => {
  const BAD = ["격국", "용신", "신강", "신약", "십성", "undefined", "NaN", "[object"];
  const input = (date: string, gender: "f" | "m", time: string | null) => ({
    name: "테스트",
    calendar: "solar" as const,
    leap: false,
    date,
    time,
    gender,
  });

  it("대운 없이 부르면 섹션이 13개, 대운이 있으면 'year' 다음에 'daeun'이 들어간다", () => {
    const me = input("1995-07-15", "f", "10:20");
    const p = previewFromBirthInput(me);
    const now = new Date("2026-11-12T12:00:00+09:00");
    expect(buildReading(p, now)!.sections).toHaveLength(13);
    const d = computeDaeunForBirth(me);
    expect(d).not.toBeNull();
    const rd = buildReading(p, now, d)!;
    expect(rd.sections.map((s) => s.id)).toEqual([
      "summary", "inner", "elements", "day", "season", "stage",
      "love", "work", "people", "year", "daeun", "advice", "charm", "habit",
    ]);
  });

  it("현재 대운은 엔진 대운표에서 나이에 맞는 칸이고, 문장에 십성 이름·단정 용어가 없다", () => {
    let n = 0;
    for (const date of ["1970-03-10", "1985-09-21", "1995-07-15", "2003-12-30", "2015-05-05"]) {
      for (const gender of ["f", "m"] as const) {
        for (const time of ["10:20", null]) {
          const me = input(date, gender, time);
          const d = computeDaeunForBirth(me)!;
          const now = new Date("2026-11-12T12:00:00+09:00");
          const age = (now.getTime() - d.birthUtcMs) / (365.2425 * 86_400_000);
          const rd = buildReading(previewFromBirthInput(me), now, d)!;
          const s = rd.sections.find((x) => x.id === "daeun");
          let cur = -1;
          d.pillars.forEach((p, i) => {
            if (p.startAgeYears <= age) cur = i;
          });
          if (age >= d.pillars[9]!.startAgeYears + 10) {
            expect(s).toBeUndefined();
            continue;
          }
          expect(s).toBeDefined();
          const want = d.pillars[Math.max(cur, 0)]!;
          expect(s!.basis.join(" ")).toContain(want.hanja);
          expect(s!.summary).toHaveLength(3);
          for (const t of [s!.eyebrow, s!.title, ...s!.summary, ...s!.body, ...s!.basis]) {
            expect(t.trim().length).toBeGreaterThan(1);
            for (const bad of BAD) expect(t).not.toContain(bad);
            for (const g of ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"])
              expect(t).not.toContain(g);
          }
          if (time === null) expect(s!.body.join(" ")).toContain("정오로 가정");
          n++;
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(15);
  });
});

describe("올해·내년 흐름", () => {
  it("해의 간지: 2024 갑진, 2025 을사, 2026 병오, 2027 정미, 1984 갑자", () => {
    expect(yearGanji(2024).ko).toBe("갑진");
    expect(yearGanji(2025).hanja).toBe("乙巳");
    expect(yearGanji(2026).hanja).toBe("丙午");
    expect(yearGanji(2027).ko).toBe("정미");
    expect(yearGanji(1984).ko).toBe("갑자");
  });

  it("해가 바뀌는 때는 입춘 (2026년은 2월 4일 새벽 전후)", () => {
    expect(ganjiYearAt(new Date("2026-01-15T00:00:00+09:00"))).toBe(2025);
    expect(ganjiYearAt(new Date("2026-02-03T12:00:00+09:00"))).toBe(2025);
    expect(ganjiYearAt(new Date("2026-02-05T12:00:00+09:00"))).toBe(2026);
    expect(ganjiYearAt(new Date("2026-11-12T12:00:00+09:00"))).toBe(2026);
  });

  it("섹션은 기준 시각의 올해·내년 간지를 쓰고, 시각이 바뀌면 간지도 바뀐다", () => {
    const p = previewFromBirthInput({
      name: "테스트",
      calendar: "solar",
      leap: false,
      date: "1995-07-15",
      time: "10:20",
      gender: "f",
    });
    const a = buildReading(p, new Date("2026-11-12T12:00:00+09:00"))!;
    const basis = a.sections.find((s) => s.id === "year")!.basis.join(" ");
    expect(basis).toContain("丙午");
    expect(basis).toContain("丁未");
    const b = buildReading(p, new Date("2027-03-01T12:00:00+09:00"))!;
    expect(b.sections.find((s) => s.id === "year")!.basis.join(" ")).toContain("戊申");
  });
});

describe("고민별 맞춤 풀이", () => {
  const CONCERNS: [string, string][] = [
    ["이직·일", "요즘 전직을 해야 할지 고민이에요"],
    ["연애·결혼", "남자친구와 권태기가 온 것 같아요"],
    ["돈·재물", "적금을 들지 부동산을 알아볼지 모르겠어요"],
    ["시험·공부", "임용 시험 준비가 막막해요"],
    ["관계·가족", "시댁과의 관계가 힘들어요"],
    ["건강·마음", "요즘 무기력하고 잠이 안 와요"],
    ["기타", "그냥 뭔가 답답해요"],
  ];
  const BAD = ["격국", "용신", "신강", "신약", "십성", "대운", "세운", "undefined", "NaN", "[object"];
  const now = new Date("2026-11-12T12:00:00+09:00");

  it("새 키워드가 맞는 분류로 들어간다(남자친구는 관계가 아니라 연애)", () => {
    for (const [key, text] of CONCERNS) expect(classifyConcern(text)).toBe(key);
  });

  it("분류 7종 × 일간 10종: 문장이 채워지고, 같은 분류라도 일간마다 문장이 다르다", () => {
    const byStem = new Map<string, Set<string>>();
    const seenStems = new Set<number>();
    for (const date of dates()) {
      const p = previewFromBirthInput({
        name: "테스트",
        calendar: "solar",
        leap: false,
        date,
        time: "10:20",
        gender: "f",
      });
      if (!p.ok || !p.pillars) continue;
      const stem = p.pillars.day.stem;
      for (const [key, text] of CONCERNS) {
        const v = buildVerdict(p, text, now)!;
        expect(v.category).toBe(key);
        expect(v.todo).toHaveLength(3);
        expect(v.basis.join(" ")).toContain("丙午");
        for (const tx of [v.headline, v.text, v.personal, ...v.todo, ...v.basis]) {
          expect(tx.trim().length).toBeGreaterThan(1);
          for (const bad of BAD) expect(tx).not.toContain(bad);
        }
        const k = `${key}`;
        if (!byStem.has(k)) byStem.set(k, new Set());
        byStem.get(k)!.add(`${stem}:${v.personal}`);
      }
      seenStems.add(stem);
    }
    expect(seenStems.size).toBe(10);
    // 분류별로 일간 10종이 모두 서로 다른 개인 문장을 낸다(시험·공부는 오행 5종)
    for (const [key] of CONCERNS) {
      const distinct = new Set([...byStem.get(key)!].map((s) => s.split(":").slice(1).join(":")));
      expect(distinct.size).toBeGreaterThanOrEqual(key === "시험·공부" ? 5 : 10);
    }
  });

  it("분류마다 고민 맞춤 할 일 2개가 들어가고 서로 다르다", () => {
    const p = previewFromBirthInput({
      name: "테스트",
      calendar: "solar",
      leap: false,
      date: "1995-07-15",
      time: "10:20",
      gender: "f",
    });
    const firsts = new Set(CONCERNS.map(([, text]) => buildVerdict(p, text, now)!.todo[0]));
    expect(firsts.size).toBe(7);
  });
});

describe("문장 품질(조사·중복)", () => {
  it("조사 자리 표시(이(가))와 받침 오류, 같은 섹션 안 같은 문장 반복이 없다", () => {
    const now = new Date("2026-11-12T12:00:00+09:00");
    let n = 0;
    for (let y = 1960; y <= 2010; y += 3)
      for (let m = 1; m <= 12; m++)
        for (const d of [5, 20]) {
          const me = {
            name: "테스트",
            calendar: "solar" as const,
            leap: false,
            date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            time: m % 3 === 0 ? null : "10:20",
            gender: (m % 2 ? "f" : "m") as "f" | "m",
          };
          const rd = buildReading(previewFromBirthInput(me), now, computeDaeunForBirth(me));
          if (!rd) continue;
          n++;
          for (const s of rd.sections) {
            const all = [s.title, ...s.summary, ...s.body, ...s.basis];
            for (const t of all) {
              expect(t).not.toMatch(/이\(가\)|을\(를\)|은\(는\)|와\(과\)/);
              expect(t).not.toMatch(/쇠\(金\)이|쇠이 /);
              expect(t).not.toMatch(/ {2}|\.\./);
              expect(t).not.toMatch(/10년로|분위기이라|\)\)/);
            }
            if (s.id === "year") {
              const sents = s.body.join(" ").split(/(?<=[.!?])\s+/);
              expect(new Set(sents).size).toBe(sents.length);
            }
          }
        }
    expect(n).toBeGreaterThan(300);
  });

  it("조사 보정 예: 쇠(金)가 하나도 없는 사주는 '쇠(金)가'로 쓴다", () => {
    let found = false;
    for (let y = 1960; y <= 2010 && !found; y++)
      for (let m = 1; m <= 12 && !found; m++) {
        const rd = buildReading(
          previewFromBirthInput({
            name: "테스트", calendar: "solar", leap: false,
            date: `${y}-${String(m).padStart(2, "0")}-10`, time: "10:20", gender: "f",
          }),
        );
        if (rd && rd.missing.length === 1 && rd.missing[0] === "금") {
          const t = rd.sections[0]!.summary.concat(rd.sections[0]!.body).join(" ");
          expect(t).toContain("쇠(金)가 하나도 없어요");
          found = true;
        }
      }
    expect(found).toBe(true);
  });
});

describe("점괘 문장 품질", () => {
  it("점괘 본문에 '분위기이라' 같은 조사 오류가 없다", () => {
    for (let y = 1960; y <= 2010; y += 5)
      for (let m = 1; m <= 12; m++) {
        const p = previewFromBirthInput({
          name: "테스트", calendar: "solar", leap: false,
          date: `${y}-${String(m).padStart(2, "0")}-12`, time: "10:20", gender: "f",
        });
        for (const c of ["이직", "연애", "돈", "시험", "가족", "우울", "그냥"]) {
          const v = buildVerdict(p, `${c} 고민`, new Date("2026-11-12T12:00:00+09:00"))!;
          expect(v.text).not.toMatch(/분위기이라|\)\)|이\(가\)/);
        }
      }
  });
});
