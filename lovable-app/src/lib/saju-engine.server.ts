// R-001 만세력 실제 계산 엔진 (시범/검토용, finalApproved=false)
// - 서버(Node) 전용: *.server.ts는 클라이언트 번들에 포함되지 않음
// - 태양 겉보기 황경 기반 12절기: astronomy-engine (MIT) SearchSunLongitude
// - 결정론적 계산만 사용. 난수/해시/추정치로 사주를 만들지 않음.
import * as Astronomy from "astronomy-engine";
import type { Element, Pillar, SajuPreview } from "./saju";
import { isValidDate } from "./saju";
import { convertLunarToSolar, type CalendarConversion } from "./lunar-conversion.server";

export const ENGINE_VERSION = "r001-0.1";
export const ENGINE_SOURCE = "astronomy-engine SearchSunLongitude (MIT)";
export const CLOCK_POLICY =
  "Asia/Seoul 법정시(역사 시차·서머타임 포함, Intl IANA). 子시는 23:00~00:59.";
// R-001 기본 정책: 일주는 법정 달력 날짜 자정(00:00)에 교체('midnight').
// 'zi23'(23시 익일 일주 전환)은 명시적 선택 정책으로만 계산 가능하며 UI/서비스에는 노출하지 않음.
export type DayBoundaryPolicy = "midnight" | "zi23";
export const DAY_BOUNDARY_POLICY = "r001-dayboundary-v1 (기본 midnight: 자정 00:00 일주 교체; zi23: 23:00 익일 일주 전환, 명시 선택 전용)";
export const ACCURACY_NOTE =
  "지원 범위: 양력 환산 1900~2026년, 한국(Asia/Seoul) 출생만. 음력/윤달 입력은 서버에서 양력 날짜로만 변환한 뒤 계산합니다(연/월주=절입 태양황경, 일주=환산된 법정 양력 날짜; 음력 달력 간지는 사용하지 않음). 절입 시각은 KASI 공개 기준과 분 단위 비교 검증 중이며, 절입 경계 ±120초 이내는 '검토 필요'로 표시합니다. 해외 출생, 진태양시 보정은 아직 지원하지 않습니다.";

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const BRANCH_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const STEM_ELEM: Element[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
// 지지 본기: 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水
const BRANCH_ELEM: Element[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];

// 12절기 (월주 경계): 태양 황경 → 지지(寅부터)
const TERM_ANGLES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
const TERM_BRANCH = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 寅卯辰巳午未申酉戌亥子丑
// 각 절기 검색 시작일 (0-based month, day)
const TERM_GUESS: [number, number][] = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [11, 15]];

// 연간(甲/己→丙, 乙/庚→戊, 丙/辛→庚, 丁/壬→壬, 戊/癸→甲)의 寅月 천간
const MONTH_STEM_BASE = [2, 4, 6, 8, 0];

// 일주 기준일: 2000-01-07 = 甲子 (독립 검증 필요 명기)
const DAY_REF_UTC = Date.UTC(2000, 0, 7);

const BOUNDARY_MS = 120_000; // 절입 경계 ±120초 → 검토 필요

// ---------- Asia/Seoul wall-clock ↔ UTC (역사 시차·서머타임 포함) ----------
const dtf = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function seoulWallMsAt(utc: Date): number {
  const parts = dtf.formatToParts(utc);
  const p: Record<string, string> = {};
  for (const x of parts) if (x.type !== "literal") p[x.type] = x.value;
  let h = Number(p["hour"]);
  if (h === 24) h = 0;
  return Date.UTC(Number(p["year"]), Number(p["month"]) - 1, Number(p["day"]), h, Number(p["minute"]), Number(p["second"]));
}

