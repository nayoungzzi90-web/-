// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import { ManseConfig } from './config';
import { Ganji, ganjiFromIndex, mod } from './ganji';
import { fieldsAt, jdn } from './time';
import { bracket, JIE, ipchun } from './terms';

export interface AgeParts { years: number; months: number; days: number }
export interface LuckPillar { order: number; pillar: Ganji; startAgeYears: number; startAge: AgeParts; startUtc: string; startKstYear: number; endAgeYears: number }
export interface LuckResult {
  direction: 'FORWARD' | 'BACKWARD';
  directionRule: string;
  /** 기산에 쓴 절입 */
  anchorTerm: { name: string; utc: string; relation: 'NEXT_JIE' | 'PREV_JIE' };
  anchorGapDays: number;
  startPrecision: ManseConfig['luck']['startPrecision'];
  startAge: AgeParts;
  startAgeYears: number;
  startUtc: string;
  pillars: LuckPillar[];
  note: string;
}

const DAY = 86_400_000;

function ageParts(yearsFloat: number, yearLen: number): AgeParts {
  const years = Math.floor(yearsFloat);
  const rest = (yearsFloat - years) * yearLen; // 일
  const monthLen = yearLen / 12;
  const months = Math.floor(rest / monthLen);
  return { years, months, days: Math.floor(rest - months * monthLen) };
}

export function computeLuck(birthUtcMs: number, yearStemYang: boolean, gender: 'M' | 'F', monthIndex: number, cfg: ManseConfig['luck'], clockOffsetMin = 540): LuckResult | null {
  const forward = (yearStemYang && gender === 'M') || (!yearStemYang && gender === 'F');
  const { prev, next } = bracket(JIE, birthUtcMs);
  const anchor = forward ? next : prev;
  if (!anchor) return null;
  const gapDays = Math.abs(anchor.ms - birthUtcMs) / DAY;
  let startYears: number; let parts: AgeParts;
  if (cfg.startPrecision === 'EXACT') { startYears = gapDays / 3; parts = ageParts(startYears, cfg.yearLengthDays); }
  else if (cfg.startPrecision === 'DAYS_QUOTIENT') {
    const d = Math.round(gapDays); const q = Math.floor(d / 3), r = d % 3;
    parts = { years: q, months: r * 4, days: 0 }; startYears = q + (r * 4) / 12;
  } else {
    // SHICHEN: 두 시각의 달력 날짜 차이와 시진(2시간) 번호 차이로 센다 (1일=4개월, 1시진=10일)
    const s0 = forward ? birthUtcMs : (prev as { ms: number }).ms, e0 = forward ? (next as { ms: number }).ms : birthUtcMs;
    const fs = fieldsAt(s0, clockOffsetMin), fe = fieldsAt(e0, clockOffsetMin);
    const zi = (hh: number) => Math.floor(((hh + 1) % 24) / 2);
    let hd = zi(fe.hh) - zi(fs.hh), dd = jdn(fe.y, fe.m, fe.d) - jdn(fs.y, fs.m, fs.d);
    if (hd < 0) { hd += 12; dd -= 1; }
    const md = Math.floor((hd * 10) / 30);
    const totalMonths = dd * 4 + md;
    parts = { years: Math.floor(totalMonths / 12), months: totalMonths % 12, days: hd * 10 - md * 30 };
    startYears = parts.years + (parts.months * 30 + parts.days) / 360;
  }
  const startMs = birthUtcMs + startYears * cfg.yearLengthDays * DAY;
  const dir = forward ? 1 : -1;
  const pillars: LuckPillar[] = [];
  for (let k = 1; k <= cfg.count; k++) {
    const ageFrom = startYears + 10 * (k - 1);
    const ms = birthUtcMs + ageFrom * cfg.yearLengthDays * DAY;
    pillars.push({ order: k, pillar: ganjiFromIndex(mod(monthIndex + dir * k, 60)), startAgeYears: round6(ageFrom), startAge: ageParts(ageFrom, cfg.yearLengthDays), startUtc: new Date(ms).toISOString(), startKstYear: fieldsAt(ms, 540).y, endAgeYears: round6(ageFrom + 10) });
  }
  return {
    direction: forward ? 'FORWARD' : 'BACKWARD',
    directionRule: `연간 ${yearStemYang ? '양' : '음'} + ${gender === 'M' ? '남' : '여'} → ${forward ? '순행(다음 절입까지)' : '역행(이전 절입부터)'}`,
    anchorTerm: { name: anchor.name, utc: new Date(anchor.ms).toISOString(), relation: forward ? 'NEXT_JIE' : 'PREV_JIE' },
    anchorGapDays: round6(gapDays), startPrecision: cfg.startPrecision,
    startAge: parts, startAgeYears: round6(startYears), startUtc: new Date(startMs).toISOString(), pillars,
    note: '3일=1년(1일=4개월, 1시진=10일) 환산. 절입 시각은 천문 계산값(공식 미확인)이며 연 길이는 정책값이다.',
  };
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface YearlyLuck { year: number; pillar: Ganji; startsAtUtc: string | null; koreanAge: number; activeLuck: { order: number; pillar: string } | null }
/** 세운: 입춘에서 바뀐다. koreanAge 는 세는나이(출생 연도=1살) */
export function computeYearly(from: number, to: number, birthYear: number, luck: LuckResult | null): YearlyLuck[] {
  const out: YearlyLuck[] = [];
  for (let y = from; y <= to; y++) {
    const ip = ipchun(y);
    let active: YearlyLuck['activeLuck'] = null;
    if (luck && ip) {
      for (const p of luck.pillars) if (Date.parse(p.startUtc) <= ip.ms) active = { order: p.order, pillar: p.pillar.ganji };
    }
    out.push({ year: y, pillar: ganjiFromIndex(mod(y - 4, 60)), startsAtUtc: ip ? new Date(ip.ms).toISOString() : null, koreanAge: y - birthYear + 1, activeLuck: active });
  }
  return out;
}
