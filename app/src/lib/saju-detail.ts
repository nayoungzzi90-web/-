// 명리 상세 분석(일반 이론 · 전문가 검증 전) — AI 사실 블록과 화면의 "상세 분석 보기"가 같은 계산을 쓰도록 한 곳에 모은다.
import type { Daeun } from "./daeun";
import {
  computeNeed, computeStrength, elementSignal, moodOf, observeNeed, stageSignal,
  type MoodResult, type NeedEffect, type NeedResult, type Signal, type StrengthResult,
} from "./ai-story-judgment";
import { branchRelations, positionsOf, stemRelations } from "./ai-story-relations";
import { ganjiYearAt, yearGanji, branchElement, stemElement, type Element } from "./reading";
import type { Pillar } from "./saju";
import { tenGodOf, type TenGod } from "./ten-gods";
import { STAGE_KO, stageIndex } from "./twelve-stages";

type P4 = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };

export interface TimeRow {
  kind: "대운" | "세운";
  name: string; // 병술 / 병오
  range: string; // 만 27세~37세(2023년경~) 또는 2026년
  stemTenGod: TenGod;
  stage: string; // 일간의 12운성
  stemSignal: Signal;
  branchSignal: Signal;
  links: string[];
  mood: MoodResult;
  now: boolean;
  stem: number;
  branch: number;
  year?: number;
}
export interface Detail {
  strength: StrengthResult;
  need: NeedResult;
  effect: NeedEffect;
  natal: string[];
  daeun: TimeRow[];
  daeunNowName: string | null;
  nextChange: { year: number; age: number } | null;
  years: TimeRow[];
}

export const signalWord = (s: Signal) => (s === "+" ? "도움" : s === "-" ? "부담" : "중립");

export function computeDetail(pil: P4, counts: Record<Element, number>, daeun: Daeun | null, now: Date): Detail {
  const dm = pil.day.stem;
  const strength = computeStrength(pil);
  const need = computeNeed(pil, counts, strength);
  const effect = observeNeed(pil, need.primary);
  const base = positionsOf(pil);
  const natal = [...stemRelations(base), ...branchRelations(base)];
  const row = (kind: "대운" | "세운", name: string, range: string, stem: number, branch: number, extra: Partial<TimeRow>): TimeRow => {
    const stg = stageIndex(dm, branch);
    const sSig = elementSignal(stemElement(stem), need);
    const bSig = elementSignal(branchElement(branch), need);
    const tag = kind === "대운" ? "대운" : "세운";
    const links = [...stemRelations(base, { label: `${tag} 하늘`, stem }), ...branchRelations(base, { label: `${tag} 땅`, branch })].slice(0, 5);
    return {
      kind, name, range, stemTenGod: tenGodOf(dm, stem), stage: STAGE_KO[stg]!, stemSignal: sSig, branchSignal: bSig, links,
      mood: moodOf([stageSignal(stg), sSig, bSig]), now: false, stem, branch, ...extra,
    };
  };
  let daeunRows: TimeRow[] = [];
  let nowName: string | null = null;
  let nextChange: Detail["nextChange"] = null;
  if (daeun) {
    const nowAge = (now.getTime() - daeun.birthUtcMs) / (365.2425 * 86_400_000);
    let idx = -1;
    daeun.pillars.forEach((x, i) => { if (x.startAgeYears <= nowAge) idx = i; });
    daeunRows = daeun.pillars.map((x, i) => {
      const next = daeun.pillars[i + 1];
      return row("대운", x.ko, `만 ${x.startAge.years}세~${next ? next.startAge.years : x.startAge.years + 10}세(${x.startYear}년경~)`, x.stem, x.branch, { now: i === idx });
    });
    const cur = daeun.pillars[Math.max(idx, 0)]!;
    nowName = cur.ko;
    const nxt = daeun.pillars[Math.max(idx, 0) + 1];
    if (nxt) nextChange = { year: nxt.startYear, age: nxt.startAge.years };
  }
  const y1 = yearGanji(ganjiYearAt(now));
  const years = [0, 1, 2, 3, 4].map((k) => {
    const y = yearGanji(y1.year + k);
    return row("세운", y.ko, `${y.year}년`, y.stem, y.branch, { year: y.year, now: k === 0 });
  });
  return { strength, need, effect, natal, daeun: daeunRows, daeunNowName: nowName, nextChange, years };
}

/** 오행 개수(천간·지지 각 글자 기준, 시주 없으면 여섯 글자) — 엔진의 preview.elements 와 같은 방식 */
export function countElements(pil: P4): Record<Element, number> {
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const x of [pil.year, pil.month, pil.day, ...(pil.hour ? [pil.hour] : [])]) {
    out[stemElement(x.stem)]++;
    out[branchElement(x.branch)]++;
  }
  return out;
}