export type WallStatus = "ok" | "ambiguous" | "nonexistent";
export function seoulWallToUtc(y: number, mo: number, d: number, h: number, mi: number): { status: WallStatus; utc: Date | null } {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let utc = new Date(wall - 9 * 3600_000); // 초기 추정: KST(+9)
  for (let i = 0; i < 4; i++) {
    const off = seoulWallMsAt(utc) - utc.getTime();
    const next = new Date(wall - off);
    if (next.getTime() === utc.getTime()) break;
    utc = next;
  }
  if (seoulWallMsAt(utc) !== wall) return { status: "nonexistent", utc: null };
  // 서머타임 종료 등으로 같은 벽시계가 두 번 존재하는지 검출
  const before = new Date(utc.getTime() - 3600_000);
  const after = new Date(utc.getTime() + 3600_000);
  const ambiguous = seoulWallMsAt(before) === wall || seoulWallMsAt(after) === wall;
  return { status: ambiguous ? "ambiguous" : "ok", utc };
}

export function utcToSeoulWall(utc: Date): { y: number; mo: number; d: number; h: number; mi: number } {
  const ms = seoulWallMsAt(utc);
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
}

// ---------- 12절기 (UTC 순간) ----------
// 캐시에는 epoch milliseconds 숫자만 저장 — Date 참조 반환 시 setTime(0) 등으로 캐시가 변조되는 것을 원천 차단
const termCache = new Map<number, readonly number[]>();
export function solarTermsUtc(year: number): readonly Date[] {
  const hit = termCache.get(year);
  if (hit) return hit.map((ms) => new Date(ms)); // 깊은 사본 반환
  const out: Date[] = [];
  for (let i = 0; i < 12; i++) {
    const [gm, gd] = TERM_GUESS[i]!;
    const start = new Date(Date.UTC(year, gm, gd));
    const t = Astronomy.SearchSunLongitude(TERM_ANGLES[i]!, start, 45);
    if (!t) throw new Error(`절기 계산 실패: ${year}년 황경 ${TERM_ANGLES[i]}°`);
    out.push(t.date);
  }
  termCache.set(year, Object.freeze(out.map((d) => d.getTime())));
  return out.map((d) => new Date(d.getTime()));
}

function pillar(stem: number, branch: number): Pillar {
  return { stem, branch, hanja: STEMS[stem]! + BRANCHES[branch]!, ko: STEM_KO[stem]! + BRANCH_KO[branch]! };
}

export interface EngineInput { year: number; month: number; day: number; hour: number | null; minute: number }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// 입력 검증: 지원하지 않는 입력은 임의 변환 없이 거부 (fail-closed)
// 서버는 임의 JSON을 받을 수 있으므로 타입·형식을 엄격히 검사한다.
export type ParsedBirth = { ok: true; parsed: EngineInput; conversion: CalendarConversion | null } | { ok: false; error: string };

// 서버 파서: 형식을 엄격히 검사하고, 음력이면 서버에서 양력 날짜로 변환(왕복 검증)한 뒤 EngineInput을 만든다.
// 반환되는 parsed.year/month/day는 항상 '양력 법정 날짜'이다. name·gender는 천문 계산에 쓰지 않는다.
export function parseBirthInput(data: unknown): ParsedBirth {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "입력 형식이 올바르지 않아요." };
  }
  const d = data as Record<string, unknown>;
  const calendar = d["calendar"];
  if (calendar !== "solar" && calendar !== "lunar") {
    return { ok: false, error: "입력 형식이 올바르지 않아요." };
  }
  // leap은 boolean만 허용 — 문자열/숫자 등 임의 값은 fail-closed
  if (d["leap"] !== undefined && typeof d["leap"] !== "boolean") {
    return { ok: false, error: "입력 형식이 올바르지 않아요." };
  }
  const date = d["date"];
  if (typeof date !== "string" || date.length !== 10 || !DATE_RE.test(date)) {
    return { ok: false, error: "올바른 생년월일을 입력해 주세요 (YYYY-MM-DD, 1900~2026)." };
  }
  let conversion: CalendarConversion | null = null;
  let solarDate = date;
  if (calendar === "solar") {
    if (d["leap"] === true) return { ok: false, error: "양력 입력에는 윤달을 선택할 수 없어요." };
    if (!isValidDate(date)) return { ok: false, error: "올바른 생년월일을 입력해 주세요 (YYYY-MM-DD, 1900~2026)." };
  } else {
    if (typeof d["leap"] !== "boolean") return { ok: false, error: "음력 입력은 윤달 여부(예/아니오)가 필요해요." };
    const c = convertLunarToSolar(date, d["leap"]);
    if (!c.ok) return { ok: false, error: c.error };
    conversion = c.conversion;
    solarDate = c.conversion.convertedSolarDate;
    if (!isValidDate(solarDate)) return { ok: false, error: "양력으로 환산하면 지원 범위(1900~2026년)를 벗어나요." };
  }
  const [y, m, dd] = solarDate.split("-").map(Number) as [number, number, number];
  let hour: number | null = null;
  let minute = 0;
  const time = d["time"];
  // null = 시간 미상. 빈 문자열 등 그 외 비정상 값은 거부
  if (time !== null && time !== undefined) {
    if (typeof time !== "string" || time === "" || !TIME_RE.test(time)) {
      return { ok: false, error: "출생 시간은 24시간제 HH:mm 형식으로 입력해 주세요." };
    }
    const [h, mi] = time.split(":").map(Number) as [number, number];
    if (h < 0 || h > 23 || mi < 0 || mi > 59) {
      return { ok: false, error: "출생 시간은 00:00~23:59 범위로 입력해 주세요." };
    }
    hour = h; minute = mi;
  }
  return { ok: true, parsed: { year: y, month: m, day: dd, hour, minute }, conversion };
}

