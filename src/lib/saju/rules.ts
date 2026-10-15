import { BRANCHES, Element, STEMS, Stem, TenGod, Branch } from './types';

export const STEM_ELEMENT: Record<Stem, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};
export const BRANCH_ELEMENT: Record<Branch, Element> = {
  子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire',
  午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water',
};

const PRODUCES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS: Record<Element, Element> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

export const stemIndex = (s: Stem) => STEMS.indexOf(s);
export const branchIndex = (b: Branch) => BRANCHES.indexOf(b);
const isYang = (s: Stem) => stemIndex(s) % 2 === 0;

/** 일간 기준 십성 */
export function tenGod(dayMaster: Stem, other: Stem): TenGod {
  const a = STEM_ELEMENT[dayMaster];
  const b = STEM_ELEMENT[other];
  const same = isYang(dayMaster) === isYang(other);
  if (a === b) return same ? '비견' : '겁재';
  if (PRODUCES[a] === b) return same ? '식신' : '상관';
  if (CONTROLS[a] === b) return same ? '편재' : '정재';
  if (CONTROLS[b] === a) return same ? '편관' : '정관';
  return same ? '편인' : '정인'; // PRODUCES[b] === a
}

const SIX_COMBINE: [Branch, Branch][] = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const SIX_CLASH: [Branch, Branch][] = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const has = (pairs: [Branch, Branch][], a: Branch, b: Branch) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export const branchRelation = (a: Branch, b: Branch): '육합' | '충' | '없음' =>
  has(SIX_COMBINE, a, b) ? '육합' : has(SIX_CLASH, a, b) ? '충' : '없음';

export const elementRelation = (a: Element, b: Element): '같은 기운' | '내가 도움' | '도움 받음' | '내가 조절' | '조절 받음' =>
  a === b ? '같은 기운' : PRODUCES[a] === b ? '내가 도움' : PRODUCES[b] === a ? '도움 받음' : CONTROLS[a] === b ? '내가 조절' : '조절 받음';

/** 지지 본기(本氣) 천간 — 지장간 전체가 아니라 대표 천간만 사용하는 단순화 */
export const BRANCH_MAIN_STEM: Record<Branch, Stem> = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' };
export const branchGod = (dayMaster: Stem, b: Branch): TenGod => tenGod(dayMaster, BRANCH_MAIN_STEM[b]);
