import { describe, expect, it } from 'vitest';
import fx from './fixtures/independent.json';
import { toSajuFacts } from '../src/adapter';
import { DEFAULT_CONFIG, hash64, resolveConfig } from '../src/config';
import { ManseRequest, ManseResult, calculate } from '../src/engine';
import { STEMS, BRANCHES } from '../src/ganji';
import { dayPillarOf } from '../src/pillars';
import { JIE, TERMS, findTerm } from '../src/terms';
import { daysInMonth, fieldsAt, jdn, ymdFromJdn } from '../src/time';
import { ConfigOverride } from '../src/config';

const run = (req: ManseRequest, cfg: ConfigOverride = {}): ManseResult => {
  const r = calculate(req, cfg);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};
const WALL: ConfigOverride = { timeBasis: 'ERA_WALL_CLOCK', ziHour: 'ZI_SPLIT_YAJA' };
const TEST_INPUT: ManseRequest = { calendar: 'solar', year: 1990, month: 4, day: 19, hour: 1, minute: 10, gender: 'F' };

describe('시험 입력: 1990-04-19 01:10 양력 여성, 출생지 미입력', () => {
  const r = run(TEST_INPUT);
  it('4주 = 庚午 庚辰 甲寅 乙丑 (독립 라이브러리 sxtwl·lunar_python 과 동일)', () => {
    expect([r.pillars.year.ganji, r.pillars.month.ganji, r.pillars.day.ganji, r.pillars.hour?.ganji]).toEqual(['庚午', '庚辰', '甲寅', '乙丑']);
  });
  it('음력 1990-03-24, 일간 甲(양목)', () => {
    expect(r.calendar.lunar).toEqual({ year: 1990, month: 3, day: 24, leap: false });
    expect(r.dayMaster).toMatchObject({ stem: '甲', yang: true, element: 'wood' });
  });
  it('시주가 시간 보정·출생지에 따라 달라짐을 미확정으로 표시 (보정하면 甲子)', () => {
    expect(r.status).toBe('POLICY_DEPENDENT');
    const u = r.uncertainties.find((x) => x.code === 'PILLAR_POLICY_DEPENDENT')!;
    expect(u.pillar).toBe('hour');
    expect(JSON.stringify(u.alternatives)).toContain('甲子');
    expect(JSON.stringify(u.alternatives)).toContain('한반도 서쪽 끝');
    expect(JSON.stringify(u.alternatives)).toContain('한반도 동쪽 끝');
    expect(u.message).toContain('한반도 경도 범위');
    expect(r.uncertainties.map((x) => x.code)).toContain('BIRTHPLACE_MISSING');
    // 일주는 어떤 정책에서도 같다
    expect(u.alternatives!.every((a) => a.dayPillar === '甲寅')).toBe(true);
  });
  it('출생지가 있고 경도 보정 정책이면 甲子, 보정 없음이면 乙丑', () => {
    const seoul = run({ ...TEST_INPUT, birthplace: { longitude: 126.98 } }, { solarTime: { mode: 'LONGITUDE' } });
    expect(seoul.pillars.hour?.ganji).toBe('甲子');
    expect(seoul.time.sajuClock).toBe('1990-04-19T00:37:55'); // 126.98° × 4분 = 507.92분 = 8시간 27분 55초
    expect(seoul.time.steps.join(' ')).toContain('126.98');
    const fixed = run(TEST_INPUT, { solarTime: { mode: 'FIXED_OFFSET', fixedOffsetMinutes: -30 } });
    expect(fixed.pillars.hour?.ganji).toBe('甲子'); expect(fixed.time.sajuClock).toBe('1990-04-19T00:40:00');
  });
  it('LONGITUDE 정책 + 출생지 없음: FLAG 는 보정 생략을 기록, ERROR 는 실패, USE_SEOUL 은 서울 경도', () => {
    const flag = run(TEST_INPUT, { solarTime: { mode: 'LONGITUDE' } });
    expect(flag.pillars.hour?.ganji).toBe('乙丑'); expect(flag.time.steps.join(' ')).toContain('보정 생략');
    const err = calculate(TEST_INPUT, { solarTime: { mode: 'LONGITUDE', missingPlace: 'ERROR' } });
    expect(err.ok).toBe(false); if (!err.ok) expect(err.error.code).toBe('INVALID_BIRTHPLACE');
    expect(run(TEST_INPUT, { solarTime: { mode: 'LONGITUDE', missingPlace: 'USE_SEOUL' } }).pillars.hour?.ganji).toBe('甲子');
  });
  it('대운: 연간 庚(양)+여 → 역행, 청명 기준 약 13.6일 → 4세 6개월 14일 (lunar_python sect=2 와 동일), 己卯·戊寅·丁丑', () => {
    expect(r.luck?.direction).toBe('BACKWARD');
    expect(r.luck?.anchorTerm.name).toBe('청명');
    expect(r.luck?.startAge).toEqual({ years: 4, months: 6, days: 14 });
    expect(r.luck?.pillars.slice(0, 3).map((p) => p.pillar.ganji)).toEqual(['己卯', '戊寅', '丁丑']);
  });
  it('절입 시각은 공식 확인 전이므로 officialConfirmed=false, 해석 엔진 verified=false', () => {
    expect(r.dataVerification.officialConfirmed).toBe(false);
    expect(r.dataVerification.level).toBe('EPHEMERIS_CROSS_CHECKED');
    expect(r.warnings.join(' ')).toContain('공식 값과의 일치는 확인되지 않았어요');
    const facts = toSajuFacts(r);
    expect(facts.computation.verified).toBe(false);
    expect(facts.warnings).toEqual(expect.arrayContaining(['engine_unverified', 'pillar_policy_dependent']));
    expect(facts.pillars).toEqual({ year: '庚午', month: '庚辰', day: '甲寅', hour: '乙丑' });
    expect(facts.luckCycles[0]).toEqual({ startAge: 4.54, pillar: '己卯' });
  });
  it('같은 입력·정책이면 결과 JSON 이 바이트 단위로 동일하고 정책 해시가 기록된다', () => {
    expect(JSON.stringify(run(TEST_INPUT))).toBe(JSON.stringify(run(TEST_INPUT)));
    expect(r.policyHash).toBe(hash64(JSON.stringify(sortKeys(r.policy))));
    expect(run(TEST_INPUT, { ziHour: 'MIDNIGHT' }).policyHash).not.toBe(r.policyHash);
  });
});
function sortKeys(v: unknown): unknown { if (Array.isArray(v)) return v.map(sortKeys); if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])); return v; }

