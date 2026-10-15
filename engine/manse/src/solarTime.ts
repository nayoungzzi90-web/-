import { ManseConfig } from './config';
import { ZoneOffset } from './zone';

/** 한반도 육지·도서 경도 범위(독도 131.87°E ~ 백령도 124.6°E 부근) — 출생지 미입력 시 민감도 분석에 쓴다 */
export const KOREA_LON_RANGE: [number, number] = [124.6, 131.9];
export const SEOUL_LON = 126.98;

/** 균시차(분). NOAA 근사식(오차 ≈ 0.5분 이내). 기본 정책에서는 쓰지 않는다. */
export function equationOfTimeMinutes(utcMs: number): number {
  const d = new Date(utcMs); const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const n = Math.floor((utcMs - start) / 86_400_000);
  const g = (2 * Math.PI / 365) * (n - 1 + (d.getUTCHours() - 12) / 24);
  return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
}

export interface ClockInfo {
  /** 명리 계산에 쓰는 시계가 UTC 보다 앞선 분 */
  offsetMin: number;
  steps: string[];
  usedLongitude: number | null;
  placeMissing: boolean;
}

/**
 * 일주·시주 계산에 쓸 "시계"를 정한다.
 *  - NONE: 정책 timeBasis 의 표준시를 그대로 쓴다(진태양시 보정 없음)
 *  - LONGITUDE: 출생지 경도 × 4분 (+ 선택적으로 균시차)
 *  - FIXED_OFFSET: timeBasis 시계에 고정 분을 더한다 (예: -30)
 */
export function clockFor(utcMs: number, zone: ZoneOffset, longitude: number | null, cfg: ManseConfig, overrideMode?: { mode: ManseConfig['solarTime']['mode']; lon?: number | null; eot?: boolean }): ClockInfo {
  const st = overrideMode ? { ...cfg.solarTime, mode: overrideMode.mode, applyEquationOfTime: overrideMode.eot ?? cfg.solarTime.applyEquationOfTime } : cfg.solarTime;
  const lonIn = overrideMode && overrideMode.lon !== undefined ? overrideMode.lon : longitude;
  const steps: string[] = [];
  const base = cfg.timeBasis === 'KST_PLUS9' ? 540 : cfg.timeBasis === 'ERA_STANDARD' ? zone.stdMin : zone.totalMin;
  steps.push(`시계 기준(${cfg.timeBasis}): UTC${base >= 0 ? '+' : ''}${(base / 60).toFixed(4)}h`);
  if (st.mode === 'NONE') return { offsetMin: base, steps, usedLongitude: null, placeMissing: false };
  if (st.mode === 'FIXED_OFFSET') { steps.push(`고정 보정 ${st.fixedOffsetMinutes}분`); return { offsetMin: base + st.fixedOffsetMinutes, steps, usedLongitude: null, placeMissing: false }; }
  let lon = lonIn; let missing = false;
  if (lon === null || lon === undefined) {
    missing = true;
    if (st.missingPlace === 'USE_SEOUL') { lon = SEOUL_LON; steps.push(`출생지 미입력 → 서울 경도 ${SEOUL_LON}° 사용`); }
    else { steps.push('출생지 미입력 → 진태양시 보정 생략(표준시 사용)'); return { offsetMin: base, steps, usedLongitude: null, placeMissing: true }; }
  }
  let off = (lon as number) * 4;
  steps.push(`경도 ${lon}° → ${(off).toFixed(2)}분 (지방평균시 = UTC + 경도/15시간)`);
  if (st.applyEquationOfTime) { const e = equationOfTimeMinutes(utcMs); off += e; steps.push(`균시차 ${e.toFixed(2)}분`); }
  return { offsetMin: off, steps, usedLongitude: lon as number, placeMissing: missing };
}
