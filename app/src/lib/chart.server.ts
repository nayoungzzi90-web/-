// 출생 입력 → 두 개의 독립 엔진으로 4주를 이중 확인한 차트(서버 전용). 다르면 실패(fail-closed).
//   · 앱 R001 엔진(saju-engine.ts, astronomy-engine)  — 화면의 4주를 정한다
//   · 풀이 작성기 엔진(reading-core, DE421 표)         — 십성·대운 등 풍부한 사실을 만든다
// 옛 앱 reading.server.ts 의 chartOf 를 그대로 옮겼다(일치만 확인했을 뿐 KASI 공식 확인은 아님).
import { calculate } from "./reading-core/engine/manse/src/engine";
import { toSajuFacts } from "./reading-core/engine/manse/src/adapter";
import type { SajuFacts } from "./reading-core/src/lib/saju/types";
import { computeSaju, parseBirthInput } from "./saju-engine";

type ManseValue = Extract<ReturnType<typeof calculate>, { ok: true }>["value"];

/**
 * 같은 정책으로 맞춘다 — 앱 R001 엔진과 동일:
 * 자정 일주 경계, 입력은 서울 법정 벽시계(서머타임 포함)로 읽어 절대시각으로 바꾼 뒤
 * UTC+8:30(= UTC+9 시계 − 30분 고정 보정)으로 일주·시주를 정한다(2026-11-12 사용자 결정).
 */
const POLICY = {
  ziHour: "MIDNIGHT",
  timeBasis: "KST_PLUS9",
  solarTime: { mode: "FIXED_OFFSET", fixedOffsetMinutes: -30 },
} as const;

export interface BuildDeps {
  /** 시험용: 앱 R001 엔진의 4주를 바꿔치기(불일치 시나리오) */
  pillarsOverride?: (label: "me" | "partner", pillars: string[]) => string[];
}

export interface Chart {
  facts: SajuFacts;
  /** 풀이 엔진(DE421) 계산 원본 — AI 풀이의 판단 카드(R-002~R-005) 입력 */
  manse: ManseValue;
  needsReview: boolean;
  reasons: string[];
}

/** 출생 입력 → 두 엔진으로 4주를 이중 확인한 차트. 다르면 실패(fail-closed). */
export function chartOf(
  raw: unknown,
  today: string,
  label: "me" | "partner",
  deps: BuildDeps,
): { ok: true; chart: Chart } | { ok: false; error: string } {
  const parsedRes = parseBirthInput(raw, { today });
  if (!parsedRes.ok) return { ok: false, error: parsedRes.error };
  const p = parsedRes.parsed;
  const gender =
    typeof raw === "object" && raw !== null
      ? (raw as { gender?: unknown }).gender
      : undefined;
  const r = calculate(
    {
      calendar: "solar",
      year: p.year,
      month: p.month,
      day: p.day,
      ...(p.hour === null
        ? { timeUnknown: true }
        : { hour: p.hour, minute: p.minute }),
      ...(gender === "f"
        ? { gender: "F" as const }
        : gender === "m"
          ? { gender: "M" as const }
          : {}),
    },
    POLICY,
  );
  if (!r.ok)
    return {
      ok: false,
      error: "풀이를 만들 수 없는 입력이에요. 출생 정보를 확인해 주세요.",
    };
  const facts = toSajuFacts(r.value);

  // 이중 확인: 앱 엔진의 4주와 비교
  const app = computeSaju(p);
  if (!app.ok || !app.pillars)
    return { ok: false, error: app.error ?? "계산할 수 없는 입력이에요." };
  const appPillars = [
    app.pillars.year.hanja,
    app.pillars.month.hanja,
    app.pillars.day.hanja,
    app.pillars.hour?.hanja ?? "-",
  ];
  const coreP = facts.pillars;
  const corePillars = [coreP.year, coreP.month, coreP.day, coreP.hour ?? "-"];
  const compared = deps.pillarsOverride
    ? deps.pillarsOverride(label, appPillars)
    : appPillars;
  if (compared.join("|") !== corePillars.join("|")) {
    const near = !!app.needsReview || r.value.status === "NEEDS_REVIEW";
    return {
      ok: false,
      error: near
        ? "절입 시각 가까이에 태어나셔서 정확한 계산을 위해 출생 시각 확인이 필요해요. 풀이는 확인 후에 제공돼요."
        : "계산 검증이 일치하지 않아 풀이를 제공하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  return {
    ok: true,
    chart: {
      facts,
      manse: r.value,
      needsReview: !!app.needsReview,
      reasons: app.reviewReasons ?? [],
    },
  };
}
