// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
/**
 * 만세력 계산 엔진 (결정적·무외부호출). 입력 JSON → 결과 JSON.
 * AI 언어모델은 쓰지 않는다. 학파별 이견은 ManseConfig 로만 바꾼다.
 */
import { ConfigOverride, ManseConfig, policyHash, resolveConfig } from './config';
import { fail, ok, Result } from './errors';
import { Ganji, ganjiFromIndex, makeGanji, mod, BRANCHES, BRANCHES_KO, STEMS, STEMS_KO, stemYang, stemElement, branchElement } from './ganji';
import { HiddenStem, commandingStem, hiddenStems } from './hidden';
import { LunarDate, lunarToSolar, solarToLunar, lunarNewYear } from './lunar';
import { computeLuck, computeYearly, LuckResult, YearlyLuck } from './luck';
import { OfficialTerm, compareOfficial, officialKey } from './official';
import { dayIndexFromJdn, hourPillarOf, monthPillarOf, yearPillarOfYear } from './pillars';
import { Chart4, Relation, extractRelations } from './relations';
import { clockFor, KOREA_LON_RANGE, SEOUL_LON } from './solarTime';
import { JIE, TERMS, TERM_DATASET, TERM_ENGINE, Term, TermStatus, bracket, describeVerification, DataVerification, ipchun } from './terms';
import { TenGod, tenGod } from './tenGods';
import { Fields, MS_DAY, fieldsAt, fmtClock, jdn, validYmd, ymdFromJdn } from './time';
import { offsetAtUtc, localToUtc, ZONE_SOURCE } from './zone';

export const ENGINE_NAME = 'ohaeng-manse';
export const ENGINE_VERSION = '1.0.0';
export const SCHEMA_VERSION = '1.0';

export interface ManseRequest {
  calendar: 'solar' | 'lunar';
  year: number; month: number; day: number;
  /** 음력일 때만: 윤달 여부 */
  leapMonth?: boolean;
  hour?: number; minute?: number; second?: number;
  /** true 이거나 hour 가 없으면 시간 미상 */
  timeUnknown?: boolean;
  gender?: 'M' | 'F';
  /** 미입력이면 출생지 미상. 한국 출생만 지원하므로 경도는 124.0~132.0 */
  birthplace?: { longitude?: number; label?: string };
  /** 세운을 볼 연도 범위 (생략하면 계산하지 않음 — 결과가 호출 시각에 의존하지 않도록) */
  yearly?: { from: number; to: number };
}
export interface EngineOptions { officialTerms?: OfficialTerm[] }

export type Severity = 'INFO' | 'REVIEW';
export interface Uncertainty { code: string; severity: Severity; pillar?: 'year' | 'month' | 'day' | 'hour' | 'luck' | 'calendar' | 'time'; message: string; alternatives?: Array<Record<string, unknown>> }

export interface PillarOut extends Ganji { hidden: Array<HiddenStem & { tenGod: TenGod }>; mainTenGod: TenGod | '일간(나)'; stemTenGod: TenGod | '일간(나)'; stemElement: string; branchElement: string }
export interface ManseResult {
  schemaVersion: string;
  engine: { name: string; version: string; termDataset: string; termEngine: string; zoneSource: string };
  status: 'OK' | 'POLICY_DEPENDENT' | 'NEEDS_REVIEW';
  statusReasons: string[];
  input: ManseRequest;
  policy: ManseConfig; policyHash: string;
  calendar: { solar: { year: number; month: number; day: number }; lunar: LunarDate | null; lunarNote?: string; convertedFrom: 'solar' | 'lunar' };
  time: {
    known: boolean;
    civil: string | null; utc: string | null; zoneLabel: string | null; zoneOffsetMinutes: number | null; dst: boolean | null;
    sajuClock: string | null; sajuClockOffsetMinutes: number | null; steps: string[];
  };
  pillars: { year: PillarOut; month: PillarOut; day: PillarOut; hour: PillarOut | null };
  basis: {
    year: { rule: string; termName: string | null; termUtc: string | null; secondsFromTerm: number | null };
    month: { prevJie: { name: string; utc: string }; nextJie: { name: string; utc: string }; daysSincePrevJie: number; commandingStem: string | null };
    day: { rule: string; clockDate: string };
    hour: { rule: string; clockHour: number | null } | null;
  };
  dayMaster: { stem: string; stemKo: string; element: string; yang: boolean };
  fiveElementsCount: Record<string, number>;
  relations: Relation[];
  luck: LuckResult | null;
  yearly: YearlyLuck[] | null;
  uncertainties: Uncertainty[];
  warnings: string[];
  dataVerification: DataVerification & { termStatusesUsed: Record<string, TermStatus> };
}

