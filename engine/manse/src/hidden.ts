import { STEMS } from './ganji';
import { ManseConfig } from './config';

export interface HiddenStem { stem: number; stemChar: string; role: '여기' | '중기' | '정기'; days: number }

const s = (c: string) => STEMS.indexOf(c as (typeof STEMS)[number]);
/**
 * 지장간(월률분야). 학파별로 일수·구성이 다르다 — 아래는 널리 쓰이는 한 가지 표이며 외부 권위 자료로 검증하지 못했다.
 * 순서: 여기 → 중기 → 정기. 子·卯·酉 는 2개, 午 는 3개(丙己丁), 亥 는 3개(戊甲壬).
 */
const STANDARD: Array<Array<[string, number]>> = [
  [['壬', 10], ['癸', 20]],                 // 子
  [['癸', 9], ['辛', 3], ['己', 18]],       // 丑
  [['戊', 7], ['丙', 7], ['甲', 16]],       // 寅
  [['甲', 10], ['乙', 20]],                 // 卯
  [['乙', 9], ['癸', 3], ['戊', 18]],       // 辰
  [['戊', 7], ['庚', 7], ['丙', 16]],       // 巳
  [['丙', 10], ['己', 9], ['丁', 11]],      // 午
  [['丁', 9], ['乙', 3], ['己', 18]],       // 未
  [['戊', 7], ['壬', 7], ['庚', 16]],       // 申
  [['庚', 10], ['辛', 20]],                 // 酉
  [['辛', 9], ['丁', 3], ['戊', 18]],       // 戌
  [['戊', 7], ['甲', 5], ['壬', 18]],       // 亥
];
const MAIN: string[] = ['癸', '己', '甲', '乙', '戊', '丙', '丁', '己', '庚', '辛', '戊', '壬'];

export function hiddenStems(branch: number, table: ManseConfig['hiddenStems']['table']): HiddenStem[] {
  if (table === 'MAIN_ONLY') return [{ stem: s(MAIN[branch]), stemChar: MAIN[branch], role: '정기', days: 30 }];
  const rows = STANDARD[branch];
  return rows.map(([c, days], i) => ({ stem: s(c), stemChar: c, days, role: i === rows.length - 1 ? '정기' : i === 0 ? '여기' : '중기' }));
}
/** 월지 지장간 중 절입 후 경과 일수에 해당하는 사령(司令) 간. STANDARD 표에서만 의미가 있다. */
export function commandingStem(branch: number, daysSinceJie: number): HiddenStem {
  const rows = hiddenStems(branch, 'STANDARD');
  let acc = 0;
  for (const r of rows) { acc += r.days; if (daysSinceJie < acc) return r; }
  return rows[rows.length - 1];
}
