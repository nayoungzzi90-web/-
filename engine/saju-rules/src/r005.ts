/**
 * R-005 천간 생조·극설·소모와 득세 기초 (기준서 R-005-DRAFT-1, 승인 대기).
 * - 일간 기준으로 연간·월간·시간의 관계와 십성을 계산한다. 일간 자신은 비견으로 세지 않는다(제2조).
 * - 네 천간의 6개 쌍 관계, 인접성, 구조 후보(재극인 등)를 기록하되 성립은 판단하지 않는다(제8조).
 * - 간합은 존재·위치·인접·방해·쟁합 가능성만 기록하고 작용·합화는 not_evaluated(제9조). 오행을 바꾸지 않는다.
 * - 득세(deukse)는 not_evaluated(제11조). 개수로 강약을 정하지 않는다(제12조).
 */
import { chartProblems, controls, generates, POSITIONS, STEM_ELEMENT, STEM_YANG, type Chart, type Evidence, type Position, type RuleMeta, type RuleStatus, type Stem } from './common';
import type { R004Result } from './r004';

export const R005_META: RuleMeta = { rule_id: 'R-005', rule_version: 'R-005-DRAFT-1', source_policy_version: 'ten-gods-v1' };

export type RelationCode = 'PEER' | 'GENERATES_SELF' | 'SELF_GENERATES' | 'SELF_CONTROLS' | 'CONTROLS_SELF';
export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';
export type GodGroup = '비겁' | '인성' | '식상' | '재성' | '관살';
export type Role = 'support' | 'drain' | 'consume' | 'control';

/** 제3조 */
export function relationOf(day: Stem, other: Stem): RelationCode {
  const a = STEM_ELEMENT[day], b = STEM_ELEMENT[other];
  if (a === b) return 'PEER';
  if (generates(b, a)) return 'GENERATES_SELF';
  if (generates(a, b)) return 'SELF_GENERATES';
  if (controls(a, b)) return 'SELF_CONTROLS';
  return 'CONTROLS_SELF';
}
/** 제4조: 음양이 같으면 앞(비견·편인·식신·편재·편관), 다르면 뒤(겁재·정인·상관·정재·정관) */
export function tenGodOf(day: Stem, other: Stem): TenGod {
  const same = STEM_YANG[day] === STEM_YANG[other];
  switch (relationOf(day, other)) {
    case 'PEER': return same ? '비견' : '겁재';
    case 'GENERATES_SELF': return same ? '편인' : '정인';
    case 'SELF_GENERATES': return same ? '식신' : '상관';
    case 'SELF_CONTROLS': return same ? '편재' : '정재';
    default: return same ? '편관' : '정관';
  }
}
export const GROUP_OF: Record<RelationCode, GodGroup> = { PEER: '비겁', GENERATES_SELF: '인성', SELF_GENERATES: '식상', SELF_CONTROLS: '재성', CONTROLS_SELF: '관살' };
/** 제5조·제6조: 지원(비겁·인성) / 설기(식상) / 소모(재성) / 극제(관살) */
export const ROLE_OF: Record<GodGroup, Role> = { 비겁: 'support', 인성: 'support', 식상: 'drain', 재성: 'consume', 관살: 'control' };

export const STEM_COMBINATIONS: Array<[Stem, Stem]> = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
const combines = (a: Stem, b: Stem) => STEM_COMBINATIONS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

const IDX: Record<Position, number> = { year: 0, month: 1, day: 2, hour: 3 };
const adjacent = (a: Position, b: Position) => Math.abs(IDX[a] - IDX[b]) === 1;

export interface StemRelation {
  position: Position; stem: Stem; relation: RelationCode; tenGod: TenGod; group: GodGroup; role: Role;
  /** R-004 통근 근거 ID 참조(없으면 빈 배열). 통근 유무로 힘을 정하지 않는다(제10조) */
  rootEvidenceIds: string[];
}
export interface PairRelation {
  a: Position; b: Position; stemA: Stem; stemB: Stem; adjacent: boolean;
  /** 두 천간 사이 오행 관계(방향 포함) */
  elementRelation: 'same' | 'a_generates_b' | 'b_generates_a' | 'a_controls_b' | 'b_controls_a';
}
export type StructureKind = 'wealth_controls_resource' | 'officer_generates_resource' | 'output_controls_officer' | 'output_generates_wealth' | 'peer_controls_wealth';
/** 제8조: 오행 기본 관계로 본 구조 후보(식신제살·살인상생 등 실제 성립은 미판단) */
export interface StructureCandidate { kind: StructureKind; from: Position; to: Position; status: 'candidate' }
export interface Combination {
  pair: [Position, Position]; stems: [Stem, Stem]; adjacent: boolean;
  /** 사이에 낀 다른 천간(원격일 때) */
  between: Position[];
  /** 같은 상대를 두고 다투는 다른 천간(쟁합·투합 가능성) */
  competing: Position[];
  effect: 'not_evaluated';
  transformation: 'not_evaluated';
}

