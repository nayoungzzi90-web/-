/**
 * R-003 지장간과 인원사령 분일 (기준서 R-003-DRAFT-1, 검토 중).
 * - 정적 지장간: 《연해자평》 지지장둔가(제2조). 구성원과 본기만 확정 데이터. 나열 순서는 사령 순서가 아니다.
 * - 사령 분일: 규칙집을 따로 둔다(제3조). SMTH_30_V1(《삼명통회》) 수치는 확보되지 않아 계산하지 않는다.
 *   MODERN_30_CANDIDATE_V1 은 미검증 후보(docs/saju-engine/source/R-003_sajeong_bunil_tables_UNVERIFIED.md)라 결과는 candidate 를 넘지 않는다.
 * - 시간 환산: normalized_30_v1 (제5조), 경계는 시작 포함·끝 미포함(제6조).
 */
import { chartProblems, type Branch, type Chart, type Evidence, type RuleMeta, type RuleStatus, type Stem } from './common';

export const R003_META: RuleMeta = { rule_id: 'R-003', rule_version: 'R-003-DRAFT-1', source_policy_version: 'yeonhae-japyeong-static-v1' };

/** 제2조 표: [구성원(원문 나열 순서), 본기] */
export const STATIC_HIDDEN: Record<Branch, { members: Stem[]; main: Stem }> = {
  子: { members: ['癸'], main: '癸' },
  丑: { members: ['己', '癸', '辛'], main: '己' },
  寅: { members: ['甲', '丙', '戊'], main: '甲' },
  卯: { members: ['乙'], main: '乙' },
  辰: { members: ['戊', '乙', '癸'], main: '戊' },
  巳: { members: ['丙', '庚', '戊'], main: '丙' },
  午: { members: ['丁', '己'], main: '丁' },
  未: { members: ['己', '丁', '乙'], main: '己' },
  申: { members: ['庚', '壬', '戊'], main: '庚' },
  酉: { members: ['辛'], main: '辛' },
  戌: { members: ['戊', '辛', '丁'], main: '戊' },
  亥: { members: ['壬', '甲'], main: '壬' },
};

/** 지장간 한 개의 원천 식별자(같은 지지·같은 글자는 하나로 본다: R-004 제6조, R-006 제8조) */
export const hiddenSourceId = (pos: string, branch: Branch, stem: Stem) => `hidden:${pos}:${branch}:${stem}`;

export type BunilRuleset = 'SMTH_30_V1' | 'MODERN_30_CANDIDATE_V1';
/** MODERN_30_CANDIDATE_V1 (미검증 후보): 월초부터 [사령 천간, 일수], 합계 30 */
export const MODERN_30_CANDIDATE_V1: Record<Branch, Array<[Stem, number]>> = {
  子: [['壬', 10], ['癸', 20]],
  丑: [['癸', 9], ['辛', 3], ['己', 18]],
  寅: [['戊', 7], ['丙', 7], ['甲', 16]],
  卯: [['甲', 10], ['乙', 20]],
  辰: [['乙', 9], ['癸', 3], ['戊', 18]],
  巳: [['戊', 7], ['庚', 7], ['丙', 16]],
  午: [['丙', 10], ['己', 9], ['丁', 11]],
  未: [['丁', 9], ['乙', 3], ['己', 18]],
  申: [['戊', 7], ['壬', 7], ['庚', 16]],
  酉: [['庚', 10], ['辛', 20]],
  戌: [['辛', 9], ['丁', 3], ['戊', 18]],
  亥: [['戊', 7], ['甲', 5], ['壬', 18]],
};

/** 출생 시각: 정확한 순간 또는 가능한 범위(출생 시간 미상) */
export type BirthInstant = { exactMs: number } | { fromMs: number; toMs: number };
export interface MonthTerm { startMs: number; endMs: number }

export interface CommanderResult {
  ruleset: BunilRuleset;
  policy: 'normalized_30_v1';
  status: RuleStatus;
  reason?: string;
  /** 월내 위치 p (정확한 출생 시각일 때) */
  position: number | null;
  /** 가능한 사령 천간(하나면 단일, 여러 개면 확정하지 않음) */
  candidates: Stem[];
  stem: Stem | null;
}

/** 제5조 normalized_30_v1: p 가 속한 구간 번호 (경계는 새 구간) */
function segmentIndex(table: Array<[Stem, number]>, p: number): number {
  let acc = 0;
  for (let i = 0; i < table.length; i++) { acc += table[i]![1]; if (p < acc / 30) return i; }
  return table.length - 1;
}

