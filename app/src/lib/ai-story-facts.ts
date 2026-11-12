// AI '풍부한 해석' 모드에 보내는 계산된 사실(전부 한글, 이름·생년월일 없음).
// 계산은 앱 엔진이 한 것 그대로이며, AI 는 여기 없는 간지·십성·12운성·신살·대운을 만들거나 바꾸지 못한다.
import { computeDaeunForBirth } from "./daeun";
import { mainStemOf, hiddenStemsOf } from "./hidden-stems";
import { ganjiYearAt, yearGanji, EL_WORD, ELEMENTS, branchElement, stemElement } from "./reading";
import { kstToday, type BirthInput } from "./saju";
import { BRANCH_KO, previewFromBirthInput } from "./saju-engine";
import { computeSinsal, twelveSinsal, SINSAL12 } from "./sinsal";
import { branchLinks, computeNeed, computeStrength, elementSignal, moodOf, stageSignal } from "./ai-story-judgment";
import { tenGodOf, type TenGod } from "./ten-gods";
import { STAGE_KO, stageIndex, stageOf } from "./twelve-stages";

export const STEM_NAME = ["갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수"] as const;
const GROUP: Record<TenGod, string> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};
// 일주의 상징 이미지(일주론에서 흔히 쓰는 비유, 재미용). 글에 이미지를 이어 쓰는 재료로만 쓴다.
export const STEM_IMAGE = [
  "하늘을 향해 곧게 뻗는 큰 나무", "바람에 눕지만 끊어지지 않는 덩굴과 풀꽃", "세상을 비추는 한낮의 태양", "어둠을 밝히는 촛불과 등불", "묵직하게 자리를 지키는 큰 산", "씨앗을 품어 기르는 논밭의 흙",
  "단단한 바위와 날 선 칼", "다듬어질수록 빛나는 보석", "끝없이 흐르는 큰 강과 바다", "조용히 스며드는 이슬과 봄비",
] as const;
export const BRANCH_IMAGE = [
  "깊은 밤과 쥐의 영리함", "겨울 끝자락의 소와 얼어 있는 땅", "이른 봄 숲을 지키는 호랑이", "봄 꽃밭 위의 토끼", "봄비를 머금은 땅과 용", "초여름 햇살 속의 뱀",
  "한여름 정오의 말", "늦여름 마른 땅 위의 양", "초가을 바람 속의 원숭이", "가을 저녁의 닭", "늦가을 산자락의 개", "초겨울 바다 곁의 돼지",
] as const;
const MONTH_OF_BRANCH = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 지지(자~해) → 대략 양력 달

export interface StoryFacts {
  text: string; // AI 에 보낼 사실 블록
  dayStemName: string;
  hasHour: boolean;
  sinsalNames: string[]; // 이 사주에 실제로 해당하는 신살 이름(AI 가 다른 신살을 말하면 검수에서 막는다)
  strengthLabel: string; // 신강 / 신강 경향 / 신약 경향 / 신약 (일반 이론 후보)
  years: number[]; // 향후 5년(입춘 기준)
  yearNames: string[]; // 그 해의 간지 읽기(예: 병오)
  daeunNow: string | null; // 지금 대운 이름(예: 병술)
  needName: string; // 생활 처방용 필요한 기운 이름(예: 불)
}

