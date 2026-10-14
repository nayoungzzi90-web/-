import { fnv, hex } from '../hash';
import { BRANCHES, BirthInput, CalcError, ChartCalculator, Element, Pillar, SajuFacts, STEMS, Stem, Branch } from './types';
import { BRANCH_ELEMENT, STEM_ELEMENT, tenGod } from './rules';

/**
 * ⚠️ 샘플 드라이버 (verified=false)
 * - 일주: 1900-01-01=甲戌 기준 60갑자 순환 (양력 한정). 날짜 경계는 00:00.
 * - 연주/월주: 절기를 매년 같은 양력일로 근사. 실제 절입 시각과 ±1일 차이가 날 수 있어
 *   근사 절기일 ±1일은 `term_boundary_unverified` 경고를 붙인다.
 * - 음력/윤달, 대운: 지원하지 않음 (검증된 상업 라이선스 라이브러리 연동 필요).
 * 실제 사주 결과로 공개하지 말 것. docs/LIBRARY_EVALUATION.md 참고.
 */
const TERMS: { m: number; d: number; branch: number }[] = [
  { m: 1, d: 6, branch: 1 }, // 소한 丑
  { m: 2, d: 4, branch: 2 }, // 입춘 寅
  { m: 3, d: 6, branch: 3 }, // 경칩 卯
  { m: 4, d: 5, branch: 4 }, // 청명 辰
  { m: 5, d: 6, branch: 5 }, // 입하 巳
  { m: 6, d: 6, branch: 6 }, // 망종 午
  { m: 7, d: 7, branch: 7 }, // 소서 未
  { m: 8, d: 8, branch: 8 }, // 입추 申
  { m: 9, d: 8, branch: 9 }, // 백로 酉
  { m: 10, d: 8, branch: 10 }, // 한로 戌
  { m: 11, d: 7, branch: 11 }, // 입동 亥
  { m: 12, d: 7, branch: 0 }, // 대설 子
];

export const SAMPLE_RANGE = { min: 1920, max: 2030 };

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const mod = (n: number, m: number) => ((n % m) + m) % m;
const pillar = (stem: number, branch: number): Pillar => STEMS[mod(stem, 10)] + BRANCHES[mod(branch, 12)];

function yearPillarOf(sajuYear: number): Pillar {
  return pillar(sajuYear - 4, sajuYear - 4);
}

/** 해당 양력일이 속한 입춘 기준 역년 */
function sajuYearOf(y: number, m: number, d: number): number {
  return m < 2 || (m === 2 && d < 4) ? y - 1 : y;
}

function dayIndex(y: number, m: number, d: number): number {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  return mod(10 + days, 60); // 1900-01-01 = 甲戌(10)
}

function monthBranchOf(m: number, d: number): number {
  // 가장 최근 지난 절기의 지지
  const passed = TERMS.filter((t) => t.m < m || (t.m === m && t.d <= d));
  return passed.length ? passed[passed.length - 1].branch : 0; // 1/1~1/5 → 대설(子)
}

function nearTerm(m: number, d: number): boolean {
  return TERMS.some((t) => t.m === m && Math.abs(t.d - d) <= 1);
}

function validate(input: BirthInput) {
  if (input.country !== 'KR') throw new CalcError('UNSUPPORTED_COUNTRY', '현재는 한국 출생만 지원해요.');
  if (input.calendar === 'lunar')
    throw new CalcError('LUNAR_UNSUPPORTED', '음력·윤달 변환은 검증된 만세력 라이브러리 연동 후 지원돼요. 지금은 양력으로 입력해 주세요.');
  const { year, month, day } = input;
  if (![year, month, day].every(Number.isInteger)) throw new CalcError('INVALID_DATE', '생년월일을 숫자로 입력해 주세요.');
  if (year < SAMPLE_RANGE.min || year > SAMPLE_RANGE.max)
    throw new CalcError('OUT_OF_RANGE', `${SAMPLE_RANGE.min}~${SAMPLE_RANGE.max}년 사이만 계산할 수 있어요.`);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    throw new CalcError('INVALID_DATE', '존재하지 않는 날짜예요. 날짜를 다시 확인해 주세요.');
  if (!input.timeUnknown) {
    const h = input.hour, mi = input.minute ?? 0;
    if (h === undefined || !Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(mi) || mi < 0 || mi > 59)
      throw new CalcError('INVALID_TIME', '출생 시간을 0~23시, 0~59분 범위로 입력하거나 "시간을 몰라요"를 선택해 주세요.');
  }
}

