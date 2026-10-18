// 엔진이 계산한 12절(節) 시각(KST=UTC+9 고정, 분 단위 버림) 기준표를 만든다. KASI 대조(kasi-verify.mjs)의 비교 대상.
// 실행: cd lovable-app && npx tsx scripts/gen-term-reference.ts > scripts/term-reference.json
import { solarTermsUtc } from "../src/lib/saju-engine.server";

const NAMES = [
  "입춘",
  "경칩",
  "청명",
  "입하",
  "망종",
  "소서",
  "입추",
  "백로",
  "한로",
  "입동",
  "대설",
  "소한",
];
const kst = (d: Date) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
const years: Record<string, { name: string; kst: string }[]> = {};
for (let y = 1900; y <= 2050; y++)
  years[y] = solarTermsUtc(y).map((t, i) => ({ name: NAMES[i]!, kst: kst(t) }));
process.stdout.write(
  JSON.stringify({ note: "Lovable 엔진(astronomy-engine) 기준, KST=UTC+9 고정", years }),
);
