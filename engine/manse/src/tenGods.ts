import { Element, stemElement, stemYang } from './ganji';

export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';
const PRODUCES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS: Record<Element, Element> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

/** 일간(dm) 기준으로 대상 천간(stem)의 십성. 같은 음양이면 편(偏)/비견/식신/편재/편관/편인 */
export function tenGod(dm: number, stem: number): TenGod {
  const a = stemElement(dm), b = stemElement(stem), same = stemYang(dm) === stemYang(stem);
  if (a === b) return same ? '비견' : '겁재';
  if (PRODUCES[a] === b) return same ? '식신' : '상관';
  if (CONTROLS[a] === b) return same ? '편재' : '정재';
  if (CONTROLS[b] === a) return same ? '편관' : '정관';
  return same ? '편인' : '정인'; // PRODUCES[b] === a
}
