const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** 한국 표준시 기준 날짜(YYYY-MM-DD). 일진의 전통 경계와는 분리된 "화면 표시/캐시용" 날짜. */
export function kstDate(d: Date = new Date()): string {
  return fmt.format(d);
}
export const kstParts = (d: Date = new Date()) => {
  const [y, m, day] = kstDate(d).split('-').map(Number);
  return { year: y, month: m, day };
};
export const kstMonthKey = (d: Date = new Date()) => kstDate(d).slice(0, 7);