export function buildStoryFacts(me: BirthInput, now: Date = new Date()): StoryFacts | null {
  const p = previewFromBirthInput(me);
  if (!p.ok || !p.pillars || !p.elements) return null;
  const pil = p.pillars;
  const dm = pil.day.stem;
  const L: string[] = [];
  const todayYear = Number(kstToday().slice(0, 4));
  const age = Math.max(0, todayYear - Number(me.date.slice(0, 4)));

  L.push("[기본]");
  L.push(`- 성별: ${me.gender === "f" ? "여성" : "남성"}, 나이: 만 ${age}세 안팎`);
  L.push(`- 나를 뜻하는 일간: ${STEM_NAME[dm]} (오행으로 ${EL_WORD[stemElement(dm)]})`);
  L.push(`- 출생 시간: ${pil.hour ? "알고 있음" : "모름(시주는 없음, 시주 얘기는 하지 않는다)"}`);

  L.push("[일주의 상징 이미지(재미용 비유이며 사실 판정이 아니다. 글에 이미지로 이어 쓴다)]");
  L.push(`- 일간 ${STEM_NAME[dm]}: ${STEM_IMAGE[dm]}`);
  L.push(`- 일지 ${BRANCH_KO[pil.day.branch]}: ${BRANCH_IMAGE[pil.day.branch]}`);
  L.push(`- 일주 ${pil.day.ko}: ${STEM_IMAGE[dm]}이(가) ${BRANCH_IMAGE[pil.day.branch]} 곁에 서 있는 모습`);

  L.push("[네 기둥]");
  const cols = [
    { n: "연주", p: pil.year }, { n: "월주", p: pil.month }, { n: "일주", p: pil.day }, { n: "시주", p: pil.hour },
  ];
  for (const c of cols) {
    if (!c.p) continue;
    L.push(`- ${c.n}: ${c.p.ko} (하늘 글자 ${STEM_NAME[c.p.stem]}, 땅 글자 ${BRANCH_KO[c.p.branch]}(${EL_WORD[branchElement(c.p.branch)]}))`);
  }

  L.push("[오행 개수(여덟 글자 기준, 시주 없으면 여섯 글자)]");
  const counts = p.elements;
  L.push(`- ${ELEMENTS.map((e) => `${EL_WORD[e]} ${counts[e]}`).join(", ")}`);
  const missing = ELEMENTS.filter((e) => counts[e] === 0).map((e) => EL_WORD[e]);
  const max = Math.max(...ELEMENTS.map((e) => counts[e]));
  L.push(`- 가장 많은 오행: ${ELEMENTS.filter((e) => counts[e] === max).map((e) => EL_WORD[e]).join("·")} / 없는 오행: ${missing.length ? missing.join("·") : "없음(다섯 가지 모두 있음)"}`);

  L.push("[십성(일간 기준 이름) — 보이는 글자에 붙인 이름]");
  const tally: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  for (const c of cols) {
    if (!c.p) continue;
    const parts: string[] = [];
    if (c.n !== "일주") {
      const g = tenGodOf(dm, c.p.stem);
      parts.push(`하늘 글자 ${STEM_NAME[c.p.stem]}=${g}`);
      tally[GROUP[g]]!++;
    } else parts.push("하늘 글자=나 자신(일간)");
    const main = mainStemOf(c.p.branch);
    const gm = tenGodOf(dm, main);
    tally[GROUP[gm]]!++;
    const hidden = hiddenStemsOf(c.p.branch)
      .map((h) => `${STEM_NAME[h.stem]}${h.main ? "(본기)" : ""}=${tenGodOf(dm, h.stem)}`)
      .join(", ");
    parts.push(`땅 글자 ${BRANCH_KO[c.p.branch]} 속 글자: ${hidden}`);
    L.push(`- ${c.n}: ${parts.join(" / ")}`);
  }
  L.push(`- 십성 묶음 개수(하늘 글자와 땅 글자 본기만 셈): ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);

  L.push("[12운성(일간이 각 땅 글자에서 놓이는 단계)]");
  L.push(`- ${cols.filter((c) => c.p).map((c) => `${c.n} ${BRANCH_KO[c.p!.branch]}=${stageOf(dm, c.p!.branch)}`).join(", ")}`);

  L.push("[신살(일반 표 기준, 해당하는 것만)]");
  const sinsalNames: string[] = [];
  const lines: string[] = [];
  for (const r of computeSinsal(pil)) {
    if (!r.hits.length) continue;
    const base = r.name.replace(/ · .*$/, "");
    lines.push(`${r.name}: ${r.hits.join("·")}`);
    if (!sinsalNames.includes(base)) sinsalNames.push(base);
  }
  L.push(lines.length ? `- ${lines.join(" / ")}` : "- 해당하는 대표 신살 없음");
  const t12 = twelveSinsal(pil)[0]!;
  L.push(`- 12신살(일지 기준): ${t12.cells.filter((c) => c.idx !== null).map((c) => `${c.label} ${SINSAL12[c.idx!]}`).join(", ")}`);

  const mb = pil.month.branch;
  L.push("[태어난 달]");
  L.push(`- 월지 ${BRANCH_KO[mb]}, 대략 양력 ${MONTH_OF_BRANCH[mb]}월 무렵의 절기 달(달력의 달과 절기 달은 다를 수 있다)`);

  // ── 일반 이론 판정(점수 합산 없음, 전문가 검증 전) ──
  const st = computeStrength(pil);
  const need = computeNeed(pil, counts, st);
  L.push("[일간 강약 관찰(일반 이론, 전문가 검증 전인 후보 판정)]");
  for (const e of st.evidence) L.push(`- ${e}`);
  L.push(`- 결과: ${st.label} (득령·득지·득세 가운데 ${[st.ryeong, st.ji, st.se].filter(Boolean).length}개가 예). 이 계산은 종격 같은 특수 구조와 합충의 변화는 반영하지 않는다`);
  L.push("[균형과 필요한 기운(일반 이론, 전문가 검증 전인 후보)]");
  L.push(`- 억부 관점: ${need.eokbuNote}`);
  L.push(`- 조후 관점: ${need.johuNote}`);
  L.push(`- 생활 처방용 필요한 기운(용신 후보): ${EL_WORD[need.primary]} — ${need.primaryReason}`);
  L.push(`- 필요한 기운을 낳아 주는 기운(희신 후보): ${EL_WORD[need.hee]} / 필요한 기운을 누르는 기운(기신 후보): ${EL_WORD[need.gi]}`);
  L.push(`- 넘치는 기운: ${need.excess.length ? need.excess.map((e) => EL_WORD[e]).join("·") : "뚜렷하게 넘치는 오행은 없음"} / 가장 적은 기운: ${need.least.map((e) => EL_WORD[e]).join("·")}`);
  L.push("[오행 상징 대응(일반 표, 생활 처방 재료. 의학·종교적 주장이 아니다)]");
  L.push("- 나무: 초록·청록색, 동쪽, 봄, 신맛, 걷기·스트레칭·식물 가꾸기, 전통적으로 간·눈·근육 쪽 관리와 연결");
  L.push("- 불: 붉은색·주황색, 남쪽, 여름, 쓴맛, 햇볕 쬐기·활동적인 운동·사람 만나기, 전통적으로 심장·혈압·혈액순환 쪽 관리와 연결");
  L.push("- 흙: 노란색·황토색, 중앙, 환절기, 단맛, 규칙적인 식사와 수면·텃밭·산책, 전통적으로 위장·소화 쪽 관리와 연결");
  L.push("- 쇠: 흰색·은색, 서쪽, 가을, 매운맛, 정리정돈·호흡 운동, 전통적으로 폐·호흡기·피부 쪽 관리와 연결");
  L.push("- 물: 검은색·남색, 북쪽, 겨울, 짠맛, 충분한 수면과 수분·수영·휴식, 전통적으로 신장·방광·귀·허리 쪽 관리와 연결");

  const d = computeDaeunForBirth(me);
  let daeunNow: string | null = null;
  if (d) {
    const nowAge = (now.getTime() - d.birthUtcMs) / (365.2425 * 86_400_000);
    let idx = -1;
    d.pillars.forEach((x, i) => { if (x.startAgeYears <= nowAge) idx = i; });
    L.push("[10년 단위 인생 흐름(대운, 참고용) — 분위기는 12운성 단계와 필요한 기운 여부를 센 판정]");
    L.push(`- ${d.forward ? "순행" : "역행"}, 첫 흐름은 만 ${d.startAge.years}세 무렵에 시작`);
    d.pillars.forEach((x, i) => {
      const stg = stageIndex(dm, x.branch);
      const mood = moodOf([stageSignal(stg), elementSignal(stemElement(x.stem), need), elementSignal(branchElement(x.branch), need)]);
      const next = d.pillars[i + 1];
      const links = branchLinks(x.branch, pil);
      L.push(`- ${i === idx ? "[지금] " : ""}${x.ko} 대운 만 ${x.startAge.years}세~${next ? next.startAge.years : x.startAge.years + 10}세(${x.startYear}년경~): 하늘 글자 ${STEM_NAME[x.stem]}=${x.tenGod}, 땅 글자 ${BRANCH_KO[x.branch]}, 일간의 12운성 ${STAGE_KO[stg]}, 하늘 글자 기운은 필요한 기운 쪽으로 ${elementSignal(stemElement(x.stem), need) === "+" ? "도움" : elementSignal(stemElement(x.stem), need) === "-" ? "부담" : "중립"}, 땅 글자 기운은 ${elementSignal(branchElement(x.branch), need) === "+" ? "도움" : elementSignal(branchElement(x.branch), need) === "-" ? "부담" : "중립"}, 원국과: ${links.length ? links.join(", ") : "충·육합 없음"} → 분위기 판정: ${mood.label}`);
    });
    const cur = d.pillars[Math.max(idx, 0)]!;
    daeunNow = cur.ko;
    const nxt = d.pillars[Math.max(idx, 0) + 1];
    if (nxt) L.push(`- 다음 대운으로 바뀌는 때(교운기): ${nxt.startYear}년경, 만 ${nxt.startAge.years}세 무렵. 바뀌기 전후 1~2년은 환경·마음이 전환되기 쉬운 시기로 본다`);
  }

  const y1 = yearGanji(ganjiYearAt(now));
  const years = [0, 1, 2, 3, 4].map((k) => yearGanji(y1.year + k));
  L.push("[향후 5년(입춘 기준 해의 간지) — 분위기는 12운성 단계와 필요한 기운 여부를 센 판정]");
  for (const y of years) {
    const stg = stageIndex(dm, y.branch);
    const sSig = elementSignal(stemElement(y.stem), need);
    const bSig = elementSignal(branchElement(y.branch), need);
    const mood = moodOf([stageSignal(stg), sSig, bSig]);
    const links = branchLinks(y.branch, pil);
    L.push(`- ${y.year}년 ${y.ko}년: 하늘 글자 ${STEM_NAME[y.stem]}=${tenGodOf(dm, y.stem)}, 땅 글자 ${BRANCH_KO[y.branch]}(${EL_WORD[branchElement(y.branch)]}), 일간의 12운성 ${STAGE_KO[stg]}, 하늘 글자 기운은 필요한 기운 쪽으로 ${sSig === "+" ? "도움" : sSig === "-" ? "부담" : "중립"}, 땅 글자 기운은 ${bSig === "+" ? "도움" : bSig === "-" ? "부담" : "중립"}, 원국과: ${links.length ? links.join(", ") : "충·육합 없음"}${links.some((l) => l.endsWith("충")) ? " (충은 변화·이동이 큰 신호)" : ""} → 분위기 판정: ${mood.label}`);
  }

  return { text: L.join("\n"), dayStemName: STEM_NAME[dm]!, hasHour: !!pil.hour, sinsalNames, strengthLabel: st.label, years: years.map((y) => y.year), yearNames: years.map((y) => y.ko), daeunNow, needName: EL_WORD[need.primary] };
}

