import { describe, expect, it } from 'vitest';
import { CATEGORIES, CONTEXTS, SCENARIOS, buildReading, classifyConcern, isCrisis, styleVsChart, teamStory, CRISIS_LINES } from './concern';
import { calculator } from '../saju/calculator';
import type { BirthInput } from '../saju/types';

const input: BirthInput = { calendar: 'solar', leapMonth: false, year: 1990, month: 4, day: 19, hour: 1, minute: 10, timeUnknown: false, gender: 'F', country: 'KR' };
const facts = calculator.calculate(input);

describe('고민 분류·안전', () => {
  it('키워드로 범주를 고르고 없으면 null', () => {
    expect(classifyConcern('요즘 이직할지 퇴사할지 고민이야')).toBe('career');
    expect(classifyConcern('썸 타는 사람이 있는데 고백할까')).toBe('love');
    expect(classifyConcern('월급이 통장을 스쳐 가')).toBe('money');
    expect(classifyConcern('안녕')).toBeNull();
  });
  it('위기 표현은 사주 이야기 대신 도움 안내로 (띄어쓰기 무관)', () => {
    expect(isCrisis('요즘 죽고 싶다는 생각이 들어')).toBe(true);
    expect(isCrisis('죽고싶어')).toBe(true);
    expect(isCrisis('이직 고민')).toBe(false);
    expect(CRISIS_LINES.join(' ')).toContain('109');
  });
});

describe('고민 풀이', () => {
  it('모든 범주×상황 조합이 대사를 만들고, 단정 표현이 없다', () => {
    for (const c of CATEGORIES) for (const x of CONTEXTS[c.id]) {
      const lines = buildReading(c.id, x.id, facts);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      const all = lines.map((l) => l.text).join(' ');
      expect(all).not.toMatch(/반드시|무조건|100%|운명이 정해|틀림없이/);
      expect(lines.every((l) => l.text.length > 5)).toBe(true);
    }
  });
  it('같은 사주·같은 선택이면 같은 풀이(결정적), 사주가 다르면 달라진다', () => {
    expect(buildReading('love', 'some', facts)).toEqual(buildReading('love', 'some', facts));
    const other = calculator.calculate({ ...input, year: 1984, month: 9, day: 3 });
    expect(JSON.stringify(buildReading('love', 'some', other))).not.toBe(JSON.stringify(buildReading('love', 'some', facts)));
  });
  it('마음 고민에는 전문가 상담 안내가 들어간다', () => {
    expect(buildReading('self', 'conf', facts).map((l) => l.text).join(' ')).toContain('전문가 상담');
  });
});

describe('팀 케미·상황극', () => {
  it('시험 사주(庚午 庚辰 甲寅 乙丑)의 천간 충합·지지 관계가 이야기가 된다', () => {
    const t = teamStory(facts).map((l) => l.text).join(' ');
    expect(t).toContain('손을 꼭 잡았어'); // 庚乙합
    expect(t).toContain('팀');
  });
  it('상황극 선택의 최다 오행과 사주 개수를 비교', () => {
    expect(SCENARIOS.every((s) => s.options.length === 5)).toBe(true);
    const r = styleVsChart(['water', 'water', 'fire'], facts.fiveElements); // 시험 사주엔 물이 0
    expect(r.style).toBe('water');
    expect(r.lines[0].text).toContain('한 명도 없어');
    expect(styleVsChart(['wood', 'wood', 'metal'], facts.fiveElements).lines[0].text).toContain('3명');
  });
});
