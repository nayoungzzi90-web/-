/**
 * R-002 월령과 일간의 계절적 세력 관계 (기준서 R-002, 전문가 검토·승인 대기).
 * 왕상휴수사 5단계, 협의·광의 득령을 계산한다. 신강신약·격국·용신은 정하지 않는다(제1조, 제8조).
 */
import { chartProblems, controls, generates, STEM_ELEMENT, type Branch, type Chart, type Element, type Evidence, type RuleMeta, type RuleStatus, type Stem } from './common';

export const R002_META: RuleMeta = { rule_id: 'R-002', rule_version: 'R-002-SPEC-PASTED-2026-10-29', source_policy_version: 'season-groups-v1' };

export type SeasonGroup = 'spring' | 'summer' | 'autumn' | 'winter' | 'transition';
export type Grade = '旺' | '相' | '休' | '囚' | '死';

/** 제4조: 월지 → 계절 구분과 대표 오행 */
export const SEASON_OF: Record<Branch, { group: SeasonGroup; element: Element }> = {
  寅: { group: 'spring', element: 'wood' }, 卯: { group: 'spring', element: 'wood' },
  巳: { group: 'summer', element: 'fire' }, 午: { group: 'summer', element: 'fire' },
  申: { group: 'autumn', element: 'metal' }, 酉: { group: 'autumn', element: 'metal' },
  亥: { group: 'winter', element: 'water' }, 子: { group: 'winter', element: 'water' },
  辰: { group: 'transition', element: 'earth' }, 未: { group: 'transition', element: 'earth' }, 戌: { group: 'transition', element: 'earth' }, 丑: { group: 'transition', element: 'earth' },
};
/** 제7조: 계절 전환월의 검토 특성 */
export const TRANSITION_TRAIT: Partial<Record<Branch, string>> = {
  辰: '봄에서 여름으로 넘어가는 습토', 未: '여름에서 가을로 넘어가는 조토', 戌: '가을에서 겨울로 넘어가는 조토', 丑: '겨울에서 봄으로 넘어가는 한습토',
};

/** 제5조: 일간 오행과 월령 대표 오행의 생극으로 왕상휴수사 */
export function gradeOf(dayElement: Element, monthElement: Element): Grade {
  if (dayElement === monthElement) return '旺';
  if (generates(monthElement, dayElement)) return '相';
  if (generates(dayElement, monthElement)) return '休';
  if (controls(dayElement, monthElement)) return '囚';
  return '死'; // 월령이 일간을 극함
}

export interface R002Result {
  meta: RuleMeta;
  status: RuleStatus;
  blockedReasons: string[];
  dayStem: Stem | null;
  monthBranch: Branch | null;
  season: SeasonGroup | null;
  monthElement: Element | null;
  /** 旺相休囚死. 토월이면 provisional */
  seasonal_grade: Grade | null;
  grade_status: RuleStatus;
  /** 제2조·제6조: 협의(旺만), 광의(旺·相) — 두 값을 모두 저장한다 */
  deukryeong_narrow: boolean | null;
  deukryeong_broad: boolean | null;
  transition_month: boolean;
  transition_trait: string | null;
  /** 토월 잔여 기운·사령 반영 세부 판단은 분일 규칙 확정 전까지 유보(제7조) */
  transition_detail: 'not_evaluated' | null;
  /** 신강신약은 이 규칙에서 정하지 않는다(제6조) */
  strength: 'not_evaluated';
  upstreamApproved: boolean;
  evidence: Evidence[];
}

export function runR002(chart: Chart): R002Result {
  const problems = chartProblems(chart);
  const base = { meta: R002_META, upstreamApproved: chart.upstreamApproved, strength: 'not_evaluated' as const };
  if (problems.length) {
    return { ...base, status: 'blocked', blockedReasons: problems, dayStem: null, monthBranch: null, season: null, monthElement: null, seasonal_grade: null, grade_status: 'blocked', deukryeong_narrow: null, deukryeong_broad: null, transition_month: false, transition_trait: null, transition_detail: null, evidence: [] };
  }
  const dayStem = chart.pillars.day.stem;
  const mb = chart.pillars.month.branch;
  const s = SEASON_OF[mb];
  const grade = gradeOf(STEM_ELEMENT[dayStem], s.element);
  const transition = s.group === 'transition';
  const gradeStatus: RuleStatus = transition ? 'provisional' : 'structural_fact';
  return {
    ...base,
    status: gradeStatus,
    blockedReasons: [],
    dayStem, monthBranch: mb, season: s.group, monthElement: s.element,
    seasonal_grade: grade, grade_status: gradeStatus,
    deukryeong_narrow: grade === '旺',
    deukryeong_broad: grade === '旺' || grade === '相',
    transition_month: transition,
    transition_trait: TRANSITION_TRAIT[mb] ?? null,
    transition_detail: transition ? 'not_evaluated' : null,
    evidence: [{ id: `r002:season:${mb}`, rule_id: 'R-002', source: `branch:month:${mb}`, detail: `월지 ${mb} = ${s.group}(${s.element}), 일간 ${dayStem}(${STEM_ELEMENT[dayStem]}) → ${grade}${transition ? ' (토월 잠정)' : ''}` }],
  };
}
