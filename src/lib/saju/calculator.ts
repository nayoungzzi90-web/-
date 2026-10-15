import { calculate, ManseRequest } from '../../../engine/manse/src/engine';
import { toSajuFacts } from '../../../engine/manse/src/adapter';
import { yearPillarOfYear } from '../../../engine/manse/src/pillars';
import { BirthInput, CalcError, CalcErrorCode, ChartCalculator } from './types';

const ERROR_MAP: Record<string, CalcErrorCode> = {
  INVALID_DATE: 'INVALID_DATE', INVALID_LUNAR_DATE: 'INVALID_DATE', LEAP_MONTH_NOT_FOUND: 'INVALID_DATE', INVALID_INPUT: 'INVALID_DATE',
  OUT_OF_RANGE: 'OUT_OF_RANGE', LUNAR_OUT_OF_RANGE: 'OUT_OF_RANGE',
  INVALID_TIME: 'INVALID_TIME', NONEXISTENT_LOCAL_TIME: 'INVALID_TIME', AMBIGUOUS_LOCAL_TIME: 'INVALID_TIME',
};

/** 앱 전체가 쓰는 계산기: 자체 만세력 엔진(engine/manse) 어댑터. 공식 절입 자료 확인 전이므로 verified=false 로 나온다. */
export const manseCalculator: ChartCalculator = {
  name: 'ohaeng-manse',
  version: '1.0.0',
  verified: false,
  calculate(input: BirthInput) {
    if (input.country !== 'KR') throw new CalcError('UNSUPPORTED_COUNTRY', '현재는 한국에서 태어난 경우만 계산할 수 있어요.');
    const unknown = input.timeUnknown || input.hour === undefined;
    const req: ManseRequest = {
      calendar: input.calendar, year: input.year, month: input.month, day: input.day, leapMonth: input.leapMonth,
      ...(unknown ? { timeUnknown: true } : { hour: input.hour, minute: input.minute ?? 0 }),
      ...(input.gender === 'M' || input.gender === 'F' ? { gender: input.gender } : {}),
    };
    const r = calculate(req);
    if (!r.ok) throw new CalcError(ERROR_MAP[r.error.code] ?? 'INVALID_DATE', r.error.message);
    const facts = toSajuFacts(r.value);
    // 입력 해시는 앱의 별칭·국가를 제외한 입력 기준으로 유지
    return facts;
  },
  yearPillar: (year: number) => yearPillarOfYear(year).ganji,
};
export const calculator = manseCalculator;
