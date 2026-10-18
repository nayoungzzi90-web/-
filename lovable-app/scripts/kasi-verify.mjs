#!/usr/bin/env node
// KASI 공식 24절기 API(공공데이터포털 '특일 정보') ↔ 우리 엔진 대조. 의존성 없음(Node 18+).
// 사용:  KASI_KEY='발급받은_일반인증키(Decoding)' node scripts/kasi-verify.mjs [시작연도] [끝연도]
// 키는 화면/채팅/깃에 남기지 말 것. 이 스크립트는 키를 출력하지 않는다.
import { readFileSync } from "node:fs";

const key = process.env.KASI_KEY;
if (!key) {
  console.error("KASI_KEY 환경변수가 없어요. 사용법은 파일 맨 위 주석을 보세요.");
  process.exit(1);
}
const [Y0, Y1] = [Number(process.argv[2] ?? 2025), Number(process.argv[3] ?? 2050)];
const ref = JSON.parse(
  readFileSync(new URL("./term-reference.json", import.meta.url), "utf8"),
).years;
const JIE = new Set([
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
]);
const BASE =
  process.env.KASI_BASE ??
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toArr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

async function fetchYear(y) {
  const url = `${BASE}?serviceKey=${encodeURIComponent(key)}&solYear=${y}&numOfRows=50&pageNo=1&_type=json`;
  const res = await fetch(url);
  const text = await res.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return { error: `JSON 아님(HTTP ${res.status}): ${text.slice(0, 120).replace(key, "***")}` };
  }
  const header = j?.response?.header;
  if (header && header.resultCode !== "00")
    return { error: `${header.resultCode} ${header.resultMsg}` };
  return { items: toArr(j?.response?.body?.items?.item), sample: j?.response?.body?.items?.item };
}

let n = 0,
  dateOnly = 0,
  withTime = 0,
  bad = 0,
  noData = 0;
const diffs = [];
let shownSample = false;
const issues = [];
for (let y = Y0; y <= Y1; y++) {
  const r = await fetchYear(y);
  if (r.error) {
    issues.push(`${y}: ${r.error}`);
    if (/SERVICE|KEY|INVALID|30|31/i.test(r.error)) break;
    continue;
  }
  if (!r.items.length) {
    noData++;
    issues.push(`${y}: 데이터 없음`);
    continue;
  }
  if (!shownSample) {
    console.log("응답 예시(첫 항목):", JSON.stringify(toArr(r.sample)[0]));
    shownSample = true;
  }
  for (const it of r.items) {
    if (!JIE.has(it.dateName)) continue;
    const loc = String(it.locdate); // YYYYMMDD
    const date = `${loc.slice(0, 4)}-${loc.slice(4, 6)}-${loc.slice(6, 8)}`;
    const mine =
      ref[y]?.find((t) => t.name === it.dateName) ??
      ref[y - 1]?.find((t) => t.name === it.dateName && t.kst.startsWith(date)) ??
      ref[y + 1]?.find((t) => t.name === it.dateName && t.kst.startsWith(date));
    if (!mine) {
      issues.push(`${y} ${it.dateName}: 우리 기준표에 없음 (${date})`);
      continue;
    }
    n++;
    const kstStr = it.kst != null ? String(it.kst).trim() : "";
    if (/^\d{1,4}$/.test(kstStr)) {
      withTime++;
      const hhmm = kstStr.padStart(4, "0");
      const k = Date.parse(`${date}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
      const m = Date.parse(`${mine.kst}:00Z`);
      const dMin = Math.round((m - k) / 60000);
      diffs.push(dMin);
      if (Math.abs(dMin) > 1) {
        bad++;
        issues.push(
          `${date} ${it.dateName}: KASI ${hhmm} 우리 ${mine.kst.slice(11)} (차이 ${dMin}분)`,
        );
      }
    } else {
      dateOnly++;
      if (mine.kst.slice(0, 10) !== date) {
        bad++;
        issues.push(`${date} ${it.dateName}: 날짜 다름 KASI=${date} 우리=${mine.kst}`);
      }
    }
  }
  await sleep(150);
}
const abs = diffs.map(Math.abs).sort((a, b) => a - b);
console.log(
  JSON.stringify({
    years: `${Y0}~${Y1}`,
    compared: n,
    withTime,
    dateOnly,
    mismatchesOver1Min_or_DateDiff: bad,
    noDataYears: noData,
    maxAbsMin: abs.at(-1) ?? null,
    medianAbsMin: abs.length ? abs[Math.floor(abs.length / 2)] : null,
  }),
);
if (issues.length) console.log(issues.slice(0, 30).join("\n"));