export const sampleCalculator: ChartCalculator = {
  name: 'sample-driver',
  version: '0.1.0',
  verified: false,
  yearPillar: yearPillarOf,
  calculate(input: BirthInput): SajuFacts {
    validate(input);
    const { year, month, day } = input;
    const warnings: string[] = ['engine_unverified'];

    const sy = sajuYearOf(year, month, day);
    const yearP = yearPillarOf(sy);

    const mb = monthBranchOf(month, day);
    const firstMonthStem = mod(mod(sy - 4, 10) % 5 * 2 + 2, 10); // 寅월 천간
    const monthP = pillar(firstMonthStem + mod(mb - 2, 12), mb);

    const di = dayIndex(year, month, day);
    const dayStem = di % 10;
    const dayP = pillar(dayStem, di % 12);

    let hourP: Pillar | null = null;
    if (!input.timeUnknown) {
      // 23:00~00:59 = 子시. 일 경계는 00:00(야자시 방식)로 두고 해당 일의 천간을 사용 — rules_version 에 명시
      const hb = Math.floor(((input.hour as number) + 1) / 2) % 12;
      hourP = pillar((dayStem % 5) * 2 + hb, hb);
      if ((input.hour as number) === 23 || (input.hour as number) === 0) warnings.push('zi_hour_boundary_rule_applied');
    } else {
      warnings.push('hour_pillar_unavailable');
    }
    if (nearTerm(month, day)) warnings.push('term_boundary_unverified');
    warnings.push('luck_cycles_unavailable');

    const stems = [yearP[0], monthP[0], dayP[0], hourP?.[0]].filter(Boolean) as Stem[];
    const branches = [yearP[1], monthP[1], dayP[1], hourP?.[1]].filter(Boolean) as Branch[];
    const five: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    stems.forEach((s) => five[STEM_ELEMENT[s]]++);
    branches.forEach((b) => five[BRANCH_ELEMENT[b]]++);

    const dm = dayP[0] as Stem;
    const tenGods: SajuFacts['tenGods'] = [
      { position: 'year', stem: yearP[0] as Stem, god: tenGod(dm, yearP[0] as Stem) },
      { position: 'month', stem: monthP[0] as Stem, god: tenGod(dm, monthP[0] as Stem) },
    ];
    if (hourP) tenGods.push({ position: 'hour', stem: hourP[0] as Stem, god: tenGod(dm, hourP[0] as Stem) });

    const inputHash = hex(
      fnv(JSON.stringify([input.calendar, input.leapMonth, year, month, day, input.timeUnknown ? 'U' : `${input.hour}:${input.minute ?? 0}`, input.gender ?? '', input.country])),
    );
    return {
      chartId: `chart_${inputHash}`,
      inputHash,
      pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
      dayMaster: dm,
      fiveElements: five,
      tenGods,
      luckCycles: [],
      computation: {
        engine_name: this.name,
        engine_version: this.version,
        rules_version: 'sample-rules-0.1 (day:00:00, term:approx-fixed-dates)',
        timezone_policy: 'KST 입력 그대로 사용(서머타임·경도보정 미적용)',
        verified: false,
      },
      warnings,
    };
  },
};

/** 앱 전체가 사용하는 계산기. 검증된 라이브러리 어댑터가 준비되면 여기만 교체한다. */
export const calculator: ChartCalculator = sampleCalculator;