// ───────────────────────── 내부: 한 번의 계산 ─────────────────────────
interface Core { year: Ganji; month: Ganji; day: Ganji; hour: Ganji | null; yearTerm: Term | null; yearYearNumber: number; sajuYear: number; prevJie: Term; nextJie: Term; clockFields: Fields | null; dayJdn: number; hourStemDayJdn: number | null; clockSteps: string[]; clockOffsetMin: number | null; placeMissing: boolean }

function sajuYearOf(utcMs: number): { year: number; term: Term | null } {
  const { prev } = bracket(TERMS.filter((t) => t.lon === 315), utcMs);
  return prev ? { year: prev.year, term: prev } : { year: 1899, term: null };
}

/** 연·월은 절대 시각(UTC), 일·시는 명리 시계로 계산한다 */
function core(utcMs: number, civilYmd: { y: number; m: number; d: number }, lunarYear: number | null, cfg: ManseConfig, lon: number | null, overrideSolar?: Parameters<typeof clockFor>[4], withTime = true): Core {
  const saju = sajuYearOf(utcMs);
  let yearNumber: number;
  if (cfg.yearBoundary === 'IPCHUN') yearNumber = saju.year;
  else if (cfg.yearBoundary === 'JAN1') yearNumber = civilYmd.y;
  else yearNumber = lunarYear ?? saju.year;
  const year = yearPillarOfYear(yearNumber);
  const { prev, next } = bracket(JIE, utcMs);
  if (!prev || !next) throw new Error('절입 표 범위 밖');
  const monthG = monthPillarOf(yearPillarOfYear(saju.year).stem, prev.branch as number); // 월간은 입춘년 기준(전통)

  let clockFields: Fields | null = null, dayJdn: number, hourStemJdn: number | null = null, hour: Ganji | null = null, steps: string[] = [], off: number | null = null, missing = false;
  if (withTime) {
    const zone = offsetAtUtc(utcMs);
    const ck = clockFor(utcMs, zone, lon, cfg, overrideSolar);
    steps = ck.steps; off = ck.offsetMin; missing = ck.placeMissing;
    clockFields = fieldsAt(utcMs, ck.offsetMin);
    dayJdn = jdn(clockFields.y, clockFields.m, clockFields.d);
    if (clockFields.hh >= 23 && cfg.ziHour === 'ZI_23_NEXT_DAY') dayJdn += 1;
    hourStemJdn = dayJdn + (clockFields.hh >= 23 && cfg.ziHour === 'ZI_SPLIT_YAJA' ? 1 : 0);
    hour = hourPillarOf(mod(hourStemJdn - 11, 60) % 10, clockFields.hh);
  } else {
    dayJdn = jdn(civilYmd.y, civilYmd.m, civilYmd.d);
  }
  const day = ganjiFromIndex(dayIndexFromJdn(dayJdn));
  return { year, month: monthG, day, hour, yearTerm: saju.term, yearYearNumber: yearNumber, sajuYear: saju.year, prevJie: prev, nextJie: next, clockFields, dayJdn, hourStemDayJdn: hourStemJdn, clockSteps: steps, clockOffsetMin: off, placeMissing: missing };
}

const ZI_POLICIES: ManseConfig['ziHour'][] = ['ZI_23_NEXT_DAY', 'ZI_SPLIT_YAJA', 'MIDNIGHT'];