export function commanderOf(branch: Branch, term: MonthTerm | null, birth: BirthInstant | null, ruleset: BunilRuleset = 'MODERN_30_CANDIDATE_V1'): CommanderResult {
  const base = { ruleset, policy: 'normalized_30_v1' as const };
  if (ruleset === 'SMTH_30_V1') return { ...base, status: 'not_evaluated', reason: 'SOURCE_MISSING: 《삼명통회》 분일 수치 원문 미확보', position: null, candidates: [], stem: null };
  if (!term || !birth || !(term.endMs > term.startMs)) return { ...base, status: 'blocked', reason: '절입 구간 또는 출생 시각 없음/검증 실패(제4조)', position: null, candidates: [], stem: null };
  const table = MODERN_30_CANDIDATE_V1[branch];
  const len = term.endMs - term.startMs;
  if ('exactMs' in birth) {
    const B = birth.exactMs;
    if (B < term.startMs || B >= term.endMs) return { ...base, status: 'blocked', reason: '출생 시각이 해당 월 절입 구간 밖(제6조)', position: null, candidates: [], stem: null };
    const p = (B - term.startMs) / len;
    const stem = table[segmentIndex(table, p)]![0];
    return { ...base, status: 'candidate', position: p, candidates: [stem], stem };
  }
  const from = Math.max(birth.fromMs, term.startMs);
  const to = Math.min(birth.toMs, term.endMs); // [from, to)
  if (!(to > from)) return { ...base, status: 'blocked', reason: '가능한 출생 시각 범위가 해당 월과 겹치지 않음', position: null, candidates: [], stem: null };
  const i0 = segmentIndex(table, (from - term.startMs) / len);
  const i1 = segmentIndex(table, (to - 1 - term.startMs) / len);
  const candidates = [...new Set(table.slice(i0, i1 + 1).map(([s]) => s))];
  // 제6조: 가능한 구간이 여러 개면 단일 사령을 확정하지 않는다
  return candidates.length === 1
    ? { ...base, status: 'candidate', position: null, candidates, stem: candidates[0]! }
    : { ...base, status: 'review_required', reason: '출생 시각 불확실로 가능한 사령 구간이 여러 개', position: null, candidates, stem: null };
}

export interface HiddenAt { position: string; branch: Branch; members: Stem[]; main: Stem; sourceIds: string[] }
export interface R003Result {
  meta: RuleMeta;
  status: RuleStatus;
  blockedReasons: string[];
  /** 네 지지 각각의 정적 지장간(시지 미상이면 제외) */
  static: HiddenAt[];
  /** 중기·여기 세부 분류는 승인 데이터가 없어 보류(제2조) */
  layerClassification: 'classification_pending';
  /** 월지 사령: 규칙집별 결과를 따로 보존(제3조·제7조) */
  monthCommander: { modern: CommanderResult; smth: CommanderResult; differs: boolean | null } | null;
  upstreamApproved: boolean;
  evidence: Evidence[];
}

export function runR003(chart: Chart, opts: { monthTerm?: MonthTerm | null; birth?: BirthInstant | null } = {}): R003Result {
  const problems = chartProblems(chart);
  const base = { meta: R003_META, layerClassification: 'classification_pending' as const, upstreamApproved: chart.upstreamApproved };
  if (problems.length) return { ...base, status: 'blocked', blockedReasons: problems, static: [], monthCommander: null, evidence: [] };
  const statics: HiddenAt[] = [];
  const evidence: Evidence[] = [];
  for (const pos of ['year', 'month', 'day', 'hour'] as const) {
    const p = chart.pillars[pos];
    if (!p) continue;
    const t = STATIC_HIDDEN[p.branch];
    const sourceIds = t.members.map((s) => hiddenSourceId(pos, p.branch, s));
    statics.push({ position: pos, branch: p.branch, members: [...t.members], main: t.main, sourceIds });
    evidence.push({ id: `r003:static:${pos}`, rule_id: 'R-003', source: `branch:${pos}:${p.branch}`, detail: `${p.branch} 지장간 ${t.members.join('·')} (본기 ${t.main})` });
  }
  let monthCommander: R003Result['monthCommander'] = null;
  if (opts.monthTerm !== undefined || opts.birth !== undefined) {
    const mb = chart.pillars.month.branch;
    const modern = commanderOf(mb, opts.monthTerm ?? null, opts.birth ?? null, 'MODERN_30_CANDIDATE_V1');
    const smth = commanderOf(mb, opts.monthTerm ?? null, opts.birth ?? null, 'SMTH_30_V1');
    monthCommander = { modern, smth, differs: smth.stem && modern.stem ? smth.stem !== modern.stem : null };
  }
  return { ...base, status: 'structural_fact', blockedReasons: [], static: statics, monthCommander, evidence };
}
