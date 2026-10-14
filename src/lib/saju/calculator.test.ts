import { describe, expect, it } from 'vitest';
import { sampleCalculator as c } from './sampleCalculator';
import { BirthInput, CalcError } from './types';
import { tenGod } from './rules';

const base: BirthInput = { calendar: 'solar', leapMonth: false, year: 2000, month: 1, day: 1, hour: 12, minute: 0, timeUnknown: false, country: 'KR' };

describe('sample calculator', () => {
  it('2000-01-01 일주는 戊午', () => {
    expect(c.calculate(base).pillars.day).toBe('戊午');
  });
  it('1984-02-04 이후 연주는 甲子, 직전은 癸亥(입춘 근사 경계)', () => {
    expect(c.calculate({ ...base, year: 1984, month: 2, day: 10 }).pillars.year).toBe('甲子');
    expect(c.calculate({ ...base, year: 1984, month: 2, day: 1 }).pillars.year).toBe('癸亥');
  });
  it('입춘 근처는 경계 경고를 붙인다', () => {
    expect(c.calculate({ ...base, year: 1990, month: 2, day: 4 }).warnings).toContain('term_boundary_unverified');
  });
  it('시간 미상이면 시주를 만들지 않는다', () => {
    const f = c.calculate({ ...base, timeUnknown: true, hour: undefined });
    expect(f.pillars.hour).toBeNull();
    expect(f.warnings).toContain('hour_pillar_unavailable');
  });
  it('甲日 子시는 甲子', () => {
    // 2000-01-01 은 戊日 → 戊日 子시는 壬子
    expect(c.calculate({ ...base, hour: 0 }).pillars.hour).toBe('壬子');
  });
  it('존재하지 않는 날짜/범위 밖/음력은 차단', () => {
    expect(() => c.calculate({ ...base, year: 2001, month: 2, day: 30 })).toThrow(CalcError);
    expect(() => c.calculate({ ...base, year: 1800 })).toThrow(CalcError);
    expect(() => c.calculate({ ...base, calendar: 'lunar' })).toThrowError(/라이브러리/);
    expect(() => c.calculate({ ...base, hour: 25 })).toThrow(CalcError);
  });
  it('동일 입력은 동일 결과', () => {
    expect(c.calculate(base)).toEqual(c.calculate(base));
  });
  it('십성', () => {
    expect(tenGod('甲', '甲')).toBe('비견');
    expect(tenGod('甲', '乙')).toBe('겁재');
    expect(tenGod('甲', '丙')).toBe('식신');
    expect(tenGod('甲', '戊')).toBe('편재');
    expect(tenGod('甲', '庚')).toBe('편관');
    expect(tenGod('甲', '壬')).toBe('편인');
    expect(tenGod('甲', '癸')).toBe('정인');
  });
});