function pillarOut(g: Ganji, dm: number, isDay: boolean, cfg: ManseConfig): PillarOut {
  const hs = hiddenStems(g.branch, cfg.hiddenStems.table);
  return {
    ...g,
    stemTenGod: isDay ? '일간(나)' : tenGod(dm, g.stem),
    mainTenGod: tenGod(dm, hs[hs.length - 1].stem),
    hidden: hs.map((h) => ({ ...h, tenGod: tenGod(dm, h.stem) })),
    stemElement: stemElement(g.stem), branchElement: branchElement(g.branch),
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

export function calculate(req: ManseRequest, override: ConfigOverride = {}, opts: EngineOptions = {}): Result<ManseResult> {
  const cr = resolveConfig(override);
  if (!cr.ok) return cr;
  const cfg = cr.value;
  const uncertainties: Uncertainty[] = [];
  const warnings: string[] = [];

  // ── 입력 검증 ──
  if (!req || (req.calendar !== 'solar' && req.calendar !== 'lunar')) return fail('INVALID_INPUT', 'calendar 는 solar 또는 lunar 여야 해요.');
  if (![req.year, req.month, req.day].every((n) => Number.isInteger(n))) return fail('INVALID_INPUT', '연·월·일은 정수여야 해요.');
  if (req.gender !== undefined && req.gender !== 'M' && req.gender !== 'F') return fail('GENDER_REQUIRED', "gender 는 'M' 또는 'F' 여야 해요 (대운 순역 계산에 필요).");
  let lon: number | null = null;
  if (req.birthplace?.longitude !== undefined) {
    const L = req.birthplace.longitude;
    if (typeof L !== 'number' || !Number.isFinite(L) || L < 124 || L > 132.5) return fail('INVALID_BIRTHPLACE', '한국 출생만 지원해요. 경도는 124.0°E ~ 132.5°E 여야 해요.', { longitude: L });
    lon = L;
  }
  const unknownTime = req.timeUnknown === true || req.hour === undefined;
  if (!unknownTime) {
    const { hour: h, minute: mi = 0, second: s = 0 } = req;
    if (!Number.isInteger(h) || (h as number) < 0 || (h as number) > 23 || !Number.isInteger(mi) || mi < 0 || mi > 59 || !Number.isInteger(s) || s < 0 || s > 59) return fail('INVALID_TIME', '시각은 0~23시 0~59분 0~59초여야 해요.');
  }

  // ── 달력 ──
  let solar: { y: number; m: number; d: number }; let lunar: LunarDate | null = null; let lunarNote: string | undefined;
  if (req.calendar === 'lunar') {
    const r = lunarToSolar(req.year, req.month, req.day, req.leapMonth === true, cfg.lunarClock);
    if (!r.ok) return r;
    solar = r.value; lunar = { year: req.year, month: req.month, day: req.day, leap: req.leapMonth === true };
  } else {
    if (!validYmd(req.year, req.month, req.day)) return fail('INVALID_DATE', `존재하지 않는 양력 날짜예요: ${req.year}-${req.month}-${req.day}`);
    solar = { y: req.year, m: req.month, d: req.day };
    const j = jdn(solar.y, solar.m, solar.d);
    if (j < jdn(1900, 1, 1) || j > jdn(2100, 12, 31)) return fail('OUT_OF_RANGE', '양력 1900-01-01 ~ 2100-12-31 만 지원해요.');
    const lr = solarToLunar(solar.y, solar.m, solar.d, cfg.lunarClock);
    if (lr.ok) lunar = lr.value;
  }
  if (solar.y > 2050) lunarNote = '2051년 이후 음력은 대조할 독립 자료가 없어요 (천문 계산만).';
  if (cfg.lunarClock === 'PRE1912_UTC_PLUS8' && solar.y < 1912) lunarNote = '1912년 이전 음력 날짜는 UTC+8 역일을 쓴 추정 정책이에요 (공식 확인 전).';
  if (lunarNote) uncertainties.push({ code: 'LUNAR_CALENDAR_UNVERIFIED', severity: 'INFO', pillar: 'calendar', message: lunarNote });

  // ── 시각 ──
  let utcMs: number; let zone = null as ReturnType<typeof offsetAtUtc> | null; let civilStr: string | null = null;
  let altUtc: number | null = null;
  if (!unknownTime) {
    const cands = localToUtc(solar.y, solar.m, solar.d, req.hour as number, req.minute ?? 0, req.second ?? 0);
    if (cands.length === 0) return fail('NONEXISTENT_LOCAL_TIME', `${solar.y}-${solar.m}-${solar.d} ${req.hour}:${String(req.minute ?? 0).padStart(2, '0')} 은 서머타임 시작으로 존재하지 않는 시각이에요.`, { hint: '시각을 확인해 주세요.' });
    if (cands.length > 1) {
      if (cfg.dstAmbiguous === 'ERROR') return fail('AMBIGUOUS_LOCAL_TIME', '서머타임 종료로 같은 시각이 두 번 있어요. 어느 쪽인지 알 수 없어요.', { candidates: cands.map((c) => iso(c.utcMs)) });
      const pick = cfg.dstAmbiguous === 'FIRST' ? 0 : 1;
      utcMs = cands[pick].utcMs; altUtc = cands[1 - pick].utcMs; zone = cands[pick].offset;
    } else { utcMs = cands[0].utcMs; zone = cands[0].offset; }
    civilStr = `${solar.y}-${String(solar.m).padStart(2, '0')}-${String(solar.d).padStart(2, '0')}T${String(req.hour).padStart(2, '0')}:${String(req.minute ?? 0).padStart(2, '0')}:${String(req.second ?? 0).padStart(2, '0')}`;
  } else {
    // 시각 미상: 그날 정오(현지)로 대표값을 잡고, 하루 전체 구간에서 연·월주가 바뀌는지 따로 본다
    const noon = localToUtc(solar.y, solar.m, solar.d, 12, 0, 0);
    utcMs = noon[0].utcMs; zone = noon[0].offset;
    warnings.push('태어난 시간을 몰라 시주는 계산하지 않았어요.');
  }

  if (cfg.solarTime.mode === 'LONGITUDE' && lon === null && cfg.solarTime.missingPlace === 'ERROR') return fail('INVALID_BIRTHPLACE', '진태양시 보정(LONGITUDE)에는 출생지 경도가 필요해요.');

  const civil = { y: solar.y, m: solar.m, d: solar.d };
  const lunarYear = lunar ? lunar.year : null;
  const c0 = core(utcMs, civil, lunarYear, cfg, lon, undefined, !unknownTime);
  const dm = c0.day.stem;

  // ── 절입 경계 가드 ──
  const guardMs = cfg.boundaryGuardSeconds * 1000;
  const statusOf = (t: Term): TermStatus => opts.officialTerms ? (overlay(opts.officialTerms).get(officialKey(t.year, t.name)) ?? t.status) : t.status;
  const reasons: string[] = [];
  /** 절입 직전·직후 1초의 연/월주를 비교해 두 후보를 만든다 */
  const checkBoundary = (which: 'year' | 'month', t: Term) => {
    const dist = Math.abs(utcMs - t.ms);
    const eff = guardMs + t.uncertaintySec * 1000;
    if (dist > eff) return;
    const bef = core(t.ms - 1000, civil, lunarYear, cfg, lon, undefined, false), aft = core(t.ms + 1000, civil, lunarYear, cfg, lon, undefined, false);
    const pick = (c: Core) => (which === 'year' ? c.year : c.month);
    if (pick(bef).ganji === pick(aft).ganji) return; // 정책상 이 절기에서 해당 기둥이 바뀌지 않음
    uncertainties.push({
      code: 'TERM_BOUNDARY', severity: 'REVIEW', pillar: which,
      message: `${t.name} 절입 시각(${iso(t.ms)})과 ${(dist / 1000).toFixed(1)}초 차이예요. 절입 시각 불확실도(±${t.uncertaintySec}초)와 보호 구간(${cfg.boundaryGuardSeconds}초) 안이라 ${which === 'year' ? '연주' : '월주'}를 확정하지 않아요.`,
      alternatives: [{ pillar: pick(bef).ganji, side: 'BEFORE_TERM' }, { pillar: pick(aft).ganji, side: 'AFTER_TERM' }],
    });
    reasons.push(`TERM_BOUNDARY:${which}`);
  };
  if (!unknownTime) {
    if (cfg.yearBoundary === 'IPCHUN') {
      const cand = [ipchun(c0.sajuYear), ipchun(c0.sajuYear + 1)].filter((x): x is Term => !!x);
      cand.sort((x, y) => Math.abs(utcMs - x.ms) - Math.abs(utcMs - y.ms));
      if (cand[0]) checkBoundary('year', cand[0]);
    }
    checkBoundary('month', Math.abs(utcMs - c0.prevJie.ms) <= Math.abs(c0.nextJie.ms - utcMs) ? c0.prevJie : c0.nextJie);
  } else {
    // 시각 미상: 절입이 그날 안에 있으면 연/월주 후보가 둘
    const dayStart = Math.min(...[localToUtc(solar.y, solar.m, solar.d, 0, 0, 0)[0]?.utcMs ?? utcMs - 12 * 3_600_000]);
    const dayEnd = dayStart + MS_DAY - 1;
    const cA = core(dayStart, civil, lunarYear, cfg, lon, undefined, false), cB = core(dayEnd, civil, lunarYear, cfg, lon, undefined, false);
    if (cA.year.ganji !== cB.year.ganji) { uncertainties.push({ code: 'TERM_DAY_TIME_UNKNOWN', severity: 'REVIEW', pillar: 'year', message: '입춘이 든 날이라 태어난 시간을 모르면 연주를 정할 수 없어요.', alternatives: [{ pillar: cA.year.ganji, side: 'BEFORE_TERM' }, { pillar: cB.year.ganji, side: 'AFTER_TERM' }] }); reasons.push('TERM_DAY_TIME_UNKNOWN:year'); }
    if (cA.month.ganji !== cB.month.ganji) { uncertainties.push({ code: 'TERM_DAY_TIME_UNKNOWN', severity: 'REVIEW', pillar: 'month', message: '절입일이라 태어난 시간을 모르면 월주를 정할 수 없어요.', alternatives: [{ pillar: cA.month.ganji, side: 'BEFORE_TERM' }, { pillar: cB.month.ganji, side: 'AFTER_TERM' }] }); reasons.push('TERM_DAY_TIME_UNKNOWN:month'); }
  }

  // ── 서머타임 중복 시각 ──
  if (altUtc !== null) {
    const ca = core(altUtc, civil, lunarYear, cfg, lon, undefined, true);
    if (ca.day.ganji !== c0.day.ganji || ca.hour?.ganji !== c0.hour?.ganji || ca.month.ganji !== c0.month.ganji || ca.year.ganji !== c0.year.ganji) {
      uncertainties.push({ code: 'DST_AMBIGUOUS', severity: 'REVIEW', pillar: 'time', message: '서머타임 종료로 같은 벽시계 시각이 두 번 있고, 두 경우의 사주가 달라요.', alternatives: [{ utc: iso(altUtc), year: ca.year.ganji, month: ca.month.ganji, day: ca.day.ganji, hour: ca.hour?.ganji ?? null }] });
      reasons.push('DST_AMBIGUOUS');
    } else uncertainties.push({ code: 'DST_AMBIGUOUS', severity: 'INFO', pillar: 'time', message: '서머타임 종료로 같은 벽시계 시각이 두 번 있지만 사주는 같아요.' });
  }
  if (zone && zone.dstMin > 0) uncertainties.push({ code: 'DST_APPLIED', severity: 'INFO', pillar: 'time', message: `출생 시각이 서머타임 기간이라 표준시로 환산해 계산했어요 (정책 timeBasis=${cfg.timeBasis}).` });
  if (zone && (zone.label === 'LMT')) uncertainties.push({ code: 'PRE_1908_LOCAL_MEAN_TIME', severity: 'INFO', pillar: 'time', message: '1908년 4월 이전에는 통일된 표준시가 없어 서울 지방평균시(UTC+8:27:52)로 해석했어요.' });
  if (zone && !unknownTime && zone.stdMin === 510) uncertainties.push({ code: 'UTC_PLUS_830_ERA', severity: 'INFO', pillar: 'time', message: `당시 표준시는 UTC+8:30 이었어요. 정책 timeBasis=${cfg.timeBasis} 에 따라 ${cfg.timeBasis === 'KST_PLUS9' ? 'UTC+9 시계로 환산' : '당시 표준시 그대로'} 계산했어요.` });

  // ── 정책 민감도: 일주·시주 ──
  if (!unknownTime) {
    const variants: Array<{ label: string; solar: NonNullable<Parameters<typeof clockFor>[4]> }> = [
      { label: '보정 없음(NONE)', solar: { mode: 'NONE' } },
      { label: '고정 -30분', solar: { mode: 'FIXED_OFFSET' } },
    ];
    if (lon !== null) variants.push({ label: `출생지 경도 ${lon}° 지방평균시`, solar: { mode: 'LONGITUDE', lon } });
    else {
      variants.push({ label: `서울 경도 ${SEOUL_LON}° 지방평균시`, solar: { mode: 'LONGITUDE', lon: SEOUL_LON } });
      variants.push({ label: `한반도 서쪽 끝 ${KOREA_LON_RANGE[0]}° 지방평균시`, solar: { mode: 'LONGITUDE', lon: KOREA_LON_RANGE[0] } });
      variants.push({ label: `한반도 동쪽 끝 ${KOREA_LON_RANGE[1]}° 지방평균시`, solar: { mode: 'LONGITUDE', lon: KOREA_LON_RANGE[1] } });
    }
    const outcomes = new Map<string, { day: string; hour: string | null; solar: Set<string>; zi: Set<string> }>();
    for (const v of variants) for (const z of ZI_POLICIES) {
      const cv = core(utcMs, civil, lunarYear, { ...cfg, ziHour: z }, lon, v.solar, true);
      const key = `${cv.day.ganji}|${cv.hour?.ganji}`;
      const e = outcomes.get(key) ?? { day: cv.day.ganji, hour: cv.hour?.ganji ?? null, solar: new Set<string>(), zi: new Set<string>() };
      e.solar.add(v.label); e.zi.add(z); outcomes.set(key, e);
    }
    if (outcomes.size > 1) {
      const mine = `${c0.day.ganji}|${c0.hour?.ganji}`;
      const alts = [...outcomes.entries()].filter(([k]) => k !== mine).map(([, e]) => ({ dayPillar: e.day, hourPillar: e.hour, whenSolarTime: [...e.solar], whenZiHour: [...e.zi] }));
      const dayDiff = alts.some((a) => a.dayPillar !== c0.day.ganji), hourDiff = alts.some((a) => a.hourPillar !== c0.hour?.ganji);
      uncertainties.push({
        code: 'PILLAR_POLICY_DEPENDENT', severity: 'INFO', pillar: dayDiff ? 'day' : 'hour',
        message: `${dayDiff ? '일주와 ' : ''}${hourDiff ? '시주' : ''}가 시간 보정·자시 정책 선택에 따라 달라져요 (현재 기준: ${solarLabel(cfg)}, 자시 ${ZI_LABEL[cfg.ziHour]}). ${lon === null ? '출생지가 입력되지 않아 한반도 경도 범위(서쪽 끝~동쪽 끝)를 모두 시험했어요.' : ''}`.trim(),
        alternatives: alts,
      });
    }
  }
  if (lon === null && cfg.solarTime.mode === 'LONGITUDE') uncertainties.push({ code: 'BIRTHPLACE_MISSING', severity: 'INFO', pillar: 'time', message: '출생지가 없어 진태양시 보정을 적용하지 못했어요.' });
  else if (lon === null && !unknownTime) uncertainties.push({ code: 'BIRTHPLACE_MISSING', severity: 'INFO', pillar: 'time', message: '출생지가 입력되지 않았어요. 현재 정책은 진태양시 보정을 쓰지 않지만, 출생지에 따라 시주가 달라질 수 있는지는 PILLAR_POLICY_DEPENDENT 에 표시했어요.' });

  // ── 절기 데이터 상태 ──
  const usedTerms = [c0.prevJie, c0.nextJie, ...(c0.yearTerm ? [c0.yearTerm] : [])];
  const usedStatuses: Record<string, TermStatus> = {};
  for (const t of usedTerms) usedStatuses[`${t.year}:${t.name}`] = statusOf(t);
  const dv = describeVerification(usedTerms.map((t) => ({ ...t, status: statusOf(t) })));
  if (cfg.requireOfficialTermData && !dv.officialConfirmed) {
    const nearTerm = usedTerms.some((t) => Math.abs(t.ms - utcMs) < 36 * 3_600_000);
    if (nearTerm) { reasons.push('OFFICIAL_TERM_DATA_REQUIRED'); uncertainties.push({ code: 'OFFICIAL_TERM_DATA_REQUIRED', severity: 'REVIEW', message: '정책상 공식 절입 자료가 필요한데, 출생 시각 부근 절기가 공식 확인되지 않았어요.' }); }
  }
  if (c0.sajuYear >= 2051 || c0.nextJie.year >= 2051) uncertainties.push({ code: 'EXTENDED_RANGE', severity: 'INFO', message: '2051년 이후 절입 시각은 불확실도가 더 커요 (미래 ΔT·윤초 예측).' });

  // ── 기둥 출력 ──
  const pillars = { year: pillarOut(c0.year, dm, false, cfg), month: pillarOut(c0.month, dm, false, cfg), day: pillarOut(c0.day, dm, true, cfg), hour: c0.hour ? pillarOut(c0.hour, dm, false, cfg) : null };
  const chart4: Chart4 = { stems: { year: c0.year.stem, month: c0.month.stem, day: c0.day.stem, ...(c0.hour ? { hour: c0.hour.stem } : {}) }, branches: { year: c0.year.branch, month: c0.month.branch, day: c0.day.branch, ...(c0.hour ? { hour: c0.hour.branch } : {}) } };
  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) if (p) { counts[p.stemElement]++; counts[p.branchElement]++; }

  const sinceJie = (utcMs - c0.prevJie.ms) / MS_DAY;
  const monthBasis = { prevJie: { name: c0.prevJie.name, utc: iso(c0.prevJie.ms) }, nextJie: { name: c0.nextJie.name, utc: iso(c0.nextJie.ms) }, daysSincePrevJie: Math.round(sinceJie * 1e4) / 1e4, commandingStem: cfg.hiddenStems.table === 'STANDARD' ? commandingStem(c0.month.branch, sinceJie).stemChar : null };

  // ── 대운·세운 ──
  let luck: LuckResult | null = null;
  if (req.gender === undefined) {
    if (cfg.luck.missingGender === 'ERROR') return fail('GENDER_REQUIRED', '대운 순역을 정하려면 성별(M/F)이 필요해요.');
    warnings.push('성별이 없어 대운은 계산하지 않았어요.');
  } else if (unknownTime) {
    // 시각 미상이면 기산 일수를 정할 수 없다 (정오 가정은 하지 않는다)
    warnings.push('태어난 시간을 몰라 대운 시작 나이를 정할 수 없어 대운은 계산하지 않았어요.');
  } else {
    luck = computeLuck(utcMs, stemYang(yearPillarOfYear(c0.sajuYear).stem), req.gender, c0.month.index, cfg.luck, c0.clockOffsetMin ?? 540);
    if (luck && Math.abs(luck.anchorGapDays) * MS_DAY < guardMs + 5000) uncertainties.push({ code: 'LUCK_START_NEAR_TERM', severity: 'INFO', pillar: 'luck', message: '출생이 절입 시각 직전·직후라 대운 시작 나이가 아주 작거나 불안정해요.' });
  }
  const yearly = req.yearly ? (req.yearly.from <= req.yearly.to && req.yearly.to - req.yearly.from <= 150 ? computeYearly(req.yearly.from, req.yearly.to, solar.y, luck) : null) : null;
  if (req.yearly && !yearly) return fail('INVALID_INPUT', 'yearly 범위가 올바르지 않아요 (from ≤ to, 150년 이내).');

  const hasReview = uncertainties.some((u) => u.severity === 'REVIEW');
  const hasPolicy = uncertainties.some((u) => u.code === 'PILLAR_POLICY_DEPENDENT');
  const status: ManseResult['status'] = hasReview ? 'NEEDS_REVIEW' : hasPolicy ? 'POLICY_DEPENDENT' : 'OK';
  if (!dv.officialConfirmed) warnings.push('절입 시각은 독립 천문 계산 2종이 일치한 값이며, 한국천문연구원 공식 값과의 일치는 확인되지 않았어요.');

  return ok({
    schemaVersion: SCHEMA_VERSION,
    engine: { name: ENGINE_NAME, version: ENGINE_VERSION, termDataset: TERM_DATASET, termEngine: TERM_ENGINE, zoneSource: ZONE_SOURCE },
    status, statusReasons: reasons, input: req, policy: cfg, policyHash: policyHash(cfg),
    calendar: { solar: { year: solar.y, month: solar.m, day: solar.d }, lunar, ...(lunarNote ? { lunarNote } : {}), convertedFrom: req.calendar },
    time: {
      known: !unknownTime, civil: civilStr, utc: unknownTime ? null : iso(utcMs), zoneLabel: unknownTime ? null : zone?.label ?? null,
      zoneOffsetMinutes: unknownTime ? null : zone?.totalMin ?? null, dst: unknownTime ? null : (zone?.dstMin ?? 0) > 0,
      sajuClock: c0.clockFields ? fmtClock(c0.clockFields) : null, sajuClockOffsetMinutes: c0.clockOffsetMin, steps: c0.clockSteps,
    },
    pillars,
    basis: {
      year: { rule: cfg.yearBoundary, termName: c0.yearTerm?.name ?? null, termUtc: c0.yearTerm ? iso(c0.yearTerm.ms) : null, secondsFromTerm: c0.yearTerm ? Math.round((utcMs - c0.yearTerm.ms) / 100) / 10 : null },
      month: monthBasis,
      day: { rule: cfg.ziHour, clockDate: c0.clockFields ? `${c0.clockFields.y}-${String(c0.clockFields.m).padStart(2, '0')}-${String(c0.clockFields.d).padStart(2, '0')}` : `${solar.y}-${String(solar.m).padStart(2, '0')}-${String(solar.d).padStart(2, '0')}` },
      hour: c0.hour ? { rule: cfg.ziHour, clockHour: c0.clockFields?.hh ?? null } : null,
    },
    dayMaster: { stem: STEMS[dm], stemKo: STEMS_KO[dm], element: stemElement(dm), yang: stemYang(dm) },
    fiveElementsCount: counts,
    relations: extractRelations(chart4, cfg.relations),
    luck, yearly, uncertainties, warnings,
    dataVerification: { ...dv, termStatusesUsed: usedStatuses },
  });
}

const ZI_LABEL: Record<ManseConfig['ziHour'], string> = { ZI_23_NEXT_DAY: '23시에 날짜 교체', ZI_SPLIT_YAJA: '야자시·조자시 구분', MIDNIGHT: '0시에 날짜 교체' };
function solarLabel(cfg: ManseConfig) {
  const s = cfg.solarTime;
  return s.mode === 'NONE' ? '보정 없음' : s.mode === 'FIXED_OFFSET' ? `고정 ${s.fixedOffsetMinutes}분` : '경도 보정';
}

const overlayCache = new WeakMap<OfficialTerm[], Map<string, TermStatus>>();
function overlay(rows: OfficialTerm[]): Map<string, TermStatus> {
  let m = overlayCache.get(rows);
  if (!m) { m = new Map(compareOfficial(TERMS, rows).map((c) => [officialKey(c.year, c.name), c.status])); overlayCache.set(rows, m); }
  return m;
}

export { BRANCHES, BRANCHES_KO, makeGanji, lunarNewYear, ymdFromJdn };
