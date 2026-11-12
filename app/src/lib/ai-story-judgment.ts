// AI '풍부한 해석'에 쓰는 일반 이론 판정(일간 강약·필요한 기운·대운/연도 분위기).
//
// 출처 상태(중요): 저장소의 R-006(왕쇠)·R-011~R-014(용신) 원문은 DRAFT-1이고 구현·전문가 검증이 없다.
// 이 파일은 원문 규칙의 구현이 아니라, 입문서에서 흔히 쓰는 "득령·득지·득세" 방식과 억부·조후 관점을
// 점수 합산 없이 예/아니오 조건으로 옮긴 **일반 이론의 후보 판정**이다(2026-11-12 사용자 요청: 신강신약·용신·대운은 참고).
//  · 모든 결과는 CONDITIONAL/CANDIDATE 이며 "일반 이론, 전문가 검증 전"으로 화면·글에 밝힌다.
//  · 특수 구조(종격 등)·합충에 의한 변화·격국은 반영하지 않는다(격국은 계산하지 않는다).
//  · 생활 처방용 우선 기운을 고르는 규칙(조후 급함 → 조후 우선, 아니면 억부 후보 중 가장 적은 오행)은 임시 규칙이다.
import { hiddenStemsOf, mainStemOf } from "./hidden-stems";
import { ELEMENTS, EL_WORD, branchElement, relation, stemElement, type Element } from "./reading";
import type { Pillar } from "./saju";
import { tenGodOf, type TenGod } from "./ten-gods";

