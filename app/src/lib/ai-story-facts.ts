// AI '풍부한 해석' 모드에 보내는 계산된 사실(전부 한글, 이름·생년월일 없음).
// 계산은 앱 엔진이 한 것 그대로이며, AI 는 여기 없는 간지·십성·12운성·신살·대운을 만들거나 바꾸지 못한다.
import { computeDaeunForBirth } from "./daeun";
import { mainStemOf, hiddenStemsOf } from "./hidden-stems";
import { ganjiYearAt, yearGanji, EL_WORD, ELEMENTS, branchElement, stemElement } from "./reading";
import { kstToday, type BirthInput } from "./saju";
import { BRANCH_KO, previewFromBirthInput } from "./saju-engine";
import { computeSinsal, twelveSinsal, SINSAL12 } from "./sinsal";
import { tenGodOf, type TenGod } from "./ten-gods";
import { STAGE_KO, stageIndex, stageOf } from "./twelve-stages";

export const STEM_NAME = ["갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수"] as const;
const GROUP: Record<TenGod, string> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};
const MONTH_OF_BRANCH = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 지지(자~해) → 대략 양력 달

export interface StoryFacts {
  text: string; // AI 에 보낼 사실 블록
  dayStemName: string;
  hasHour: boolean;
  sinsalNames: string[]; // 이 사주에 실제로 해당하는 신살 이름(AI 가 다른 신살을 말하면 검수에서 막는다)
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

  const d = computeDaeunForBirth(me);
  if (d) {
    L.push("[10년 단위 흐름(대운, 참고용)]");
    L.push(`- ${d.forward ? "순행" : "역행"}, 첫 흐름은 만 ${d.startAge.years}세 무렵에 시작`);
    const nowAge = (now.getTime() - d.birthUtcMs) / (365.2425 * 86_400_000);
    let idx = -1;
    d.pillars.forEach((x, i) => { if (x.startAgeYears <= nowAge) idx = i; });
    const cur = d.pillars[Math.max(idx, 0)]!;
    const nxt = d.pillars[Math.max(idx, 0) + 1];
    const desc = (x: typeof cur) => `${x.ko}(만 ${x.startAge.years}세~, 하늘 글자 ${STEM_NAME[x.stem]}=${x.tenGod}, 땅 글자 ${BRANCH_KO[x.branch]})`;
    L.push(`- ${idx < 0 ? "아직 첫 흐름 전, 곧 시작될 흐름" : "지금 흐름"}: ${desc(cur)}`);
    if (nxt) L.push(`- 다음 흐름: ${desc(nxt)}`);
  }

  const y1 = yearGanji(ganjiYearAt(now));
  const y2 = yearGanji(y1.year + 1);
  L.push("[올해와 내년(입춘 기준 해의 간지)]");
  for (const [w, y] of [["올해", y1], ["내년", y2]] as const)
    L.push(`- ${w} ${y.ko}년: 하늘 글자 ${STEM_NAME[y.stem]}=${tenGodOf(dm, y.stem)}, 땅 글자 ${BRANCH_KO[y.branch]}(${EL_WORD[branchElement(y.branch)]}), 일간이 그 땅 글자에서 ${STAGE_KO[stageIndex(dm, y.branch)]}`);

  return { text: L.join("\n"), dayStemName: STEM_NAME[dm]!, hasHour: !!pil.hour, sinsalNames };
}

