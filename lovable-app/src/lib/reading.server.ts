// 풀이(3,000자 이상) 생성 — 서버 전용. 준비된 문장을 사주 사실에 맞춰 조합하는 규칙형이며 AI 가 아니다.
// 만세력은 두 개의 독립 구현으로 이중 확인한다:
//   · 앱의 R001 엔진(saju-engine.server.ts, astronomy-engine)  — 화면의 4주를 정한다
//   · 풀이 작성기가 쓰는 엔진(reading-core, DE421 표)           — 십성·대운 등 풍부한 사실을 만든다
// 두 엔진의 4주가 다르면 풀이를 내지 않는다(fail-closed). 일치만 확인했을 뿐 KASI 공식 확인은 아니다.
import { unlockId } from "./unlock-id";
import { calculate } from "./reading-core/engine/manse/src/engine";
import { toSajuFacts } from "./reading-core/engine/manse/src/adapter";
import { generateReport } from "./reading-core/src/lib/content/report";
import type { SajuFacts } from "./reading-core/src/lib/saju/types";
import { kstToday } from "./saju";
import { computeSaju, parseBirthInput } from "./saju-engine.server";

export type ReadingProduct = "basic" | "love" | "compat";
const PRODUCT_ID = { basic: "basic", love: "love_deep", compat: "compatibility" } as const;
/** 무료로 전부 보여 주는 앞쪽 섹션 수(나머지는 잠금) */
export const FREE_SECTIONS = 1;
/** 같은 정책으로 맞춘다: 자정 일주 경계, 서울 법정 벽시계(서머타임 포함) — 앱 R001 엔진과 동일 */
const POLICY = { ziHour: "MIDNIGHT", timeBasis: "ERA_WALL_CLOCK" } as const;

export interface FullSection {
  id: string;
  title: string;
  tag?: string;
  headline?: string;
  body: string;
}
export type BuiltReading =
  | {
      ok: true;
      product: ReadingProduct;
      sections: FullSection[];
      chars: number;
      needsReview: boolean;
      reviewReasons: string[];
      meta: { rules: string; engine: string; mode: "template"; crossCheck: "match" };
    }
  | { ok: false; error: string };

export interface BuildDeps {
  /** 시험용: 앱 R001 엔진의 4주를 바꿔치기(불일치 시나리오) */
  pillarsOverride?: (label: "me" | "partner", pillars: string[]) => string[];
}

interface Chart {
  facts: SajuFacts;
  needsReview: boolean;
  reasons: string[];
}

function chartOf(
  raw: unknown,
  today: string,
  label: "me" | "partner",
  deps: BuildDeps,
): { ok: true; chart: Chart } | { ok: false; error: string } {
  const parsedRes = parseBirthInput(raw, { today });
  if (!parsedRes.ok) return { ok: false, error: parsedRes.error };
  const p = parsedRes.parsed;
  const gender =
    typeof raw === "object" && raw !== null ? (raw as { gender?: unknown }).gender : undefined;
  const r = calculate(
    {
      calendar: "solar",
      year: p.year,
      month: p.month,
      day: p.day,
      ...(p.hour === null ? { timeUnknown: true } : { hour: p.hour, minute: p.minute }),
      ...(gender === "f"
        ? { gender: "F" as const }
        : gender === "m"
          ? { gender: "M" as const }
          : {}),
    },
    POLICY,
  );
  if (!r.ok)
    return { ok: false, error: "풀이를 만들 수 없는 입력이에요. 출생 정보를 확인해 주세요." };
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
  const compared = deps.pillarsOverride ? deps.pillarsOverride(label, appPillars) : appPillars;
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
    chart: { facts, needsReview: !!app.needsReview, reasons: app.reviewReasons ?? [] },
  };
}

export function buildReading(
  input: { product: ReadingProduct; me: unknown; partner?: unknown },
  opts: { today?: string; deps?: BuildDeps } = {},
): BuiltReading {
  const today = opts.today ?? kstToday();
  const deps = opts.deps ?? {};
  const a = chartOf(input.me, today, "me", deps);
  if (!a.ok) return a;
  let b: Chart | null = null;
  if (input.product === "compat") {
    if (input.partner === undefined) return { ok: false, error: "상대방의 출생 정보가 필요해요." };
    const pb = chartOf(input.partner, today, "partner", deps);
    if (!pb.ok) return pb;
    b = pb.chart;
  }
  const baseYear = Number(today.slice(0, 4));
  const report = generateReport({
    productId: PRODUCT_ID[input.product],
    facts: a.chart.facts,
    ...(b ? { factsB: b.facts } : {}),
    baseYear,
  });
  return {
    ok: true,
    product: input.product,
    sections: report.sections.map((s) => ({
      id: s.id,
      title: s.title,
      ...(s.tag ? { tag: s.tag } : {}),
      ...(s.headline ? { headline: s.headline } : {}),
      body: s.body,
    })),
    chars: report.chars,
    needsReview: a.chart.needsReview || !!b?.needsReview,
    reviewReasons: [...a.chart.reasons, ...(b?.reasons ?? [])],
    meta: {
      rules: report.versions.rules,
      engine: report.versions.engine,
      mode: "template",
      crossCheck: "match",
    },
  };
}

// ───── 잠금: 권한 없는 사용자에게는 본문을 아예 보내지 않는다 ─────
export type OutSection =
  | { id: string; title: string; tag?: string; headline?: string; locked: false; body: string }
  | { id: string; title: string; tag?: string; headline?: string; locked: true; teaser: string };

const teaserOf = (body: string) => {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length <= 36 ? t : `${t.slice(0, 36)}…`;
};

export function shapeSections(sections: FullSection[], unlocked: boolean): OutSection[] {
  return sections.map((s, i) => {
    const head = {
      id: s.id,
      title: s.title,
      ...(s.tag ? { tag: s.tag } : {}),
      ...(s.headline ? { headline: s.headline } : {}),
    };
    return unlocked || i < FREE_SECTIONS
      ? { ...head, locked: false as const, body: s.body }
      : { ...head, locked: true as const, teaser: teaserOf(s.body) };
  });
}

/** 열람 id: 화면의 Paywall id 와 같아야 한다 (상품:출생정보 해시, unlock-id.ts) */
export function unlockIdFor(product: ReadingProduct, me: unknown, partner: unknown): string | null {
  return unlockId(product, me, partner);
}

/** supabase 클라이언트 중 열람 기록 조회에 쓰는 부분(시험에서 가짜를 넣는다) */
export interface UnlockClient {
  from(t: string): {
    select(c: string): {
      eq(
        c: string,
        v: string,
      ): {
        eq(c: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
      };
    };
  };
}

/** 열람 권한: 본인의 unlocked_readings 에 그 id 가 있을 때만 true. 조회 오류·id 없음은 모두 false(fail-closed). */
export async function isUnlocked(
  client: UnlockClient,
  userId: string,
  id: string | null,
): Promise<boolean> {
  if (!id) return false;
  try {
    const { data, error } = await client
      .from("unlocked_readings")
      .select("reading_id")
      .eq("user_id", userId)
      .eq("reading_id", id)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}
