import { Ganji, ganjiFromIndex, makeGanji, mod, pillarIndex } from './ganji';
import { jdn } from './time';
import { JIE, bracket, ipchun, Term } from './terms';

/** 일주 번호(0=甲子). 기준: 1900-01-01(JDN 2415021) = 甲戌(10). 독립 라이브러리(sxtwl)와 전수 대조한다. */
export const dayIndexFromJdn = (j: number) => mod(j - 11, 60);
export const dayPillarOf = (y: number, m: number, d: number): Ganji => ganjiFromIndex(dayIndexFromJdn(jdn(y, m, d)));

/** 입춘 기준 연주: utcMs 이전(포함) 마지막 입춘이 속한 해 */
export function yearOfIpchun(utcMs: number): { year: number; term: Term } | null {
  const { prev } = bracket(JIE.filter((t) => t.lon === 315), utcMs);
  return prev ? { year: prev.year, term: prev } : null;
}
export const yearPillarOfYear = (year: number): Ganji => ganjiFromIndex(mod(year - 4, 60));
export { ipchun };

/** 월지(寅=2) → 월간. 오호둔: 甲己년 丙寅, 乙庚 戊寅, 丙辛 庚寅, 丁壬 壬寅, 戊癸 甲寅 */
export function monthPillarOf(yearStem: number, branch: number): Ganji {
  const inStem = mod((yearStem % 5) * 2 + 2, 10);
  const n = mod(branch - 2, 12);
  return makeGanji(mod(inStem + n, 10), branch);
}

/** 시지 번호: 23~01시=子(0) … */
export const hourBranchOf = (hour: number) => Math.floor(mod(hour + 1, 24) / 2);
/** 오서둔: 甲己일 甲子시, 乙庚 丙子, 丙辛 戊子, 丁壬 庚子, 戊癸 壬子 */
export function hourPillarOf(dayStem: number, hour: number): Ganji {
  const b = hourBranchOf(hour);
  return makeGanji(mod((dayStem % 5) * 2 + b, 10), b);
}
export { pillarIndex };
