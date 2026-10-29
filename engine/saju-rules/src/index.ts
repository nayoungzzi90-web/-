/**
 * R-002~R-005 결정론 규칙 엔진 진입점.
 * 만세력 엔진(engine/manse) 결과를 받아 기준서 순서(R-002 → R-003 → R-004 → R-005)대로 계산한다.
 * 이 결과는 "계산 사실과 후보"일 뿐이며, 신강신약(R-006) 이후 판단과 전문가 승인은 하지 않는다.
 */
import type { ManseResult } from '../../manse/src/engine';
import { BRANCHES, STEMS, type Chart } from './common';
import { runR002, type R002Result } from './r002';
import { runR003, type BirthInstant, type MonthTerm, type R003Result } from './r003';
import { runR004, type R004Result } from './r004';
import { runR005, type R005Result } from './r005';

export * from './common';
export * from './r002';
export * from './r003';
export * from './r004';
export * from './r005';

export const RULES_ENGINE_VERSION = 'saju-rules-0.1.0';

export interface R002to005 {
  engineVersion: string;
  chartId: string | null;
  r002: R002Result; r003: R003Result; r004: R004Result; r005: R005Result;
}

export function analyzeR002toR005(chart: Chart, opts: { monthTerm?: MonthTerm | null; birth?: BirthInstant | null } = {}): R002to005 {
  const r002 = runR002(chart);
  const r003 = runR003(chart, opts);
  const r004 = runR004(chart);
  const r005 = runR005(chart, r004);
  return { engineVersion: RULES_ENGINE_VERSION, chartId: chart.chartId ?? null, r002, r003, r004, r005 };
}

/** 만세력 결과 → 규칙 엔진 입력. 출생 시간을 모르면 그날 하루(현지 날짜)를 가능 범위로 둔다. */
export function fromManse(r: ManseResult, chartId?: string): { chart: Chart; monthTerm: MonthTerm; birth: BirthInstant | null } {
  const pil = (p: { stem: number; branch: number }) => ({ stem: STEMS[p.stem]!, branch: BRANCHES[p.branch]! });
  const chart: Chart = {
    pillars: { year: pil(r.pillars.year), month: pil(r.pillars.month), day: pil(r.pillars.day), hour: r.pillars.hour ? pil(r.pillars.hour) : null },
    upstreamApproved: false, // R-001 finalApproved=false (R-015 NO_GO)
    ...(chartId ? { chartId } : {}),
  };
  const monthTerm = { startMs: Date.parse(r.basis.month.prevJie.utc), endMs: Date.parse(r.basis.month.nextJie.utc) };
  let birth: BirthInstant | null = null;
  if (r.time.utc) birth = { exactMs: Date.parse(r.time.utc) };
  else {
    const { year, month, day } = r.calendar.solar;
    // 그날 하루를 가능 범위로 둔다. 과거 한국 표준시(+8:30 시기)·서머타임 차이를 덮도록 앞뒤 1시간씩 넓힌다(보수적으로 후보를 더 남김).
    const start = Date.UTC(year, month - 1, day) - 9 * 3600_000;
    birth = { fromMs: start - 3600_000, toMs: start + 86_400_000 + 3600_000 };
  }
  return { chart, monthTerm, birth };
}
