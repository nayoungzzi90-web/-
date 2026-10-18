// KASI(한국천문연구원) 공개 달력자료 12절기 기준 시각 (Asia/Seoul, 분 단위 해상도)
// 출처(참고용 calendarData, 공식 월력요항 아님):
//   2025 https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2025
//   2026 https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026
//   2027 https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2027
// 순서: 소한, 입춘, 경칩, 청명, 입하, 망종, 소서, 입추, 백로, 한로, 입동, 대설
// 엔진 매핑: 입춘=solarTermsUtc(y)[0] ... 대설=solarTermsUtc(y)[10], 소한=solarTermsUtc(y-1)[11]

export const KASI_SOURCE_URLS = {
  2025: "https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2025",
  2026: "https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026",
  2027: "https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2027",
} as const;

export const TERM_NAMES = ["소한", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설"] as const;

// KASI 시각은 KST(UTC+9) 분 단위. UTC 밀리초로 변환해 저장.
const kst = (s: string) => {
  const [date, time] = s.split(" ") as [string, string];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  return Date.UTC(y, m - 1, d, h, mi) - 9 * 3600_000;
};

export const KASI_12JEOL: Record<number, { name: string; utcMs: number }[]> = {
  2025: [
    "2025-01-05 11:33", "2025-02-03 23:10", "2025-03-05 17:07", "2025-04-04 21:49",
    "2025-05-05 14:57", "2025-06-05 18:57", "2025-07-07 05:05", "2025-08-07 14:52",
    "2025-09-07 17:52", "2025-10-08 09:41", "2025-11-07 13:04", "2025-12-07 06:05",
  ].map((s, i) => ({ name: TERM_NAMES[i]!, utcMs: kst(s) })),
  2026: [
    "2026-01-05 17:23", "2026-02-04 05:02", "2026-03-05 22:59", "2026-04-05 03:40",
    "2026-05-05 20:49", "2026-06-06 00:48", "2026-07-07 10:57", "2026-08-07 20:43",
    "2026-09-07 23:41", "2026-10-08 15:29", "2026-11-07 18:52", "2026-12-07 11:53",
  ].map((s, i) => ({ name: TERM_NAMES[i]!, utcMs: kst(s) })),
  2027: [
    "2027-01-05 23:10", "2027-02-04 10:46", "2027-03-06 04:40", "2027-04-05 09:17",
    "2027-05-06 02:25", "2027-06-06 06:26", "2027-07-07 16:37", "2027-08-08 02:27",
    "2027-09-08 05:28", "2027-10-08 21:17", "2027-11-08 00:39", "2027-12-07 17:38",
  ].map((s, i) => ({ name: TERM_NAMES[i]!, utcMs: kst(s) })),
};

// 엔진 solarTermsUtc 인덱스로 변환: 그해 1월 소한은 solarTermsUtc(year-1)[11]
export function engineTermFor(year: number, termIdx: number): { engineYear: number; engineIdx: number } {
  if (termIdx === 0) return { engineYear: year - 1, engineIdx: 11 }; // 소한
  return { engineYear: year, engineIdx: termIdx - 1 }; // 입춘~대설
}
