// AI '풍부한 해석' 모드에 보내는 계산된 사실(전부 한글, 이름·생년월일 없음).
// 계산은 앱 엔진이 한 것 그대로이며, AI 는 여기 없는 간지·십성·12운성·신살·대운을 만들거나 바꾸지 못한다.
import { computeDaeunForBirth } from "./daeun";
import { mainStemOf, hiddenStemsOf } from "./hidden-stems";
import { EL_WORD, ELEMENTS, branchElement, stemElement } from "./reading";
import { kstToday, type BirthInput } from "./saju";
import { BRANCH_KO, previewFromBirthInput } from "./saju-engine";
import { computeSinsal, twelveSinsal, SINSAL12 } from "./sinsal";
import { computeDetail, signalWord } from "./saju-detail";
import { tenGodOf, type TenGod } from "./ten-gods";
import { stageOf } from "./twelve-stages";

import { STEM_NAME, STEM_IMAGE, BRANCH_IMAGE, buildChartPacket, packetJson, type ChartPacket } from "./saju-packet";
export { STEM_NAME, STEM_IMAGE, BRANCH_IMAGE };
const GROUP: Record<TenGod, string> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};
const MONTH_OF_BRANCH = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export interface StoryFacts {
  text: string; // 사람이 읽는 사실 블록(검수·시험용 보존)
  json: string; // AI 에 보내는 계산 결과 JSON 패킷
  packet: ChartPacket; // 같은 패킷(검수와 구상 검증이 쓴다)
  dayStemName: string;
  hasHour: boolean;
  tags: string[]; // 구조 패턴 태그 이름(AI 가 태그에 없는 구조를 말하면 검수에서 막는다)
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
    L.push(`- ${c.n}: ${c.p.ko} (천간 ${STEM_NAME[c.p.stem]}, 지지 ${BRANCH_KO[c.p.branch]}(${EL_WORD[branchElement(c.p.branch)]}))`);
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
      parts.push(`천간 ${STEM_NAME[c.p.stem]}=${g}`);
      tally[GROUP[g]]!++;
    } else parts.push("천간=나 자신(일간)");
    const main = mainStemOf(c.p.branch);
    const gm = tenGodOf(dm, main);
    tally[GROUP[gm]]!++;
    const hidden = hiddenStemsOf(c.p.branch)
      .map((h) => `${STEM_NAME[h.stem]}${h.main ? "(본기)" : ""}=${tenGodOf(dm, h.stem)}`)
      .join(", ");
    parts.push(`지지 ${BRANCH_KO[c.p.branch]} 속 글자: ${hidden}`);
    L.push(`- ${c.n}: ${parts.join(" / ")}`);
  }
  L.push(`- 십성 묶음 개수(천간과 지지 본기만 셈): ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);

  L.push("[12운성(일간이 각 지지에서 놓이는 단계)]");
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

  // ── 일반 이론 판정(점수 합산 없음, 전문가 검증 전). 화면의 상세 분석 보기와 같은 계산(saju-detail)을 쓴다 ──
  const dt = computeDetail(pil, counts, computeDaeunForBirth(me), now);
  const { strength: st, need, effect: eff } = dt;
  L.push("[일간 강약 관찰(일반 이론, 전문가 검증 전인 후보 판정)]");
  for (const e of st.evidence) L.push(`- ${e}`);
  L.push(`- 결과: ${st.label} (득령·득지·득세 가운데 ${[st.ryeong, st.ji, st.se].filter(Boolean).length}개가 예). 이 계산은 종격 같은 특수 구조와 합충의 변화는 반영하지 않는다`);
  L.push("[균형과 필요한 기운(일반 이론, 전문가 검증 전인 후보)]");
  L.push(`- 억부 관점: ${need.eokbuNote}`);
  L.push(`- 조후 관점: ${need.johuNote}`);
  L.push(`- 생활 처방용 필요한 기운(용신 후보): ${EL_WORD[need.primary]} — ${need.primaryReason}`);
  L.push(`- 필요한 기운의 원국 내 작용 관찰(있다와 힘을 쓴다는 다르다): ${eff.evidence}`);
  L.push(`- 필요한 기운을 낳아 주는 기운(희신 후보): ${EL_WORD[need.hee]} / 필요한 기운을 누르는 기운(기신 후보): ${EL_WORD[need.gi]}`);
  L.push(`- 넘치는 기운: ${need.excess.length ? need.excess.map((e) => EL_WORD[e]).join("·") : "뚜렷하게 넘치는 오행은 없음"} / 가장 적은 기운: ${need.least.map((e) => EL_WORD[e]).join("·")}`);
  L.push("[원국의 합·충·형·파·해 관계(발견만 한다. 합화·삼합이 실제로 성립했는지와 충이 풀렸는지는 판정하지 않는다)]");
  L.push(dt.natal.length ? dt.natal.map((x) => `- ${x}`).join("\n") : "- 발견된 관계 없음");
  L.push("[오행 상징 대응(일반 표, 생활 처방 재료. 의학·종교적 주장이 아니다)]");
  L.push("- 나무: 초록·청록색, 동쪽, 봄, 신맛, 걷기·스트레칭·식물 가꾸기, 전통적으로 간·눈·근육 쪽 관리와 연결");
  L.push("- 불: 붉은색·주황색, 남쪽, 여름, 쓴맛, 햇볕 쬐기·활동적인 운동·사람 만나기, 전통적으로 심장·혈압·혈액순환 쪽 관리와 연결");
  L.push("- 흙: 노란색·황토색, 중앙, 환절기, 단맛, 규칙적인 식사와 수면·텃밭·산책, 전통적으로 위장·소화 쪽 관리와 연결");
  L.push("- 쇠: 흰색·은색, 서쪽, 가을, 매운맛, 정리정돈·호흡 운동, 전통적으로 폐·호흡기·피부 쪽 관리와 연결");
  L.push("- 물: 검은색·남색, 북쪽, 겨울, 짠맛, 충분한 수면과 수분·수영·휴식, 전통적으로 신장·방광·귀·허리 쪽 관리와 연결");

  const line = (r: (typeof dt.daeun)[number]) =>
    `천간 ${STEM_NAME[r.stem]}=${r.stemTenGod}, 지지 ${BRANCH_KO[r.branch]}, 일간의 12운성 ${r.stage}, 천간 기운은 필요한 기운 쪽으로 ${signalWord(r.stemSignal)}, 지지 기운은 ${signalWord(r.branchSignal)}, 원국과: ${r.links.length ? r.links.join("; ") : "발견된 관계 없음"}${r.links.some((l) => l.endsWith(": 충")) ? " (충은 사건이 아니라 변화·이동이 큰 신호)" : ""} → 분위기 판정: ${r.mood.label}`;
  if (dt.daeun.length) {
    L.push("[10년 단위 인생 흐름(대운, 참고용) — 분위기는 12운성 단계와 필요한 기운 여부를 센 판정]");
    for (const r of dt.daeun) L.push(`- ${r.now ? "[지금] " : ""}${r.name} 대운 ${r.range}: ${line(r)}`);
    if (dt.nextChange) L.push(`- 다음 대운으로 바뀌는 때(교운기): ${dt.nextChange.year}년경, 만 ${dt.nextChange.age}세 무렵. 바뀌기 전후 1~2년은 환경·마음이 전환되기 쉬운 시기로 본다`);
  }
  L.push("[향후 5년(입춘 기준 해의 간지) — 분위기는 12운성 단계와 필요한 기운 여부를 센 판정]");
  for (const r of dt.years) L.push(`- ${r.year}년 ${r.name}년: ${line(r)}`);

  const built = buildChartPacket(me, now);
  if (!built) return null;
  return { text: L.join("\n"), json: packetJson(built.packet), packet: built.packet, tags: built.tags, dayStemName: STEM_NAME[dm]!, hasHour: !!pil.hour, sinsalNames: built.sinsalNames, strengthLabel: st.label, years: dt.years.map((y) => y.year!), yearNames: dt.years.map((y) => y.name), daeunNow: dt.daeunNowName, needName: EL_WORD[need.primary] };
}

