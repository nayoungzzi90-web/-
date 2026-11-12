import {
  computeSaju,
  seoulWallToUtc,
  solarTermsUtc,
  type EngineInput,
} from "./saju-engine";
import { parseBirthInput } from "./saju-engine";
import { kstToday, type BirthInput } from "./saju";
import { tenGodOf, type TenGod } from "./ten-gods";
import { STEMS_KO_LIST } from "./daeun-names";

// 대운(10년 단위 흐름) — 참고용. 계산 정책(루트 엔진 기본값과 같음):
//  · 순행/역행: 연간 양+남 또는 연간 음+여 → 순행(다음 절입까지), 그 외 → 역행(이전 절입부터)
//  · 시작 나이: 출생~기준 절입 사이 일수 ÷ 3 = 년(3일=1년), 연 길이 365.2425일
//  · 출생 시간을 모르면 정오로 가정한다(시작 나이가 달라질 수 있음).
// 전문가 검증 전 정책이다. 절입 시각은 천문 계산값이며 연 길이·환산은 정책값이다.
const DAY = 86_400_000;
const YEAR_LEN = 365.2425;
const TERM_NAMES = [
  "입춘", "경칩", "청명", "입하", "망종", "소서",
  "입추", "백로", "한로", "입동", "대설", "소한",
] as const;

export interface AgeParts {
  years: number;
  months: number;
  days: number;
}
export interface DaeunPillar {
  order: number;
  stem: number;
  branch: number;
  hanja: string;
  ko: string;
  tenGod: TenGod; // 일간 기준 천간의 십성 이름
  startAgeYears: number;
  startAge: AgeParts;
  startYear: number; // 시작하는 해(한국 시간 기준 연도)
}
export interface Daeun {
  forward: boolean;
  rule: string;
  anchorName: string;
  anchorGapDays: number;
  startAge: AgeParts;
  startAgeYears: number;
  timeKnown: boolean;
  pillars: DaeunPillar[];
  birthUtcMs: number;
}

const HAN_STEM = "甲乙丙丁戊己庚辛壬癸";
const HAN_BRANCH = "子丑寅卯辰巳午未申酉戌亥";
const KO_BRANCH = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function ageParts(yearsFloat: number): AgeParts {
  const years = Math.floor(yearsFloat);
  const rest = (yearsFloat - years) * YEAR_LEN;
  const monthLen = YEAR_LEN / 12;
  const months = Math.floor(rest / monthLen);
  return { years, months, days: Math.floor(rest - months * monthLen) };
}
const mod = (n: number, m: number) => ((n % m) + m) % m;
/** 60갑자 번호: 천간 번호와 지지 번호가 모두 맞는 0~59 */
function cycleIndex(stem: number, branch: number): number {
  for (let k = 0; k < 60; k++) if (k % 10 === stem && k % 12 === branch) return k;
  return -1;
}

export function computeDaeun(
  input: EngineInput,
  gender: "f" | "m",
): Daeun | null {
  const saju = computeSaju(input);
  if (!saju.ok || !saju.pillars) return null;
  const wall = seoulWallToUtc(
    input.year,
    input.month,
    input.day,
    input.hour ?? 12,
    input.minute,
  );
  if (wall.status !== "ok" || !wall.utc) return null;
  const birth = wall.utc.getTime();

  // 12절 전체(앞뒤 해 포함)를 시간순으로
  const terms: { ms: number; name: string }[] = [];
  for (const y of [input.year - 1, input.year, input.year + 1])
    solarTermsUtc(y).forEach((d, i) => terms.push({ ms: d.getTime(), name: TERM_NAMES[i]! }));
  terms.sort((a, b) => a.ms - b.ms);
  let prev: { ms: number; name: string } | null = null;
  let next: { ms: number; name: string } | null = null;
  for (const t of terms) {
    if (t.ms <= birth) prev = t;
    else {
      next = t;
      break;
    }
  }

  const yearYang = saju.pillars.year.stem % 2 === 0;
  const forward = (yearYang && gender === "m") || (!yearYang && gender === "f");
  const anchor = forward ? next : prev;
  if (!anchor) return null;
  const gapDays = Math.abs(anchor.ms - birth) / DAY;
  const startYears = gapDays / 3;
  const base = cycleIndex(saju.pillars.month.stem, saju.pillars.month.branch);
  const dir = forward ? 1 : -1;
  const dm = saju.pillars.day.stem;

  const pillars: DaeunPillar[] = [];
  for (let k = 1; k <= 10; k++) {
    const idx = mod(base + dir * k, 60);
    const stem = idx % 10;
    const branch = idx % 12;
    const ageFrom = startYears + 10 * (k - 1);
    const startMs = birth + ageFrom * YEAR_LEN * DAY;
    pillars.push({
      order: k,
      stem,
      branch,
      hanja: HAN_STEM[stem]! + HAN_BRANCH[branch]!,
      ko: STEMS_KO_LIST[stem]! + KO_BRANCH[branch]!,
      tenGod: tenGodOf(dm, stem),
      startAgeYears: Math.round(ageFrom * 1e6) / 1e6,
      startAge: ageParts(ageFrom),
      startYear: new Date(startMs + 9 * 3_600_000).getUTCFullYear(),
    });
  }
  return {
    forward,
    rule: `연간 ${yearYang ? "양" : "음"} + ${gender === "m" ? "남" : "여"} → ${forward ? "순행(다음 절입까지)" : "역행(이전 절입부터)"}`,
    anchorName: anchor.name,
    anchorGapDays: Math.round(gapDays * 1e6) / 1e6,
    startAge: ageParts(startYears),
    startAgeYears: Math.round(startYears * 1e6) / 1e6,
    timeKnown: input.hour !== null,
    pillars,
    birthUtcMs: birth,
  };
}

/** 화면용: 입력 그대로 받아 대운을 계산한다(실패하면 null). */
export function computeDaeunForBirth(me: BirthInput): Daeun | null {
  const parsed = parseBirthInput(me, { today: kstToday() });
  if (!parsed.ok) return null;
  return computeDaeun(parsed.parsed, me.gender);
}