type P4 = { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
export type JudgmentStatus = "CONDITIONAL" | "CANDIDATE";

const helpsMe = (r: ReturnType<typeof relation>) => r === "same" || r === "helps";

export interface StrengthResult {
  ryeong: boolean; // 득령: 태어난 달의 지지가 일간을 돕는다
  ji: boolean; // 득지: 일지 속 글자가 일간을 돕는다(뿌리)
  se: boolean; // 득세: 돕는 글자가 힘을 빼는 글자보다 많다
  helpCount: number;
  drainCount: number;
  label: "신강" | "신강 경향" | "신약 경향" | "신약";
  side: "strong" | "weak";
  status: JudgmentStatus;
  evidence: string[];
}

export function computeStrength(p: P4): StrengthResult {
  const dm = p.day.stem;
  const dayEl = stemElement(dm);
  const mEl = branchElement(p.month.branch);
  // 토월(축·진·미·술)은 지지 하나의 오행만으로 월령을 정하기 어려워 지장간까지 본다(잠정 규칙, R-002도 토월은 잠정)
  const earthMonth = [1, 4, 7, 10].includes(p.month.branch);
  const byBase = helpsMe(relation(dayEl, mEl));
  const byHidden = earthMonth && !byBase && hiddenStemsOf(p.month.branch).some((h) => helpsMe(relation(dayEl, stemElement(h.stem))));
  const ryeong = byBase || byHidden;
  const hid = hiddenStemsOf(p.day.branch);
  const rootStems = hid.filter((h) => helpsMe(relation(dayEl, stemElement(h.stem))));
  const ji = rootStems.length > 0;
  // 일간 자신은 빼고, 보이는 천간(연·월·시)과 네 지지의 본기를 센다
  const seen: number[] = [p.year.stem, p.month.stem, ...(p.hour ? [p.hour.stem] : [])];
  const mains = [p.year, p.month, p.day, ...(p.hour ? [p.hour] : [])].map((x) => mainStemOf(x.branch));
  let help = 0;
  let drain = 0;
  for (const s of [...seen, ...mains]) {
    if (helpsMe(relation(dayEl, stemElement(s)))) help++;
    else drain++;
  }
  const se = help > drain;
  const n = Number(ryeong) + Number(ji) + Number(se);
  const label = n === 3 ? "신강" : n === 2 ? "신강 경향" : n === 1 ? "신약 경향" : "신약";
  return {
    ryeong, ji, se, helpCount: help, drainCount: drain, label,
    side: n >= 2 ? "strong" : "weak",
    status: n === 3 || n === 0 ? "CONDITIONAL" : "CANDIDATE",
    evidence: [
      `월령(득령) ${ryeong ? "예" : "아니오"}: 태어난 달 지지의 기운(${EL_WORD[mEl]})이 일간(${EL_WORD[dayEl]})을 ${ryeong ? "돕는" : "돕지 못하는"} 관계${byHidden ? " (토월이라 지장간까지 본 잠정 규칙으로 예)" : ""}`,
      `일지 뿌리(득지) ${ji ? "예" : "아니오"}: 일지 속 ${hid.map((h) => EL_WORD[stemElement(h.stem)]).join("·")} 중 일간을 돕는 글자 ${rootStems.length}개`,
      `주변 도움(득세) ${se ? "예" : "아니오"}: 일간을 돕는 글자 ${help}개, 힘을 빼는 글자 ${drain}개`,
    ],
  };
}

export interface NeedResult {
  eokbu: Element[]; // 억부 관점 후보 기운
  eokbuNote: string;
  johu: Element | null; // 조후 관점 필요 기운
  johuUrgent: boolean;
  johuNote: string;
  primary: Element; // 생활 처방용 필요 기운(임시 우선 규칙)
  primaryReason: string;
  hee: Element; // 필요한 기운을 낳아 주는 기운
  gi: Element; // 필요한 기운을 누르는 기운
  excess: Element[]; // 가장 많은 오행
  least: Element[]; // 가장 적은 오행
  status: JudgmentStatus;
}

const EUL: Record<Element, string> = { 목: "나무를", 화: "불을", 토: "흙을", 금: "쇠를", 수: "물을" };
const SEASON_OF = ["겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"] as const; // 자~해

export function computeNeed(p: P4, counts: Record<Element, number>, st: StrengthResult): NeedResult {
  const dayEl = stemElement(p.day.stem);
  const rels = (rs: ReturnType<typeof relation>[]) => ELEMENTS.filter((e) => rs.includes(relation(dayEl, e)));
  // 신강 쪽이면 힘을 덜어 내는 기운(식상·재성·관성), 신약 쪽이면 돕는 기운(인성·비겁)
  const eokbu = st.side === "strong" ? rels(["gives", "rules", "pressed"]) : rels(["helps", "same"]);
  const order = st.side === "strong"
    ? (["gives", "rules", "pressed"] as const).map((r) => rels([r])[0]!)
    : (["helps", "same"] as const).map((r) => rels([r])[0]!);
  const fewest = [...order].sort((a, b) => counts[a] - counts[b] || order.indexOf(a) - order.indexOf(b))[0]!;
  const season = SEASON_OF[p.month.branch]!;
  const johu: Element | null = season === "겨울" ? "화" : season === "여름" ? "수" : null;
  const johuUrgent = johu !== null;
  const primary = johu ?? fewest;
  const hee = ELEMENTS.find((e) => relation(primary, e) === "helps")!;
  const gi = ELEMENTS.find((e) => relation(primary, e) === "pressed")!;
  const max = Math.max(...ELEMENTS.map((e) => counts[e]));
  const min = Math.min(...ELEMENTS.map((e) => counts[e]));
  return {
    eokbu,
    eokbuNote: st.side === "strong"
      ? `일간이 ${st.label}이라 힘을 덜어 내는 기운(${eokbu.map((e) => EL_WORD[e]).join("·")}) 쪽이 균형에 도움이 되는 후보`
      : `일간이 ${st.label}이라 돕는 기운(${eokbu.map((e) => EL_WORD[e]).join("·")}) 쪽이 균형에 도움이 되는 후보`,
    johu,
    johuUrgent,
    johuNote: johu
      ? `태어난 달이 ${season}이라 ${johu === "화" ? "차가움을 데우는" : "뜨거움을 식히는"} ${EL_WORD[johu]} 기운이 필요한 편(원국에 ${EL_WORD[johu]} ${counts[johu]}개)`
      : `태어난 달이 ${season}이라 계절의 차갑고 뜨거운 쏠림은 크지 않음(조후는 급하지 않음)`,
    primary,
    primaryReason: johu
      ? `조후가 급한 계절이라 ${EUL[johu]} 먼저 두고, 억부 후보는 보조로 본다(임시 우선 규칙)`
      : `조후가 급하지 않아 억부 후보 중 원국에 가장 적은 ${EUL[fewest]} 먼저 둔다(임시 우선 규칙)`,
    hee, gi,
    excess: ELEMENTS.filter((e) => counts[e] === max && max >= 3),
    least: ELEMENTS.filter((e) => counts[e] === min),
    status: "CANDIDATE",
  };
}

// ── 12운성·필요한 기운으로 보는 분위기(대운·연도) ──────────────
export type Signal = "+" | "0" | "-";
export const STAGE_MOOD = ["오르는", "전환", "오르는", "오르는", "오르는", "전환", "쉬어가는", "쉬어가는", "쉬어가는", "쉬어가는", "전환", "전환"] as const;
export const stageSignal = (idx: number): Signal => (STAGE_MOOD[idx] === "오르는" ? "+" : STAGE_MOOD[idx] === "쉬어가는" ? "-" : "0");
export const elementSignal = (el: Element, need: NeedResult): Signal =>
  el === need.primary || el === need.hee ? "+" : el === need.gi ? "-" : "0";

export interface MoodResult { label: "오르는 구간" | "엇갈리는 구간" | "쉬어가는 구간"; signals: Signal[] }
/** 신호(12운성 단계, 천간 오행, 지지 오행)의 +와 -를 센다. 점수 가중치는 없다. */
export function moodOf(signals: Signal[]): MoodResult {
  const pos = signals.filter((s) => s === "+").length;
  const neg = signals.filter((s) => s === "-").length;
  return { signals, label: pos > neg ? "오르는 구간" : neg > pos ? "쉬어가는 구간" : "엇갈리는 구간" };
}

// ── 지지 충·육합(원국과의 관계) ──────────────────────────
const CHUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const HAP6: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export function branchLinks(branch: number, p: P4): string[] {
  const cols: { n: string; b: number }[] = [
    { n: "연지", b: p.year.branch }, { n: "월지", b: p.month.branch }, { n: "일지", b: p.day.branch },
    ...(p.hour ? [{ n: "시지", b: p.hour.branch }] : []),
  ];
  const has = (set: [number, number][], a: number, b: number) => set.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const out: string[] = [];
  for (const c of cols) {
    if (has(CHUNG, branch, c.b)) out.push(`${c.n} ${KO[c.b]} ↔ 충`);
    if (has(HAP6, branch, c.b)) out.push(`${c.n} ${KO[c.b]} ↔ 육합`);
  }
  return out;
}

export const tenGodName = (dm: number, stem: number): TenGod => tenGodOf(dm, stem);

export interface NeedEffect {
  stemCount: number; // 천간에 드러난(투출) 필요한 기운 글자 수
  rootCount: number; // 지지 본기에 뿌리가 있는 수
  clashedRoots: number; // 그 뿌리 중 원국에서 충을 맞은 수
  level: "튼튼" | "보통" | "약함";
  evidence: string;
}
/** 후보가 원국에 '있다'와 '실제로 힘을 쓴다'는 다르다 — 투출·뿌리·충을 따로 본다(후보 관찰, 판정이 아님) */
export function observeNeed(p: P4, el: Element): NeedEffect {
  const stems = [p.year.stem, p.month.stem, ...(p.hour ? [p.hour.stem] : [])].filter((s) => stemElement(s) === el).length;
  const branches = [p.year, p.month, p.day, ...(p.hour ? [p.hour] : [])].map((x) => x.branch);
  const roots = branches.filter((b) => branchElement(b) === el);
  const clashed = roots.filter((b) => CHUNG.some(([x, y]) => (x === b && branches.includes(y)) || (y === b && branches.includes(x)))).length;
  const live = roots.length - clashed;
  const level = stems > 0 && live > 0 ? "튼튼" : stems > 0 || live > 0 ? "보통" : "약함";
  return {
    stemCount: stems, rootCount: roots.length, clashedRoots: clashed, level,
    evidence: `천간에 ${EL_WORD[el]} ${stems}개(드러남), 지지 본기에 ${EL_WORD[el]} ${roots.length}개(뿌리)${clashed ? `, 그중 ${clashed}개는 원국에서 충을 맞음` : ""} → 실제로 힘을 쓸 가능성: ${level}`,
  };
}