export interface R005Result {
  meta: RuleMeta;
  status: RuleStatus;
  blockedReasons: string[];
  dayStem: Stem | null;
  /** 일간 기준 세 천간(시간 미상이면 둘) */
  relations: StemRelation[];
  /** 네 천간의 모든 두 자리 조합(시간 미상이면 3개) */
  pairs: PairRelation[];
  structures: StructureCandidate[];
  combinations: Combination[];
  counts: { peer: number; resource: number; output: number; wealth: number; officer: number };
  deukse: 'not_evaluated';
  upstreamApproved: boolean;
  evidence: Evidence[];
}

export function runR005(chart: Chart, r004?: R004Result): R005Result {
  const problems = chartProblems(chart);
  const base = { meta: R005_META, deukse: 'not_evaluated' as const, upstreamApproved: chart.upstreamApproved };
  if (problems.length) return { ...base, status: 'blocked', blockedReasons: problems, dayStem: null, relations: [], pairs: [], structures: [], combinations: [], counts: { peer: 0, resource: 0, output: 0, wealth: 0, officer: 0 }, evidence: [] };
  const day = chart.pillars.day.stem;
  const present = POSITIONS.filter((p) => chart.pillars[p] !== null);
  const stemAt = (p: Position) => chart.pillars[p]!.stem;
  const rootIds = (p: Position) => (r004?.evidence ?? []).filter((e) => e.id.startsWith(`r004:${p}:`)).map((e) => e.id);

  const relations: StemRelation[] = present.filter((p) => p !== 'day').map((p) => {
    const s = stemAt(p); const relation = relationOf(day, s); const group = GROUP_OF[relation];
    return { position: p, stem: s, relation, tenGod: tenGodOf(day, s), group, role: ROLE_OF[group], rootEvidenceIds: rootIds(p) };
  });
  const groupAt = (p: Position): GodGroup | 'self' => (p === 'day' ? 'self' : relations.find((r) => r.position === p)!.group);

  const pairs: PairRelation[] = [];
  const structures: StructureCandidate[] = [];
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const a = present[i]!, b = present[j]!; const ea = STEM_ELEMENT[stemAt(a)], eb = STEM_ELEMENT[stemAt(b)];
    const rel: PairRelation['elementRelation'] = ea === eb ? 'same' : generates(ea, eb) ? 'a_generates_b' : generates(eb, ea) ? 'b_generates_a' : controls(ea, eb) ? 'a_controls_b' : 'b_controls_a';
    pairs.push({ a, b, stemA: stemAt(a), stemB: stemAt(b), adjacent: adjacent(a, b), elementRelation: rel });
    // 구조 후보는 일간을 뺀 천간끼리(제8조)
    if (a === 'day' || b === 'day') continue;
    for (const [from, to, kind] of [[a, b, rel.startsWith('a_') ? rel.slice(2) : null], [b, a, rel.startsWith('b_') ? rel.slice(2) : null]] as const) {
      if (!kind) continue;
      const gf = groupAt(from), gt = groupAt(to);
      const k: StructureKind | null =
        kind === 'controls_b' && gf === '재성' && gt === '인성' ? 'wealth_controls_resource'
          : kind === 'generates_b' && gf === '관살' && gt === '인성' ? 'officer_generates_resource'
            : kind === 'controls_b' && gf === '식상' && gt === '관살' ? 'output_controls_officer'
              : kind === 'generates_b' && gf === '식상' && gt === '재성' ? 'output_generates_wealth'
                : kind === 'controls_b' && gf === '비겁' && gt === '재성' ? 'peer_controls_wealth' : null;
      if (k) structures.push({ kind: k, from, to, status: 'candidate' });
    }
  }

  const combinations: Combination[] = [];
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const a = present[i]!, b = present[j]!;
    if (!combines(stemAt(a), stemAt(b))) continue;
    const between = present.filter((p) => IDX[p] > IDX[a] && IDX[p] < IDX[b]);
    const competing = present.filter((p) => p !== a && p !== b && (combines(stemAt(p), stemAt(a)) || combines(stemAt(p), stemAt(b))));
    combinations.push({ pair: [a, b], stems: [stemAt(a), stemAt(b)], adjacent: adjacent(a, b), between, competing, effect: 'not_evaluated', transformation: 'not_evaluated' });
  }

  const c = (g: GodGroup) => relations.filter((r) => r.group === g).length;
  const evidence: Evidence[] = relations.map((r) => ({ id: `r005:${r.position}`, rule_id: 'R-005', source: `stem:${r.position}:${r.stem}`, detail: `${r.position} 천간 ${r.stem}: 일간 ${day} 기준 ${r.tenGod}(${r.group}, ${r.role})` }));
  return {
    ...base, status: 'structural_fact', blockedReasons: [], dayStem: day, relations, pairs, structures, combinations,
    counts: { peer: c('비겁'), resource: c('인성'), output: c('식상'), wealth: c('재성'), officer: c('관살') }, evidence,
  };
}
