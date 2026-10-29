/**
 * R-004 통근 및 득지 (기준서 R-004-DRAFT-1, 검토 중).
 * 네 천간 × 네 지지의 정적 지장간(R-003)을 탐색해 구조적 뿌리를 기록한다.
 * - exact_stem(같은 글자) / same_element(같은 오행, 음양 다름) / no_structural_root
 * - 생조 관계(예: 水生木)는 뿌리가 아니다(제3조). 합충에 따른 변화는 not_evaluated(제8조).
 * - 개수로 강약을 정하지 않는다(제6조).
 */
import { chartProblems, POSITIONS, STEM_ELEMENT, type Branch, type Chart, type Evidence, type Position, type RuleMeta, type RuleStatus, type Stem } from './common';
import { hiddenSourceId, STATIC_HIDDEN } from './r003';

export const R004_META: RuleMeta = { rule_id: 'R-004', rule_version: 'R-004-DRAFT-1', source_policy_version: 'yeonhae-japyeong-static-v1' };

export interface Root {
  stemPosition: Position;
  stem: Stem;
  branchPosition: Position;
  branch: Branch;
  hiddenStem: Stem;
  kind: 'exact_stem' | 'same_element';
  layer: 'main_qi' | 'secondary_qi';
  /** 중기/여기 세부 구분은 승인 데이터 없음 */
  secondaryDetail: 'classification_pending' | null;
  /** 원천 지장간 식별자(같은 지장간에 여러 천간이 닿아도 하나로 식별) */
  sourceId: string;
}

export interface StemRoots {
  position: Position;
  stem: Stem;
  roots: Root[];
  hasStructuralRoot: boolean;
  /** 일간만 의미: 일지·월지 통근 플래그(제5조) */
  day_branch_rooted?: boolean;
  month_branch_rooted?: boolean;
}

export interface R004Result {
  meta: RuleMeta;
  status: RuleStatus;
  blockedReasons: string[];
  stems: StemRoots[];
  /** 장생·건록·묘고 등 확장 근기(제9조) */
  extendedRoots: 'not_evaluated';
  /** 합충형파해·합화에 따른 뿌리 변화(제8조) */
  root_modification: 'not_evaluated';
  upstreamApproved: boolean;
  evidence: Evidence[];
}

export function runR004(chart: Chart): R004Result {
  const problems = chartProblems(chart);
  const base = { meta: R004_META, extendedRoots: 'not_evaluated' as const, root_modification: 'not_evaluated' as const, upstreamApproved: chart.upstreamApproved };
  if (problems.length) return { ...base, status: 'blocked', blockedReasons: problems, stems: [], evidence: [] };
  const stems: StemRoots[] = [];
  const evidence: Evidence[] = [];
  for (const sp of POSITIONS) {
    const sPillar = chart.pillars[sp];
    if (!sPillar) continue;
    const stem = sPillar.stem;
    const roots: Root[] = [];
    for (const bp of POSITIONS) {
      const bPillar = chart.pillars[bp];
      if (!bPillar) continue;
      const t = STATIC_HIDDEN[bPillar.branch];
      for (const h of t.members) {
        if (STEM_ELEMENT[h] !== STEM_ELEMENT[stem]) continue; // 같은 오행만 뿌리. 생조는 제외
        const isMain = h === t.main;
        roots.push({
          stemPosition: sp, stem, branchPosition: bp, branch: bPillar.branch, hiddenStem: h,
          kind: h === stem ? 'exact_stem' : 'same_element',
          layer: isMain ? 'main_qi' : 'secondary_qi',
          secondaryDetail: isMain ? null : 'classification_pending',
          sourceId: hiddenSourceId(bp, bPillar.branch, h),
        });
      }
    }
    const entry: StemRoots = { position: sp, stem, roots, hasStructuralRoot: roots.length > 0 };
    if (sp === 'day') {
      entry.day_branch_rooted = roots.some((r) => r.branchPosition === 'day');
      entry.month_branch_rooted = roots.some((r) => r.branchPosition === 'month');
    }
    stems.push(entry);
    for (const r of roots) evidence.push({ id: `r004:${sp}:${r.branchPosition}:${r.hiddenStem}`, rule_id: 'R-004', source: r.sourceId, detail: `${sp} 천간 ${stem} → ${r.branchPosition} 지지 ${r.branch}의 ${r.hiddenStem} (${r.kind}, ${r.layer})` });
  }
  return { ...base, status: 'structural_fact', blockedReasons: [], stems, evidence };
}