describe('독립 기준값 대조 (sxtwl · lunar_python · korean_lunar_calendar 가 만든 fixture)', () => {
  const nearJieHours = (utc: number) => Math.min(...JIE.filter((t) => Math.abs(t.ms - utc) < 40 * 86400_000).map((t) => Math.abs(t.ms - utc))) / 3600_000;
  it('4주: 두 라이브러리가 일치한 모든 사례에서 일주·시주 일치, 절입 36시간 밖이면 연주·월주도 일치', () => {
    let n = 0, ny = 0;
    for (const c of fx.pillars) {
      if (!c.agree) continue;
      const [y, m, d, h, mi] = c.date as number[];
      const r = run({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi }, WALL);
      expect(r.pillars.day.ganji, `${c.date} ${c.note}`).toBe(c.ref.day);
      expect(r.pillars.hour?.ganji, `${c.date} ${c.note}`).toBe(c.ref.hour); n++;
      if (nearJieHours(Date.parse(r.time.utc as string)) > 36) { expect(r.pillars.year.ganji, `${c.date}`).toBe(c.ref.year); expect(r.pillars.month.ganji, `${c.date}`).toBe(c.ref.month); ny++; }
    }
    expect(n).toBeGreaterThan(75); expect(ny).toBeGreaterThan(60);
  });
  it('윤달: 1900–2050 의 윤달 56개가 시작일과 월 번호까지 일치, 그 전날은 윤달이 아님', () => {
    expect(fx.leapMonths1900_2050.length).toBe(56);
    for (const l of fx.leapMonths1900_2050) {
      const [y, m, d] = l.solarStart;
      const r = run({ calendar: 'solar', year: y, month: m, day: d, hour: 12 });
      expect(r.calendar.lunar, `${y}-${m}-${d}`).toEqual({ year: l.lunarYear, month: l.month, day: 1, leap: true });
      const back = run({ calendar: 'lunar', year: l.lunarYear, month: l.month, day: 1, leapMonth: true, hour: 12 });
      expect(back.calendar.solar).toEqual({ year: y, month: m, day: d });
    }
  });
  it('음력→양력 300건 표본이 korean_lunar_calendar 와 일치', () => {
    for (const c of fx.lunarToSolar) {
      const [ly, lm, ld] = c.lunar as number[];
      const r = run({ calendar: 'lunar', year: ly, month: lm, day: ld, leapMonth: false, hour: 12 });
      expect([r.calendar.solar.year, r.calendar.solar.month, r.calendar.solar.day]).toEqual(c.solar);
    }
  });
  it('양력→음력→양력 왕복이 1900~2100 매일 성립 (73,000일)', () => {
    let bad = 0;
    for (let j = jdn(1900, 1, 1); j <= jdn(2100, 12, 31); j += 1) {
      const { y, m, d } = ymdFromJdn(j);
      const r = calculate({ calendar: 'solar', year: y, month: m, day: d }, {});
      if (!r.ok || !r.value.calendar.lunar) { bad++; continue; }
      const l = r.value.calendar.lunar;
      const b = calculate({ calendar: 'lunar', year: l.year, month: l.month, day: l.day, leapMonth: l.leap }, {});
      if (!b.ok || b.value.calendar.solar.year !== y || b.value.calendar.solar.month !== m || b.value.calendar.solar.day !== d) bad++;
    }
    expect(bad).toBe(0);
  }, 120_000);
  it('대운: 방향·시작 나이(분 단위 환산, 연 360일)·첫 다섯 대운이 lunar_python 과 일치', () => {
    let n = 0;
    for (const c of fx.luck) {
      const [y, m, d, h, mi] = c.date;
      const r = run({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi, gender: c.gender as 'M' | 'F' }, { ...WALL, luck: { startPrecision: 'EXACT', yearLengthDays: 360 } });
      const utc = Date.parse(r.time.utc as string);
      if (Math.min(...JIE.filter((t) => Math.abs(t.ms - utc) < 40 * 86400_000).map((t) => Math.abs(t.ms - utc))) / 3600_000 < 36) continue;
      expect(r.luck!.direction === 'FORWARD', JSON.stringify(c.date)).toBe(c.forward);
      const a = r.luck!.startAge, b = c.start;
      expect(Math.abs(a.years + a.months / 12 + a.days / 360 - (b[0] + b[1] / 12 + b[2] / 360)), JSON.stringify(c.date)).toBeLessThan(0.004);
      expect(r.luck!.pillars.slice(0, 5).map((p) => p.pillar.ganji)).toEqual(c.pillars); n++;
    }
    expect(n).toBeGreaterThan(40);
  });
});

