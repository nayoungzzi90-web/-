// 오늘의 운세쿠키: 한국 날짜 키 + 사용자/게스트 키 기준 멱등 결과, 상태 전이, 기기 저장.
// - 출생정보가 있으면 기존 오늘의 복주머니 엔진(daily.ts, 일진×일간 오행 관계, 결정론)으로 만든 한 줄을 쪽지에 담는다. 새 해석 규칙은 만들지 않는다.
// - 출생정보가 없으면 '오늘의 응원 메시지'(개인 사주를 계산하지 않은 예시)이며 isSample 로 구분한다.
// - 서버 저장이 없으므로 결과·쪽지함은 이 기기(localStorage)에만 저장한다. 저장 실패는 성공으로 표시하지 않는다.
import { dailyFortune } from "./daily";
import type { BirthInput } from "./saju";
import { previewFromBirthInput } from "./saju-engine";
import { TT } from "./ttotto-content";

export interface CookieResult {
  dateKey: string; // Asia/Seoul YYYY-MM-DD
  kind: "personal" | "cheer";
  isSample: boolean; // true 면 '결과 예시' 배지를 보인다
  title: string;
  message: string;
  actionTitle: string;
  action: string;
}

/** 한국 시간(UTC+9) 날짜 키. 서머타임 없음. */
export function kstDateKey(now: Date): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

const CHEER = [
  { title: TT.sampleResult.title, message: TT.sampleResult.message, actionTitle: TT.sampleResult.actionTitle, action: TT.sampleResult.action },
  { title: "천천히 가도 괜찮은 날", message: "서두르지 않아도 내 속도가 맞는 날.", actionTitle: "오늘의 작은 실천", action: "물 한 잔 마시고 숨을 길게 쉬어 봐요." },
  { title: "나에게 건네는 한마디", message: "오늘 해낸 일을 스스로 알아봐 주는 날.", actionTitle: "오늘의 작은 실천", action: "오늘 잘한 일 하나를 떠올려 봐요." },
  { title: "가볍게 시작하는 날", message: "작게 시작한 일이 생각보다 멀리 가는 날.", actionTitle: "오늘의 작은 실천", action: "미뤄 둔 일 중 가장 작은 것부터 해봐요." },
];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export class CookieError extends Error {}

/** 같은 (날짜, 사용자) 이면 항상 같은 결과. 데이터 오류는 랜덤 성공으로 위장하지 않고 CookieError 를 던진다. */
export function buildCookieResult(now: Date, me: BirthInput | null): CookieResult {
  const dateKey = kstDateKey(now);
  if (me) {
    const p = previewFromBirthInput(me);
    if (!p.ok || !p.pillars) throw new CookieError("출생 정보를 계산하지 못했어요.");
    const f = dailyFortune(p.pillars.day.stem, dateKey);
    if (!f) throw new CookieError("오늘의 운세를 계산하지 못했어요.");
    return {
      dateKey, kind: "personal", isSample: false,
      title: f.headline, message: f.line,
      actionTitle: "오늘의 작은 실천", action: f.doList[0] ?? TT.sampleResult.action,
    };
  }
  const c = CHEER[hash(`cheer:${dateKey}`) % CHEER.length]!;
  return { dateKey, kind: "cheer", isSample: true, ...c };
}

// ── 기기 저장 ───────────────────────────────────────────
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }
const TODAY_KEY = "tt.cookie.v1";
const BOX_KEY = "tt.notebox.v1";

export function loadTodayResult(store: KV, now: Date, me: BirthInput | null): CookieResult | null {
  try {
    const raw = store.getItem(TODAY_KEY);
    if (!raw) return null;
    const { who, ...r } = JSON.parse(raw) as CookieResult & { who?: string };
    return r.dateKey === kstDateKey(now) && who === (me ? "me" : "guest") ? r : null;
  } catch { return null; }
}
/** 오늘 결과를 저장한다. 이미 오늘 결과가 있으면 그것을 돌려준다(다시 추첨하지 않는다). */
export function persistTodayResult(store: KV, r: CookieResult, me: BirthInput | null): CookieResult {
  const existing = loadTodayResult(store, new Date(`${r.dateKey}T12:00:00+09:00`), me);
  if (existing) return existing;
  try { store.setItem(TODAY_KEY, JSON.stringify({ ...r, who: me ? "me" : "guest" })); } catch { /* 저장 실패해도 오늘 결과 표시는 계속한다 */ }
  return r;
}
export type SaveOutcome = "saved" | "already" | "failed";
export function saveToNoteBox(store: KV, r: CookieResult): SaveOutcome {
  try {
    const list = JSON.parse(store.getItem(BOX_KEY) ?? "[]") as CookieResult[];
    if (list.some((x) => x.dateKey === r.dateKey)) return "already";
    store.setItem(BOX_KEY, JSON.stringify([...list, r].slice(-60)));
    return "saved";
  } catch { return "failed"; }
}

// ── 쿠키 상태 전이 ─────────────────────────────────────
export type CookieState = "idle" | "loading" | "opening" | "revealed" | "error";
export type CookieEvent = "START" | "READY" | "FAIL" | "DONE" | "RETRY" | "RESTORE" | "SKIP_MOTION" | "RESET";
const NEXT: Record<CookieState, Partial<Record<CookieEvent, CookieState>>> = {
  idle: { START: "loading", RESTORE: "revealed" },
  loading: { READY: "opening", FAIL: "error", SKIP_MOTION: "revealed" },
  opening: { DONE: "revealed" },
  revealed: { RESET: "idle" },
  error: { RETRY: "loading", RESET: "idle" },
};
/** 허용되지 않은 이벤트(예: 열리는 중 START 연타)는 상태를 바꾸지 않는다. */
export const cookieReduce = (s: CookieState, e: CookieEvent): CookieState => NEXT[s][e] ?? s;
export const OPEN_MS = 1250;
