// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
/**
 * 만세력 엔진 결과 → 기존 사주 해석 AI 엔진의 입력(SajuFacts) 변환.
 * 해석 엔진은 숫자를 다시 계산하지 않고 이 JSON 만 읽는다.
 */
import type { Element, SajuFacts, Stem, TenGod as FactsTenGod } from '../../../src/lib/saju/types';
import { hash64, stableStringify } from './config';
import type { ManseResult } from './engine';
import { STEMS } from './ganji';

const EL_EN: Record<string, Element> = { wood: 'wood', fire: 'fire', earth: 'earth', metal: 'metal', water: 'water' };

export function toSajuFacts(r: ManseResult): SajuFacts {
  const officialOk = r.dataVerification.officialConfirmed;
  const warnings: string[] = [];
  if (!officialOk) warnings.push('engine_unverified');
  if (!r.pillars.hour) warnings.push('hour_pillar_unavailable');
  if (r.uncertainties.some((u) => u.code === 'TERM_BOUNDARY' || u.code === 'TERM_DAY_TIME_UNKNOWN')) warnings.push('term_boundary_unverified');
  if (r.uncertainties.some((u) => u.code === 'PILLAR_POLICY_DEPENDENT')) warnings.push('pillar_policy_dependent');
  if (r.status === 'NEEDS_REVIEW') warnings.push('needs_review');
  if (!r.luck) warnings.push('luck_cycles_unavailable');
  if (r.time.known && r.basis.hour && (r.basis.hour.clockHour === 23 || r.basis.hour.clockHour === 0)) warnings.push('zi_hour_boundary_rule_applied');

  const five: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const [k, v] of Object.entries(r.fiveElementsCount)) five[EL_EN[k]] = v;
  const tg = (p: 'year' | 'month' | 'hour') => {
    const x = r.pillars[p];
    return x ? [{ position: p, stem: STEMS[x.stem] as Stem, god: x.stemTenGod as FactsTenGod }] : [];
  };
  const inputHash = hash64(stableStringify({ i: { ...r.input, yearly: undefined }, p: r.policyHash }));
  return {
    chartId: `manse_${inputHash}`,
    inputHash,
    pillars: { year: r.pillars.year.ganji, month: r.pillars.month.ganji, day: r.pillars.day.ganji, hour: r.pillars.hour?.ganji ?? null },
    dayMaster: STEMS[r.pillars.day.stem] as Stem,
    fiveElements: five,
    tenGods: [...tg('year'), ...tg('month'), ...tg('hour')],
    luckCycles: (r.luck?.pillars ?? []).map((p) => ({ startAge: Math.round(p.startAgeYears * 100) / 100, pillar: p.pillar.ganji })),
    computation: {
      engine_name: r.engine.name,
      engine_version: r.engine.version,
      rules_version: `${r.policy.policyVersion}#${r.policyHash} / terms:${r.engine.termDataset}`,
      timezone_policy: `${r.policy.timeBasis}, solarTime=${r.policy.solarTime.mode}, zi=${r.policy.ziHour}, zone=${r.engine.zoneSource.split(' — ')[0]}`,
      // 공식(KASI) 절입 자료로 확인되고, 정책/경계 불확실성이 없을 때만 true
      verified: officialOk && r.status === 'OK',
    },
    warnings,
    birth: { year: r.calendar.solar.year, month: r.calendar.solar.month, day: r.calendar.solar.day },
    review: { status: r.status, uncertainties: r.uncertainties.filter((u) => u.code !== 'BIRTHPLACE_MISSING' || r.status !== 'OK').map((u) => ({ code: u.code, severity: u.severity, message: u.message })) },
  };
}