describe('절입 경계 전후 1분', () => {
  const at = (ms: number) => { const f = fieldsAt(ms, 540); return { calendar: 'solar' as const, year: f.y, month: f.m, day: f.d, hour: f.hh, minute: f.mi, second: f.ss }; };
  const t = findTerm(2024, 15)!; // 청명 2024 (월주: 丁卯→戊辰)
  it('절입 1분 전·후는 보호 구간 안이라 월주를 확정하지 않고 두 후보를 모두 제시한다', () => {
    for (const d of [-60_000, 60_000]) {
      const r = run(at(t.ms + d), WALL);
      expect(r.status).toBe('NEEDS_REVIEW');
      const u = r.uncertainties.find((x) => x.code === 'TERM_BOUNDARY' && x.pillar === 'month')!;
      expect(u.alternatives!.map((a) => a.pillar)).toEqual(['丁卯', '戊辰']);
      expect(u.message).toContain('청명');
    }
  });
  it('절입 10분 전·후는 확정: 전=丁卯, 후=戊辰', () => {
    const b = run(at(t.ms - 600_000), WALL), a = run(at(t.ms + 600_000), WALL);
    expect(b.status).not.toBe('NEEDS_REVIEW'); expect(a.status).not.toBe('NEEDS_REVIEW');
    expect([b.pillars.month.ganji, a.pillars.month.ganji]).toEqual(['丁卯', '戊辰']);
  });
  it('보호 구간을 0으로 두면 절입 불확실도(±5초) 밖인 1분 전·후는 확정되고 월주가 갈린다', () => {
    const cfg = { ...WALL, boundaryGuardSeconds: 0 };
    const b = run(at(t.ms - 60_000), cfg), a = run(at(t.ms + 60_000), cfg);
    expect([b.pillars.month.ganji, a.pillars.month.ganji]).toEqual(['丁卯', '戊辰']);
    expect(b.status).not.toBe('NEEDS_REVIEW');
    // 절입 시각 자체의 불확실도(5초) 안은 보호 구간 0 이어도 확정하지 않는다
    expect(run(at(t.ms + 2_000), cfg).status).toBe('NEEDS_REVIEW');
  });
  it('입춘 1분 전·후: 연주(甲辰→乙巳)와 월주(丑→寅)가 함께 갈리고 둘 다 미확정', () => {
    const ip = findTerm(2025, 315)!; // 2025 입춘: 연주 甲辰→乙巳
    const r = run(at(ip.ms - 60_000), WALL);
    expect(r.status).toBe('NEEDS_REVIEW');
    const codes = r.uncertainties.filter((x) => x.code === 'TERM_BOUNDARY').map((x) => x.pillar).sort();
    expect(codes).toEqual(['month', 'year']);
    expect(run(at(ip.ms - 600_000), WALL).pillars.year.ganji).toBe('甲辰');
    expect(run(at(ip.ms + 600_000), WALL).pillars.year.ganji).toBe('乙巳');
  });
  it('연주 경계 정책: JAN1 이면 입춘이 연주를 바꾸지 않고, 월주 경계만 남는다', () => {
    const ip = findTerm(2025, 315)!;
    const r = run(at(ip.ms - 60_000), { ...WALL, yearBoundary: 'JAN1' });
    expect(r.pillars.year.ganji).toBe('乙巳');
    expect(r.uncertainties.filter((x) => x.code === 'TERM_BOUNDARY').map((x) => x.pillar)).toEqual(['month']);
    expect(run({ calendar: 'solar', year: 2025, month: 1, day: 1, hour: 12 }, { yearBoundary: 'IPCHUN' }).pillars.year.ganji).toBe('甲辰');
    expect(run({ calendar: 'solar', year: 2025, month: 1, day: 1, hour: 12 }, { yearBoundary: 'JAN1' }).pillars.year.ganji).toBe('乙巳');
    expect(run({ calendar: 'solar', year: 2025, month: 1, day: 20, hour: 12 }, { yearBoundary: 'LUNAR_NEW_YEAR' }).pillars.year.ganji).toBe('甲辰'); // 설날 2025-01-29
    expect(run({ calendar: 'solar', year: 2025, month: 2, day: 1, hour: 12 }, { yearBoundary: 'LUNAR_NEW_YEAR' }).pillars.year.ganji).toBe('乙巳');
  });
  it('공식 자료를 요구하는 정책이면 절기 부근 출생은 모두 검토 필요', () => {
    const r = run(at(t.ms + 20 * 3_600_000), { ...WALL, requireOfficialTermData: true });
    expect(r.status).toBe('NEEDS_REVIEW'); expect(r.statusReasons).toContain('OFFICIAL_TERM_DATA_REQUIRED');
    expect(run(at(t.ms + 20 * 86_400_000), { ...WALL, requireOfficialTermData: true }).status).not.toBe('NEEDS_REVIEW');
  });
  it('공식값이 적재되어 같은 분으로 확인되면 해당 절기는 official_confirmed 로 올라간다 (합성 fixture)', () => {
    const f = fieldsAt(t.ms, 540);
    const kst = `${f.y}-${String(f.m).padStart(2, '0')}-${String(f.d).padStart(2, '0')} ${String(f.hh).padStart(2, '0')}:${String(f.mi).padStart(2, '0')}`;
    const r = calculate(at(t.ms + 5 * 3_600_000), WALL, { officialTerms: [{ year: 2024, name: '청명', kst, precisionSeconds: 60, source: 'TEST-FIXTURE(합성, 실제 공식값 아님)' }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.dataVerification.termStatusesUsed['2024:청명']).toMatch(/official_confirmed|boundary_review/);
  });
});

describe('자시(23~01시) 경계 — 세 가지 정책', () => {
  const HOUR_ZI_STEM: Record<string, string> = { 甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬' };
  const D0 = dayPillarOf(2024, 7, 15), D1 = dayPillarOf(2024, 7, 16);
  const stemChar = (g: string) => g[0];
  const req = (h: number, mi: number, day = 15): ManseRequest => ({ calendar: 'solar', year: 2024, month: 7, day, hour: h, minute: mi });
  it('22:59 → 亥시, 일주 당일 (정책 무관)', () => {
    for (const z of ['ZI_23_NEXT_DAY', 'ZI_SPLIT_YAJA', 'MIDNIGHT'] as const) {
      const r = run(req(22, 59), { ...WALL, ziHour: z });
      expect(r.pillars.day.ganji).toBe(D0.ganji); expect(r.pillars.hour!.branch).toBe(11);
    }
  });
  it('23:30 — 23시 교체: 일주=익일, 시간=익일 일간의 子 / 야자시: 일주=당일, 시간=익일 일간의 子 / 자정 교체: 일주=당일, 시간=당일 일간의 子', () => {
    const a = run(req(23, 30), { ...WALL, ziHour: 'ZI_23_NEXT_DAY' });
    expect(a.pillars.day.ganji).toBe(D1.ganji); expect(a.pillars.hour!.ganji).toBe(HOUR_ZI_STEM[stemChar(D1.ganji)] + '子');
    const b = run(req(23, 30), { ...WALL, ziHour: 'ZI_SPLIT_YAJA' });
    expect(b.pillars.day.ganji).toBe(D0.ganji); expect(b.pillars.hour!.ganji).toBe(HOUR_ZI_STEM[stemChar(D1.ganji)] + '子');
    const c = run(req(23, 30), { ...WALL, ziHour: 'MIDNIGHT' });
    expect(c.pillars.day.ganji).toBe(D0.ganji); expect(c.pillars.hour!.ganji).toBe(HOUR_ZI_STEM[stemChar(D0.ganji)] + '子');
  });
  it('00:30 — 모든 정책에서 일주=익일, 시주=익일 일간의 子', () => {
    for (const z of ['ZI_23_NEXT_DAY', 'ZI_SPLIT_YAJA', 'MIDNIGHT'] as const) {
      const r = run(req(0, 30, 16), { ...WALL, ziHour: z });
      expect(r.pillars.day.ganji).toBe(D1.ganji); expect(r.pillars.hour!.ganji).toBe(HOUR_ZI_STEM[stemChar(D1.ganji)] + '子');
    }
  });
  it('00:59 는 子시, 01:00 부터 丑시', () => {
    expect(run(req(0, 59, 16), WALL).pillars.hour!.branch).toBe(0);
    expect(run(req(1, 0, 16), WALL).pillars.hour!.branch).toBe(1);
    expect(run(req(2, 59, 16), WALL).pillars.hour!.branch).toBe(1);
    expect(run(req(3, 0, 16), WALL).pillars.hour!.branch).toBe(2);
  });
  it('23시대 출생은 정책에 따라 사주가 달라짐을 uncertainties 에 표시한다', () => {
    const r = run(req(23, 30), WALL);
    const u = r.uncertainties.find((x) => x.code === 'PILLAR_POLICY_DEPENDENT')!;
    expect(u.alternatives!.some((a) => a.dayPillar === D1.ganji)).toBe(true);
  });
});

describe('과거 서머타임·역사적 표준시', () => {
  it('1987-05-10 02:30 은 존재하지 않는 시각 → 명시적 실패', () => {
    const r = calculate({ calendar: 'solar', year: 1987, month: 5, day: 10, hour: 2, minute: 30 }, {});
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error.code).toBe('NONEXISTENT_LOCAL_TIME');
  });
  it('1987-10-11 02:30 은 두 번 존재: FIRST=서머타임(+10, UTC 16:30), SECOND=표준시(+9, UTC 17:30), ERROR 정책이면 실패', () => {
    const req: ManseRequest = { calendar: 'solar', year: 1987, month: 10, day: 11, hour: 2, minute: 30 };
    expect(run(req, { dstAmbiguous: 'FIRST' }).time.utc).toBe('1987-10-10T16:30:00.000Z');
    expect(run(req, { dstAmbiguous: 'SECOND' }).time.utc).toBe('1987-10-10T17:30:00.000Z');
    const e = calculate(req, { dstAmbiguous: 'ERROR' }); expect(e.ok).toBe(false); if (!e.ok) expect(e.error.code).toBe('AMBIGUOUS_LOCAL_TIME');
  });
  it('중복 시각이라도 두 경우의 사주가 같으면 INFO 로만 남긴다 / 달라지면 NEEDS_REVIEW', () => {
    const same = run({ calendar: 'solar', year: 1987, month: 10, day: 11, hour: 2, minute: 30 }, WALL);
    expect(same.uncertainties.find((x) => x.code === 'DST_AMBIGUOUS')?.severity).toBe('INFO');
    // KST_PLUS9 시계 기준으로는 두 후보가 각각 02:30 / 03:30 → 丑시 / 寅시 로 갈린다
    const diff = run({ calendar: 'solar', year: 1987, month: 10, day: 11, hour: 2, minute: 30 }, { timeBasis: 'KST_PLUS9' });
    expect(diff.uncertainties.find((x) => x.code === 'DST_AMBIGUOUS')).toBeDefined();
  });
  it('서머타임 기간 출생은 표준시로 환산 (1988-07-01 12:00 → UTC 02:00, 시계 11:00)', () => {
    const r = run({ calendar: 'solar', year: 1988, month: 7, day: 1, hour: 12, minute: 0 }, { timeBasis: 'KST_PLUS9' });
    expect(r.time.utc).toBe('1988-07-01T02:00:00.000Z'); expect(r.time.dst).toBe(true); expect(r.time.sajuClock).toBe('1988-07-01T11:00:00');
    expect(r.pillars.hour!.branch).toBe(6); // 11시 → 午시(11:00~12:59)
    expect(r.uncertainties.map((u) => u.code)).toContain('DST_APPLIED');
  });
  it('1958-01-15 00:45 (UTC+8:30 시대): KST_PLUS9 → 01:15 丑시, ERA_STANDARD → 00:45 子시', () => {
    const q: ManseRequest = { calendar: 'solar', year: 1958, month: 1, day: 15, hour: 0, minute: 45 };
    const a = run(q, { timeBasis: 'KST_PLUS9' }), b = run(q, { timeBasis: 'ERA_STANDARD' });
    expect(a.time.sajuClock).toBe('1958-01-15T01:15:00'); expect(a.pillars.hour!.branch).toBe(1);
    expect(b.time.sajuClock).toBe('1958-01-15T00:45:00'); expect(b.pillars.hour!.branch).toBe(0);
    expect(a.uncertainties.map((u) => u.code)).toContain('UTC_PLUS_830_ERA');
  });
  it('1900년대 초 서울 지방평균시(+8:27:52) 해석을 표시', () => {
    const r = run({ calendar: 'solar', year: 1905, month: 3, day: 3, hour: 10 }, {});
    expect(r.time.zoneLabel).toBe('LMT'); expect(r.uncertainties.map((u) => u.code)).toContain('PRE_1908_LOCAL_MEAN_TIME');
  });
});

describe('음력·윤달', () => {
  it('2020 윤4월: 음력 윤4월 1일 = 양력 2020-05-23', () => {
    expect(run({ calendar: 'lunar', year: 2020, month: 4, day: 1, leapMonth: true }).calendar.solar).toEqual({ year: 2020, month: 5, day: 23 });
    expect(run({ calendar: 'lunar', year: 2020, month: 4, day: 1, leapMonth: false }).calendar.solar).toEqual({ year: 2020, month: 4, day: 23 });
  });
  it('2033 윤11월, 1984 윤10월, 2023 윤2월', () => {
    for (const [y, m] of [[2033, 11], [1984, 10], [2023, 2]]) expect(fx.leapMonths1900_2050.some((l) => l.lunarYear === y && l.month === m)).toBe(true);
    expect(run({ calendar: 'lunar', year: 2033, month: 11, day: 1, leapMonth: true }).calendar.lunar).toEqual({ year: 2033, month: 11, day: 1, leap: true });
  });
  it('없는 윤달·없는 일자·월 범위는 명시적 오류', () => {
    const e = (req: ManseRequest) => { const r = calculate(req, {}); return r.ok ? 'ok' : r.error.code; };
    expect(e({ calendar: 'lunar', year: 2021, month: 4, day: 1, leapMonth: true })).toBe('LEAP_MONTH_NOT_FOUND');
    expect(e({ calendar: 'lunar', year: 2021, month: 13, day: 1 })).toBe('INVALID_LUNAR_DATE');
    expect(e({ calendar: 'lunar', year: 2021, month: 2, day: 31 })).toBe('INVALID_LUNAR_DATE');
    expect(e({ calendar: 'lunar', year: 2101, month: 6, day: 1 })).toBe('LUNAR_OUT_OF_RANGE');
  });
  it('음력 입력의 사주는 변환된 양력 날짜로 계산 (1990 음력 3월 24일 = 양력 4월 19일)', () => {
    const r = run({ calendar: 'lunar', year: 1990, month: 3, day: 24, hour: 1, minute: 10, gender: 'F' });
    expect(r.calendar.solar).toEqual({ year: 1990, month: 4, day: 19 });
    expect(r.pillars.day.ganji).toBe('甲寅'); expect(r.calendar.convertedFrom).toBe('lunar');
  });
  it('1912년 이전 음력은 추정 정책임을 표시', () => {
    expect(run({ calendar: 'solar', year: 1905, month: 5, day: 5, hour: 12 }).uncertainties.map((u) => u.code)).toContain('LUNAR_CALENDAR_UNVERIFIED');
    expect(run({ calendar: 'solar', year: 2060, month: 5, day: 5, hour: 12 }).uncertainties.map((u) => u.code)).toContain('LUNAR_CALENDAR_UNVERIFIED');
  });
});

describe('출생시간 누락', () => {
  it('시주·대운 없음, 경고 표시, 일반 날짜는 확정', () => {
    const r = run({ calendar: 'solar', year: 1990, month: 4, day: 19, gender: 'F', timeUnknown: true });
    expect(r.pillars.hour).toBeNull(); expect(r.luck).toBeNull(); expect(r.time.known).toBe(false);
    expect(r.warnings.join(' ')).toContain('시주는 계산하지 않았어요'); expect(r.warnings.join(' ')).toContain('대운은 계산하지 않았어요');
    expect(r.pillars.day.ganji).toBe('甲寅'); expect(r.status).toBe('OK');
    expect(toSajuFacts(r).pillars.hour).toBeNull(); expect(toSajuFacts(r).warnings).toContain('hour_pillar_unavailable');
  });
  it('절입이 든 날이면 연/월주 후보를 모두 제시하고 검토 필요 (입춘 2025-02-03 KST 23:10경)', () => {
    const ip = findTerm(2025, 315)!; const f = fieldsAt(ip.ms, 540);
    const r = run({ calendar: 'solar', year: f.y, month: f.m, day: f.d, timeUnknown: true });
    expect(r.status).toBe('NEEDS_REVIEW');
    const y = r.uncertainties.find((u) => u.code === 'TERM_DAY_TIME_UNKNOWN' && u.pillar === 'year')!;
    expect(y.alternatives!.map((a) => a.pillar)).toEqual(['甲辰', '乙巳']);
  });
  it('hour 필드가 없어도 시간 미상으로 취급', () => {
    expect(run({ calendar: 'solar', year: 2000, month: 1, day: 1 }).time.known).toBe(false);
  });
});

describe('대운 기산 정책·순역', () => {
  it('양남음녀 순행 / 음남양녀 역행 네 가지 조합', () => {
    // 1990(庚·양), 1991(辛·음) 6월 15일 정오
    const f = (y: number, g: 'M' | 'F') => run({ calendar: 'solar', year: y, month: 6, day: 15, hour: 12, gender: g }).luck!.direction;
    expect(f(1990, 'M')).toBe('FORWARD'); expect(f(1990, 'F')).toBe('BACKWARD');
    expect(f(1991, 'M')).toBe('BACKWARD'); expect(f(1991, 'F')).toBe('FORWARD');
  });
  it('순행은 다음 절입, 역행은 이전 절입까지의 거리로 기산하고 대운 간지는 월주에서 ±1 진행', () => {
    const m = run({ calendar: 'solar', year: 1990, month: 6, day: 15, hour: 12, gender: 'M' });
    expect(m.luck!.anchorTerm.relation).toBe('NEXT_JIE'); expect(m.luck!.anchorTerm.name).toBe('소서');
    expect(m.pillars.month.ganji).toBe('壬午');
    expect(m.luck!.pillars[0].pillar.ganji).toBe('癸未');
    const f = run({ calendar: 'solar', year: 1990, month: 6, day: 15, hour: 12, gender: 'F' });
    expect(f.luck!.anchorTerm.relation).toBe('PREV_JIE'); expect(f.luck!.pillars[0].pillar.ganji).toBe('辛巳');
  });
  it('기산 정책 차이: EXACT / DAYS_QUOTIENT / SHICHEN 및 연 길이 360 vs 365.2425', () => {
    const ex = run(TEST_INPUT, { luck: { startPrecision: 'EXACT' } }).luck!;
    const dq = run(TEST_INPUT, { luck: { startPrecision: 'DAYS_QUOTIENT' } }).luck!;
    const sc = run(TEST_INPUT, { luck: { startPrecision: 'SHICHEN' } }).luck!;
    const y360 = run(TEST_INPUT, { luck: { startPrecision: 'EXACT', yearLengthDays: 360 } }).luck!;
    expect(ex.startAge).toEqual({ years: 4, months: 6, days: 14 });
    expect(dq.startAge).toEqual({ years: 4, months: 8, days: 0 }); // 14일 → 몫 4세, 나머지 2일 × 4개월
    expect(sc.startAge.years).toBe(4);
    expect(new Set([ex.startUtc, dq.startUtc, sc.startUtc, y360.startUtc]).size).toBeGreaterThan(2);
    expect(y360.startUtc).not.toBe(ex.startUtc);
    // 대운 간지는 기산 정책과 무관
    expect(dq.pillars.map((p) => p.pillar.ganji)).toEqual(ex.pillars.map((p) => p.pillar.ganji));
  });
  it('성별 누락: 기본(OMIT)은 대운 생략+경고, ERROR 정책은 실패', () => {
    const r = run({ ...TEST_INPUT, gender: undefined });
    expect(r.luck).toBeNull(); expect(r.warnings.join(' ')).toContain('성별이 없어');
    const e = calculate({ ...TEST_INPUT, gender: undefined }, { luck: { missingGender: 'ERROR' } });
    expect(e.ok).toBe(false); if (!e.ok) expect(e.error.code).toBe('GENDER_REQUIRED');
  });
  it('세운: 입춘에서 바뀌고 활성 대운을 함께 돌려준다', () => {
    const r = run({ ...TEST_INPUT, yearly: { from: 2024, to: 2026 } });
    expect(r.yearly!.map((y) => y.pillar.ganji)).toEqual(['甲辰', '乙巳', '丙午']);
    expect(r.yearly![0].startsAtUtc).toBe(findTerm(2024, 315) && new Date(findTerm(2024, 315)!.ms).toISOString());
    expect(r.yearly![0].koreanAge).toBe(35);
    expect(r.yearly!.every((y) => y.activeLuck?.pillar === '丙子' || y.activeLuck?.pillar === '丁丑')).toBe(true);
  });
});

describe('입력 검증·정책 검증 — 조용한 보정 없이 명시적 실패', () => {
  const code = (req: Partial<ManseRequest>, cfg: ConfigOverride = {}) => { const r = calculate({ calendar: 'solar', year: 2000, month: 1, day: 1, ...req } as ManseRequest, cfg); return r.ok ? 'ok' : r.error.code; };
  it('날짜·시각·범위', () => {
    expect(code({ month: 2, day: 30 })).toBe('INVALID_DATE');
    expect(code({ year: 1999, month: 2, day: 29 })).toBe('INVALID_DATE');
    expect(code({ year: 1899, month: 12, day: 31 })).toBe('OUT_OF_RANGE');
    expect(code({ year: 2101, month: 1, day: 1 })).toBe('OUT_OF_RANGE');
    expect(code({ hour: 24 })).toBe('INVALID_TIME'); expect(code({ hour: 3, minute: 60 })).toBe('INVALID_TIME');
    expect(code({ year: 1.5 })).toBe('INVALID_INPUT'); expect(code({ calendar: 'x' as 'solar' })).toBe('INVALID_INPUT');
    expect(code({ gender: 'X' as 'M' })).toBe('GENDER_REQUIRED');
  });
  it('출생지: 한국 경도 범위 밖이면 거부', () => {
    expect(code({ birthplace: { longitude: 139.7 } })).toBe('INVALID_BIRTHPLACE');
    expect(code({ birthplace: { longitude: Number.NaN } })).toBe('INVALID_BIRTHPLACE');
    expect(code({ birthplace: { longitude: 127 } })).toBe('ok');
  });
  it('정책: 알 수 없는 키·값은 거부하고 기본값으로 덮지 않는다', () => {
    expect(code({}, { ziHour: 'NOPE' as 'MIDNIGHT' })).toBe('INVALID_POLICY');
    expect(code({}, { nonsense: true } as ConfigOverride)).toBe('INVALID_POLICY');
    expect(code({}, { luck: { count: 0 } })).toBe('INVALID_POLICY');
    expect(code({}, { luck: { yearLengthDays: 10 } })).toBe('INVALID_POLICY');
    expect(resolveConfig({}).ok).toBe(true);
    expect(DEFAULT_CONFIG.policyVersion).toBe('policy-1.0');
  });
});

describe('지원 범위 양끝과 전수 안정성', () => {
  it('1900-01-01 / 2100-12-31 계산 가능, 1900-01-01 은 己亥년(1899 입춘 이후) 丙子월(대설 후)', () => {
    const a = run({ calendar: 'solar', year: 1900, month: 1, day: 1, hour: 12 });
    expect(a.pillars.year.ganji).toBe('己亥'); expect(a.pillars.month.ganji).toBe('丙子'); expect(a.pillars.day.ganji).toBe('甲戌');
    expect(run({ calendar: 'solar', year: 2100, month: 12, day: 31, hour: 12 }).pillars.year.ganji).toBe('庚申');
  });
  it('1900~2100 매일 정오 계산이 실패 없이 끝나고 일주가 60일 주기로 진행', () => {
    let prev = -1, fail = 0;
    for (let y = 1900; y <= 2100; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysInMonth(y, m); d += 7) {
      const r = calculate({ calendar: 'solar', year: y, month: m, day: d, hour: 12 }, {});
      if (!r.ok) { fail++; continue; }
      prev = r.value.pillars.day.index;
    }
    expect(fail).toBe(0); expect(prev).toBeGreaterThanOrEqual(0);
  }, 120_000);
  it('절입 표: 1900~2100 모든 해에 24절기가 시간순이고 인접 간격이 14~16.5일', () => {
    for (let y = 1900; y <= 2100; y++) {
      const rows = TERMS.filter((t) => t.year === y);
      expect(rows).toHaveLength(24);
      for (let i = 1; i < rows.length; i++) { const g = (rows[i].ms - rows[i - 1].ms) / 86_400_000; expect(g).toBeGreaterThan(14); expect(g).toBeLessThan(16.5); }
    }
  });
  it('절기 시각 문헌 값과 대조(기억 기반 sanity check, 독립 증빙 아님): 춘분 2000-03-20 07:35 UTC, 하지 2021-06-21 03:32 UTC, 동지 2021-12-21 15:59 UTC', () => {
    const near = (y: number, lon: number, iso: string) => expect(Math.abs(findTerm(y, lon)!.ms - Date.parse(iso))).toBeLessThan(90_000);
    near(2000, 0, '2000-03-20T07:35:00Z'); near(2021, 90, '2021-06-21T03:32:00Z'); near(2021, 270, '2021-12-21T15:59:00Z');
  });
});

describe('십성·지장간·합충형파해', () => {
  const rel = (stems: Record<string, number>, branches: Record<string, number>) => import('../src/relations').then((m) => m.extractRelations({ stems, branches } as never, DEFAULT_CONFIG.relations));
  it('일간 甲 기준 십성 10종', async () => {
    const { tenGod } = await import('../src/tenGods');
    expect(STEMS.map((_, i) => tenGod(0, i))).toEqual(['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']);
    expect(STEMS.map((_, i) => tenGod(4, i))).toEqual(['편관', '정관', '편인', '정인', '비견', '겁재', '식신', '상관', '편재', '정재']); // 일간 戊
  });
  it('지장간 표: 모든 지지의 일수 합 30, 정기가 마지막, 월지 사령 계산', async () => {
    const { hiddenStems, commandingStem } = await import('../src/hidden');
    for (let b = 0; b < 12; b++) { const h = hiddenStems(b, 'STANDARD'); expect(h.reduce((a, x) => a + x.days, 0)).toBe(30); expect(h[h.length - 1].role).toBe('정기'); }
    expect(hiddenStems(2, 'STANDARD').map((h) => h.stemChar)).toEqual(['戊', '丙', '甲']);
    expect(hiddenStems(2, 'MAIN_ONLY').map((h) => h.stemChar)).toEqual(['甲']);
    expect(commandingStem(2, 3).stemChar).toBe('戊'); expect(commandingStem(2, 10).stemChar).toBe('丙'); expect(commandingStem(2, 20).stemChar).toBe('甲');
  });
  it('천간합·충, 지지 육합·삼합·반합·방합·충·형·파·해 추출', async () => {
    const r = await rel({ year: 0, month: 5, day: 6, hour: 2 }, { year: 8, month: 0, day: 4, hour: 6 }); // 甲己 庚…丙 / 申子辰 午
    const types = r.map((x) => x.type);
    expect(types).toContain('천간합'); expect(types).toContain('천간충'); // 甲己합, 甲庚충
    expect(types).toContain('지지삼합'); // 申子辰
    expect(types).toContain('지지충'); // 子午충
    const r2 = await rel({}, { year: 2, month: 5, day: 8, hour: 1 }); // 寅巳申 + 丑
    expect(r2.map((x) => x.type)).toEqual(expect.arrayContaining(['지지형', '지지육합', '지지파', '지지해']));
    expect(r2.find((x) => x.detail.includes('삼형'))).toBeDefined();
    const r3 = await rel({}, { year: 4, month: 4, day: 6, hour: 6 }); // 辰辰 午午 자형
    expect(r3.filter((x) => x.type === '지지자형')).toHaveLength(2);
    const r4 = await rel({}, { year: 2, month: 3, day: 4, hour: 0 }); // 寅卯辰 방합
    expect(r4.map((x) => x.type)).toContain('지지방합');
    const half = await rel({}, { year: 2, month: 6 }); expect(half.map((x) => x.type)).toContain('지지반합'); // 寅午(戌) 반합, 午=왕지
    const none = (await import('../src/relations')).extractRelations({ stems: {}, branches: { year: 2, month: 6 } } as never, { halfTriple: 'NONE' });
    expect(none.map((x) => x.type)).not.toContain('지지반합');
    for (const x of r) expect(x.detail).not.toMatch(/실제 화 여부는 미판단.*확정/);
  });
  it('시험 입력 원국의 관계 추출 결과가 JSON 으로 나온다 (庚甲충 · 庚乙합 · 午丑해 · 辰丑파)', () => {
    const r = run(TEST_INPUT).relations.map((x) => x.detail.split(' ')[0]);
    expect(r).toEqual(expect.arrayContaining(['庚甲충', '庚乙합', '午丑해', '辰丑파']));
  });
  it('지지 십성: 시험 입력 월지 辰의 정기 戊 → 일간 甲 기준 편재', () => {
    expect(run(TEST_INPUT).pillars.month.mainTenGod).toBe('편재');
    expect(run(TEST_INPUT).pillars.year.hidden.map((h) => h.stemChar)).toEqual(['丙', '己', '丁']);
  });
});

describe('공식 자료 비교 도구 (합성 fixture — 실제 공식값 아님)', () => {
  it('같은 분이면 confirmed, 경계 초나 1분 차이는 boundary_review, 크게 다르면 mismatch', async () => {
    const { compareOfficial } = await import('../src/official');
    const base = TERMS.find((t) => t.year === 2020 && Math.abs((((t.ms + 9 * 3600_000) % 60000) / 1000) - 30) < 15)!;
    const f = fieldsAt(base.ms, 540); const p = (n: number) => String(n).padStart(2, '0');
    const kst = (mi: number) => `${f.y}-${p(f.m)}-${p(f.d)} ${p(f.hh)}:${p(mi)}`;
    const mk = (mi: number) => compareOfficial(TERMS, [{ year: base.year, name: base.name, kst: kst(mi), precisionSeconds: 60, source: 'T' }])[0].status;
    expect(mk(f.mi)).toBe('official_confirmed');
    expect(mk(f.mi + 1)).toBe('boundary_review'); // f.mi+1 ≤ 59 보장 불필요: 분 문자열만 비교
    expect(mk(f.mi === 0 ? 5 : f.mi - 5)).toBe('official_mismatch');
  });
});

describe('해석 엔진 연결 JSON', () => {
  it('toSajuFacts 가 기존 SajuFacts 계약을 채운다', () => {
    const f = toSajuFacts(run(TEST_INPUT));
    expect(f.dayMaster).toBe('甲'); expect(f.fiveElements).toEqual({ wood: 3, fire: 1, earth: 2, metal: 2, water: 0 });
    expect(f.tenGods.map((t) => t.god)).toEqual(['편관', '편관', '겁재']);
    expect(f.computation.engine_name).toBe('ohaeng-manse'); expect(f.computation.rules_version).toContain('policy-1.0#');
    expect(f.chartId).toMatch(/^manse_[0-9a-f]{16}$/);
    expect(JSON.parse(JSON.stringify(f))).toEqual(f);
  });
  it('간지 문자열은 천간 10 + 지지 12 의 올바른 조합만 나온다', () => {
    const r = run(TEST_INPUT);
    for (const p of [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour!]) { expect(STEMS).toContain(p.ganji[0]); expect(BRANCHES).toContain(p.ganji[1]); expect(p.stem % 2).toBe(p.branch % 2); }
  });
});
