/**
 * 명리 규칙 엔진 공통 타입·기초표 (기준서 docs/saju-engine/source/R-002~R-005).
 * 결정론 계산만 한다. 해석(좋다/나쁘다, 강하다/약하다)은 하지 않는다.
 * 모든 결과는 규칙 ID·버전·근거 ID 를 가진다. 전문가 검증 전이므로 어떤 결과도 'approved' 가 아니다.
 */
import { BRANCHES, STEMS, type Branch, type Element, type Stem } from '../../manse/src/ganji';

export { BRANCHES, STEMS };
export type { Branch, Element, Stem };

export type Position = 'year' | 'month' | 'day' | 'hour';
export const POSITIONS: Position[] = ['year', 'month', 'day', 'hour'];

/** 기준서들이 쓰는 상태값의 합집합. approved 는 이 엔진이 만들지 않는다(승인 레지스트리 몫). */
export type RuleStatus = 'structural_fact' | 'provisional' | 'candidate' | 'review_required' | 'not_evaluated' | 'blocked';

export interface RuleMeta { rule_id: string; rule_version: string; source_policy_version: string }

/** 근거 한 줄. source 는 "어느 글자에서 나온 근거인가"(중복 가산 방지용 원천 식별자, R-006 제8조). */
export interface Evidence { id: string; rule_id: string; source: string; detail: string }

export interface Pillar { stem: Stem; branch: Branch }
/** 검증된 원국(R-001 결과). hour 는 출생 시간 미상이면 null. */
export interface Chart {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  /** R-001 계산이 운영 승인됐는지(현재 항상 false). 결과에 그대로 실어 보낸다. */
  upstreamApproved: boolean;
  chartId?: string;
}

export const STEM_ELEMENT: Record<Stem, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
export const STEM_YANG: Record<Stem, boolean> = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false };
const GEN: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CTL: Record<Element, Element> = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
export const generates = (a: Element, b: Element) => GEN[a] === b;
export const controls = (a: Element, b: Element) => CTL[a] === b;

export const isStem = (x: unknown): x is Stem => typeof x === 'string' && (STEMS as readonly string[]).includes(x);
export const isBranch = (x: unknown): x is Branch => typeof x === 'string' && (BRANCHES as readonly string[]).includes(x);

/** 입력 원국 검사: 글자가 올바른 천간·지지인지. 틀리면 규칙들은 blocked 를 돌려준다. */
export function chartProblems(c: Chart): string[] {
  const out: string[] = [];
  for (const pos of POSITIONS) {
    const p = c.pillars[pos];
    if (p === null) { if (pos !== 'hour') out.push(`${pos} 기둥 없음`); continue; }
    if (!isStem(p.stem)) out.push(`${pos} 천간 오류: ${String(p.stem)}`);
    if (!isBranch(p.branch)) out.push(`${pos} 지지 오류: ${String(p.branch)}`);
  }
  return out;
}