// 서버 진입점: 파싱(+음력 변환) → 기존 절입 엔진. 변환 provenance를 결과에 첨부한다.
export function previewFromBirthInput(data: unknown, dayBoundary: DayBoundaryPolicy = "midnight"): SajuPreview {
  const p = parseBirthInput(data);
  if (!p.ok) {
    return { ok: false, error: p.error, finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, accuracyNote: ACCURACY_NOTE };
  }
  const r = computeSaju(p.parsed, dayBoundary);
  return {
    ...r,
    originalBirthCalendar: p.conversion ? "lunar" : "solar",
    ...(p.conversion ? { calendarConversion: p.conversion } : {}),
    finalApproved: false,
  };
}

export function computeSaju(input: EngineInput, dayBoundary: DayBoundaryPolicy = "midnight"): SajuPreview {
  const { year, month, day, hour, minute } = input;
  if (year < 1900 || year > 2026) {
    return { ok: false, error: "지원 범위는 1900~2026년이에요.", finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, accuracyNote: ACCURACY_NOTE };
  }

  const wall = seoulWallToUtc(year, month, day, hour ?? 12, minute);
  if (wall.status === "nonexistent" || !wall.utc) {
    return { ok: false, error: "입력한 시각이 시간대 변경(서머타임)으로 존재하지 않아요. 시각을 확인해 주세요.", finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, accuracyNote: ACCURACY_NOTE };
  }
  if (wall.status === "ambiguous") {
    // 서머타임 해제로 같은 벽시계가 두 번 존재 — 어떤 실제 순간인지 구별 불가 → fail-closed
    return { ok: false, error: "입력한 시각이 시간대 변경(서머타임 해제)으로 두 번 존재해요. 어느 순간인지 확인할 수 없어 계산하지 않았어요.", finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, accuracyNote: ACCURACY_NOTE };
  }
  const utc = wall.utc;
  const reviewReasons: string[] = [];

  // 절입 경계 ±120초 검출
  const termsAround = [...solarTermsUtc(year - 1), ...solarTermsUtc(year), ...solarTermsUtc(year + 1)];
  for (const t of termsAround) {
    if (Math.abs(t.getTime() - utc.getTime()) <= BOUNDARY_MS) {
      reviewReasons.push("절입(계절이 바뀌는 순간) 경계 ±2분 이내라 월주·연주가 달라질 수 있어요.");
      break;
    }
  }

  // 'zi23' 선택 정책에서는 23:00~23:59가 익일 일주가 되므로 시각을 모르면 일주가 모호 → fail-closed
  if (hour === null && dayBoundary === "zi23") {
    return { ok: false, error: "23시 익일 일주(zi23) 정책에서는 출생 시간 없이 일주를 확정할 수 없어요. 출생 시간을 입력해 주세요.", finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, dayBoundaryPolicy: DAY_BOUNDARY_POLICY, accuracyNote: ACCURACY_NOTE };
  }

  // 출생시간 미상 + 출생일(현지 00:00~24:00)에 절입이 있으면 년주·월주를 확정할 수 없음 → fail-closed
  if (hour === null) {
    const dayStart = seoulWallToUtc(year, month, day, 0, 0).utc;
    const dayEnd = seoulWallToUtc(year, month, day + 1, 0, 0).utc;
    if (dayStart && dayEnd) {
      for (const t of termsAround) {
        const ts = t.getTime();
        if (ts >= dayStart.getTime() && ts < dayEnd.getTime()) {
          return { ok: false, error: "절입일(계절이 바뀌는 날) 출생이라 출생 시간 없이는 년주·월주를 확정할 수 없어요. 출생 시간을 입력해 주세요.", finalApproved: false, engineVersion: ENGINE_VERSION, source: ENGINE_SOURCE, clockPolicy: CLOCK_POLICY, accuracyNote: ACCURACY_NOTE };
        }
      }
    }
  }

  // 연주: 입춘(해당 연도) 기준, 1984년 = 甲子
  const ipchun = solarTermsUtc(year)[0]!;
  const yearForPillar = utc.getTime() < ipchun.getTime() ? year - 1 : year;
  const yearIdx = (((yearForPillar - 1984) % 60) + 60) % 60;
  const yearPillar = pillar(yearIdx % 10, yearIdx % 12);

  // 월주: 가장 최근에 지난 절기
  let termIdx = -1;
  for (let i = 0; i < termsAround.length; i++) {
    if (termsAround[i]!.getTime() <= utc.getTime()) termIdx = i % 12;
  }
  if (termIdx < 0) termIdx = 11; // 이론상 도달 불가(전년도 소한 포함)
  const monthBranch = TERM_BRANCH[termIdx]!;
  const monthStem = (MONTH_STEM_BASE[yearPillar.stem % 5]! + termIdx) % 10;
  const monthPillar = pillar(monthStem, monthBranch);

  // 일주: 2000-01-07 = 甲子. 기본 정책 'midnight'은 자정(00:00) 교체 — 23:00~23:59도 당일 일주 유지.
  // 명시적 선택 정책 'zi23'에서만 23시부터 익일 일주로 전환한다.
  let dy = year, dm = month, dd = day;
  if (dayBoundary === "zi23" && hour !== null && hour >= 23) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    dy = next.getUTCFullYear(); dm = next.getUTCMonth() + 1; dd = next.getUTCDate();
  }
  const dayDiff = Math.round((Date.UTC(dy, dm - 1, dd) - DAY_REF_UTC) / 86_400_000);
  const dayIdx = ((dayDiff % 60) + 60) % 60;
  const dayPillar = pillar(dayIdx % 10, dayIdx % 12);

  // 시주: 子시 23:00~00:59, 甲/己일 甲子 시작
  let hourPillar: Pillar | null = null;
  if (hour !== null) {
    const bi = Math.floor(((hour + 1) % 24) / 2);
    hourPillar = pillar((dayPillar.stem * 2 + bi) % 10, bi);
  }

  // 오행 개수: 천간+지지 본기, 시주 미상이면 6글자
  const elements: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
  for (const pl of pillars) {
    elements[STEM_ELEM[pl.stem]!]++;
    elements[BRANCH_ELEM[pl.branch]!]++;
  }

  return {
    ok: true,
    pillars: { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar },
    elements,
    charCount: pillars.length * 2,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    finalApproved: false,
    engineVersion: ENGINE_VERSION,
    source: ENGINE_SOURCE,
    clockPolicy: CLOCK_POLICY,
    dayBoundaryPolicy: DAY_BOUNDARY_POLICY + ` (적용: ${dayBoundary})`,
    accuracyNote: ACCURACY_NOTE,
  };
}
