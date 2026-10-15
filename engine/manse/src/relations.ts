import { BRANCHES, STEMS } from './ganji';
import { ManseConfig } from './config';

export type Pos = 'year' | 'month' | 'day' | 'hour';
export type RelationType = '천간합' | '천간충' | '지지육합' | '지지삼합' | '지지반합' | '지지방합' | '지지충' | '지지형' | '지지자형' | '지지파' | '지지해';
export interface Relation { type: RelationType; members: Array<{ pos: Pos; char: string }>; detail: string; element?: string }

const POS_KO: Record<Pos, string> = { year: '연', month: '월', day: '일', hour: '시' };
export const posKo = (p: Pos) => POS_KO[p];

const STEM_COMBINE: Array<[string, string, string]> = [['甲', '己', '토'], ['乙', '庚', '금'], ['丙', '辛', '수'], ['丁', '壬', '목'], ['戊', '癸', '화']];
const STEM_CLASH: Array<[string, string]> = [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']];
const SIX_COMBINE: Array<[string, string, string]> = [['子', '丑', '토'], ['寅', '亥', '목'], ['卯', '戌', '화'], ['辰', '酉', '금'], ['巳', '申', '수'], ['午', '未', '화/토']];
const TRIPLE: Array<[string[], string]> = [[['申', '子', '辰'], '수'], [['亥', '卯', '未'], '목'], [['寅', '午', '戌'], '화'], [['巳', '酉', '丑'], '금']];
const DIRECTIONAL: Array<[string[], string]> = [[['寅', '卯', '辰'], '목'], [['巳', '午', '未'], '화'], [['申', '酉', '戌'], '금'], [['亥', '子', '丑'], '수']];
const CLASH: Array<[string, string]> = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const PUNISH_TRIPLES: Array<[string[], string]> = [[['寅', '巳', '申'], '무은지형'], [['丑', '戌', '未'], '지세지형']];
const PUNISH_PAIR: Array<[string, string, string]> = [['子', '卯', '무례지형']];
const SELF_PUNISH = ['辰', '午', '酉', '亥'];
const BREAK: Array<[string, string]> = [['子', '酉'], ['丑', '辰'], ['寅', '亥'], ['卯', '午'], ['巳', '申'], ['未', '戌']];
const HARM: Array<[string, string]> = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];

export interface Chart4 { stems: Partial<Record<Pos, number>>; branches: Partial<Record<Pos, number>> }
const ORDER: Pos[] = ['year', 'month', 'day', 'hour'];

/**
 * 합충형파해 "추출": 원국의 글자 조합이 어떤 관계에 해당하는지 나열한다.
 * 합이 실제로 화(化)하는지, 충이 실제로 작용하는지는 판단하지 않는다 (월령·세력·인접 여부 등은 해석 단계의 일).
 */
export function extractRelations(chart: Chart4, cfg: ManseConfig['relations']): Relation[] {
  const out: Relation[] = [];
  const stems = ORDER.filter((p) => chart.stems[p] !== undefined).map((p) => ({ pos: p, char: STEMS[chart.stems[p] as number] as string }));
  const brs = ORDER.filter((p) => chart.branches[p] !== undefined).map((p) => ({ pos: p, char: BRANCHES[chart.branches[p] as number] as string }));
  const pairs = <T,>(arr: T[]) => arr.flatMap((a, i) => arr.slice(i + 1).map((b) => [a, b] as [T, T]));
  const same = (x: string, y: string, p: [string, string]) => (x === p[0] && y === p[1]) || (x === p[1] && y === p[0]);

  for (const [a, b] of pairs(stems)) {
    const c = STEM_COMBINE.find((p) => same(a.char, b.char, [p[0], p[1]]));
    if (c) out.push({ type: '천간합', members: [a, b], element: c[2], detail: `${a.char}${b.char}합 (${c[2]}으로 화(化)할 수 있으나 실제 화 여부는 미판단)` });
    if (STEM_CLASH.some((p) => same(a.char, b.char, p))) out.push({ type: '천간충', members: [a, b], detail: `${a.char}${b.char}충` });
  }
  for (const [a, b] of pairs(brs)) {
    const c = SIX_COMBINE.find((p) => same(a.char, b.char, [p[0], p[1]]));
    if (c) out.push({ type: '지지육합', members: [a, b], element: c[2], detail: `${a.char}${b.char}합` });
    if (CLASH.some((p) => same(a.char, b.char, p))) out.push({ type: '지지충', members: [a, b], detail: `${a.char}${b.char}충` });
    if (BREAK.some((p) => same(a.char, b.char, p))) out.push({ type: '지지파', members: [a, b], detail: `${a.char}${b.char}파` });
    if (HARM.some((p) => same(a.char, b.char, p))) out.push({ type: '지지해', members: [a, b], detail: `${a.char}${b.char}해` });
    const pp = PUNISH_PAIR.find((p) => same(a.char, b.char, [p[0], p[1]]));
    if (pp) out.push({ type: '지지형', members: [a, b], detail: `${a.char}${b.char}형 (${pp[2]})` });
    if (a.char === b.char && SELF_PUNISH.includes(a.char)) out.push({ type: '지지자형', members: [a, b], detail: `${a.char}${b.char}자형` });
  }
  const has = (chars: string[]) => chars.map((ch) => brs.filter((b) => b.char === ch));
  for (const [set, el] of TRIPLE) {
    const found = has(set);
    const present = found.filter((f) => f.length > 0);
    if (present.length === 3) out.push({ type: '지지삼합', members: found.map((f) => f[0]), element: el, detail: `${set.join('')}삼합 (${el}국 가능, 실제 화 여부는 미판단)` });
    else if (present.length === 2 && cfg.halfTriple === 'WITH_PEAK') {
      const peak = set[1]; // 왕지(子午卯酉)
      const members = found.filter((f) => f.length > 0).map((f) => f[0]);
      if (members.some((m) => m.char === peak)) out.push({ type: '지지반합', members, element: el, detail: `${members.map((m) => m.char).join('')}반합 (${set.join('')}의 일부, 왕지 ${peak} 포함)` });
    }
  }
  for (const [set, el] of DIRECTIONAL) {
    const found = has(set);
    if (found.every((f) => f.length > 0)) out.push({ type: '지지방합', members: found.map((f) => f[0]), element: el, detail: `${set.join('')}방합 (${el})` });
  }
  for (const [set, name] of PUNISH_TRIPLES) {
    const found = has(set); const present = found.filter((f) => f.length > 0);
    if (present.length === 3) out.push({ type: '지지형', members: found.map((f) => f[0]), detail: `${set.join('')}삼형 (${name})` });
    else if (present.length === 2) out.push({ type: '지지형', members: present.map((f) => f[0]), detail: `${present.map((f) => f[0].char).join('')}형 (${set.join('')} 삼형의 일부, ${name})` });
  }
  return out;
}
