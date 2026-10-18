// 클라이언트/서버 공용 타입·유틸. 사주 계산은 서버(saju-engine.server.ts)에서만 수행한다.
// MOCK 해시 계산은 제거됨 — 실제 계산 전 결과를 사주로 표시하지 않는다.
export type Element = "목" | "화" | "토" | "금" | "수";

export interface BirthInput {
  name: string;
  calendar: "solar" | "lunar";
  leap: boolean;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm or null(시간 미상)
  gender: "f" | "m";
}

export interface Pillar {
  stem: number; // 0~9
  branch: number; // 0~11
  hanja: string; // 甲子
  ko: string; // 갑자
}

export interface SajuPreview {
  ok: boolean;
  error?: string;
  pillars?: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  elements?: Record<Element, number>;
  charCount?: number; // 8(시주 포함) 또는 6(시주 미상)
  needsReview?: boolean;
  reviewReasons?: string[];
  finalApproved: false;
  engineVersion?: string;
  source?: string;
  clockPolicy?: string;
  dayBoundaryPolicy?: string;
  accuracyNote?: string;
  originalBirthCalendar?: "solar" | "lunar";
  // 음력 입력일 때만: 서버 변환 provenance (KASI 공식 API 실검증 아님 → independentlyVerified=false)
  calendarConversion?: {
    originalCalendar: "lunar";
    originalDate: string;
    isLeapMonth: boolean;
    convertedSolarDate: string;
    conversionVersion: string;
    sourceName: string;
    independentlyVerified: false;
  };
}

// 음력 입력의 형식만 검사(YYYY-MM-DD 숫자). 실존 여부(윤달·29/30일)는 서버 변환에서만 판단한다.
export function isLunarDateFormat(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return y >= 1899 && y <= 2026 && mo >= 1 && mo <= 12 && d >= 1 && d <= 30;
}

export function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  if (!y || y < 1900 || y > 2026) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function kstToday() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export function dayOfYearKst(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000);
}
