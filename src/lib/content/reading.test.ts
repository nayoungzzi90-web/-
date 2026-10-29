import { describe, expect, it } from 'vitest';
import { calculator } from '../saju/calculator';
import type { BirthInput } from '../saju/types';
import { generateReport } from './report';

const mk = (o: Partial<BirthInput> = {}) => calculator.calculate({ calendar: 'solar', leapMonth: false, year: 1990, month: 4, day: 19, hour: 1, minute: 10, timeUnknown: false, gender: 'F', country: 'KR', ...o });
const chars = (s: string) => s.replace(/\s/g, '').length;

describe('해석 작성기', () => {
  it('기본사주: 섹션당 여러 문단, 전체 분량이 충분하고 개인 사실이 들어간다', () => {
    const r = generateReport({ productId: 'basic', facts: mk(), baseYear: 2026 });
    console.log('basic chars', r.chars, r.sections.map((s) => chars(s.body)));
    expect(r.sections).toHaveLength(6);
    r.sections.forEach((s) => expect(s.body.split('\n').length).toBeGreaterThanOrEqual(3));
    const all = r.sections.map((s) => s.body).join('\n');
    expect(all).toContain('庚午'); expect(all).toContain('甲寅');
    expect(all).toContain('2026년은');
    expect(all).toContain('대운'); expect(all).toContain('▶ 지금');
    expect(all).not.toMatch(/반드시|무조건|100%|틀림없이|운명이 정해/);
  });
  it('사주가 다르면 글도 달라지고, 같은 사주면 같다', () => {
    const a = generateReport({ productId: 'basic', facts: mk(), baseYear: 2026 }).sections.map((s) => s.body).join('|');
    expect(generateReport({ productId: 'basic', facts: mk(), baseYear: 2026 }).sections.map((s) => s.body).join('|')).toBe(a);
    const b = generateReport({ productId: 'basic', facts: mk({ year: 1984, month: 9, day: 3 }), baseYear: 2026 }).sections.map((s) => s.body).join('|');
    expect(b).not.toBe(a);
    // 문단 단위 중복이 적다: 서로 다른 두 사주의 문단 중 절반 이상이 다르다
    const pa = new Set(a.split(/[|\n]/)), pb = b.split(/[|\n]/);
    expect(pb.filter((x) => !pa.has(x)).length / pb.length).toBeGreaterThan(0.4);
  });
  it('시간 미상·성별 없음에서도 깨지지 않는다', () => {
    const r = generateReport({ productId: 'basic', facts: mk({ timeUnknown: true, hour: undefined, gender: undefined }), baseYear: 2026 });
    expect(r.sections).toHaveLength(6);
    expect(r.sections[0].body).toContain('시주');
  });
  it('연애운 심층: 5개 연도가 모두 풀이되고 분량이 크다', () => {
    const r = generateReport({ productId: 'love_deep', facts: mk(), baseYear: 2026 });
    console.log('love chars', r.chars);
    const y = r.sections[5].body;
    [2026, 2027, 2028, 2029, 2030].forEach((yy) => expect(y).toContain(`${yy}년은`));
    expect(r.qa.find((q) => q.id === 'years')?.status).toBe('pass');
  });
});

describe('궁합 본문', () => {
  it('두 사람 각자의 말과 순간이 들어가 분량이 충분하다', () => {
    const r = generateReport({ productId: 'compatibility', facts: mk(), factsB: mk({ year: 1993, month: 3, day: 9 }), baseYear: 2026 });
    console.log('compat chars', r.chars);
    expect(r.chars).toBeGreaterThan(1500);
    expect(r.sections.map((s) => s.body).join('\n')).toContain('설레는 순간');
    expect(r.qa.find((q) => q.id === 'length')?.status).toBe('pass');
  });
  it('기본사주·연애운은 목표 분량을 채운다', () => {
    expect(generateReport({ productId: 'basic', facts: mk(), baseYear: 2026 }).qa.find((q) => q.id === 'length')?.status).toBe('pass');
    expect(generateReport({ productId: 'love_deep', facts: mk(), baseYear: 2026 }).qa.find((q) => q.id === 'length')?.status).toBe('pass');
  });
});

describe('분량 보장(무작위 사주 표본)', () => {
  const rng = (() => { let x = 20261029; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); })();
  const sample = Array.from({ length: 150 }, () => ({ year: 1920 + Math.floor(rng() * 100), month: 1 + Math.floor(rng() * 12), day: 1 + Math.floor(rng() * 28), hour: Math.floor(rng() * 24), unknown: rng() < 0.3, gender: rng() < 0.5 ? 'F' : 'M' }) as const);
  it('기본사주는 시간이 있든 없든 3,000자 이상, 연애운은 4,000자 이상, 궁합은 1,500자 이상', () => {
    for (const s of sample) {
      const f = mk({ year: s.year, month: s.month, day: s.day, hour: s.unknown ? undefined : s.hour, timeUnknown: s.unknown, gender: s.gender });
      const tag = JSON.stringify(s);
      expect(generateReport({ productId: 'basic', facts: f, baseYear: 2026 }).chars, `basic ${tag}`).toBeGreaterThanOrEqual(3000);
      expect(generateReport({ productId: 'love_deep', facts: f, baseYear: 2026 }).chars, `love ${tag}`).toBeGreaterThanOrEqual(4000);
      expect(generateReport({ productId: 'compatibility', facts: f, factsB: mk({ year: 1993, month: 3, day: 9 }), baseYear: 2026 }).chars, `compat ${tag}`).toBeGreaterThanOrEqual(1500);
    }
  });
});
