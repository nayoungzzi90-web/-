import { BRANCH_ELEMENT, STEM_ELEMENT, branchGod, tenGod } from '../lib/saju/rules';
import { BRANCH_KO, BRANCHES, Branch, Element, SajuFacts, STEM_KO, STEMS, Stem } from '../lib/saju/types';

const pk = (p: string | null) => (p ? STEM_KO[STEMS.indexOf(p[0] as Stem)] + BRANCH_KO[BRANCHES.indexOf(p[1] as Branch)] : '');

/** 만세력 표: 시·일·월·연 네 기둥을 오행 색 타일로 보여 준다. 시간 미상이면 시주 칸은 비운다. */
export function ChartTable({ facts }: { facts: SajuFacts }) {
  const cols = [facts.pillars.hour, facts.pillars.day, facts.pillars.month, facts.pillars.year];
  return (
    <>
      <div className="chart-head">{['시주', '일주', '월주', '연주'].map((l) => <span key={l}>{l}</span>)}</div>
      <div className="chart-grid" role="table" aria-label="사주 원국표">
        {cols.map((p, i) => (
          <div key={i} className="chart-god-wrap">
            <div className={`chart-god${i === 1 ? ' me' : ''}`}>{p ? (i === 1 ? '일간(나)' : tenGod(facts.dayMaster, p[0] as Stem)) : ''}</div>
            <div className={`tile-el ${p ? (STEM_ELEMENT[p[0] as Stem] as Element) : 'none'}${i === 1 ? ' me' : ''}`}>{p ? p[0] : '—'}</div>
            <div style={{ height: 8 }} />
            <div className={`tile-el ${p ? (BRANCH_ELEMENT[p[1] as Branch] as Element) : 'none'}`}>{p ? p[1] : '—'}</div>
            <div className="chart-god">{p ? branchGod(facts.dayMaster, p[1] as Branch) : '시간 미상'}</div>
            <div className="muted small">{p ? pk(p) : ''}</div>
          </div>
        ))}
      </div>
    </>
  );
}
