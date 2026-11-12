// 계산 결과 JSON 패킷 — AI 에게 넘기는 "계산이 끝난 사실"을 구조화한 것.
//
// · 계산은 모두 코드가 이미 한 값이다(만세력 엔진·지장간 표·십성·12운성·신살·대운·일반 이론 판정). 이 파일은 그 값을 담기만 하고
//   엔진(saju-engine 등)은 건드리지 않는다. AI 는 여기에 없는 간지·십성·12운성·신살·대운을 만들거나 바꾸지 못한다.
// · 이름·생년월일·출생 시각 원문은 담지 않는다(나이대와 출생 시간 유무만).
// · 판정(강약·필요한 기운·분위기)은 일반 이론의 후보이며 점수 합산이 없다. 상태 필드로 밝힌다.
import { computeDaeunForBirth } from "./daeun";
import { hiddenStemsOf, mainStemOf } from "./hidden-stems";
import { EL_WORD, ELEMENTS, branchElement, stemElement } from "./reading";
import { kstToday, type BirthInput } from "./saju";
import { BRANCH_KO, previewFromBirthInput } from "./saju-engine";
import { computeDetail, countElements, signalWord, type TimeRow } from "./saju-detail";
import { SINSAL12, computeSinsal, twelveSinsal } from "./sinsal";
import { tenGodOf, type TenGod } from "./ten-gods";
import { buildPatternTags, findHyeonchim, type PatternTag } from "./saju-patterns";
import { stageOf } from "./twelve-stages";

export const PACKET_VERSION = "packet-1";
export const STEM_NAME = ["갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수"] as const;
// 일주의 상징 이미지(일주론에서 흔히 쓰는 비유, 재미용). 글에 이미지를 이어 쓰는 재료로만 쓴다.
export const STEM_IMAGE = [
  "하늘을 향해 곧게 뻗는 큰 나무", "바람에 눕지만 끊어지지 않는 덩굴과 풀꽃", "세상을 비추는 한낮의 태양", "어둠을 밝히는 촛불과 등불", "묵직하게 자리를 지키는 큰 산", "씨앗을 품어 기르는 논밭의 흙",
  "단단한 바위와 날 선 칼", "다듬어질수록 빛나는 보석", "끝없이 흐르는 큰 강과 바다", "조용히 스며드는 이슬과 봄비",
] as const;
export const BRANCH_IMAGE = [
  "깊은 밤의 고요한 방", "겨울 끝자락의 얼어 있는 땅", "이른 봄 새싹이 오르는 숲", "봄 꽃밭 위의 바람", "봄비를 머금은 촉촉한 땅", "초여름 햇살이 드는 마당",
  "한여름 정오의 뜨거운 길", "늦여름 열기가 남은 마른 땅", "초가을 선선한 바람이 부는 언덕", "가을 저녁의 붉은 노을", "늦가을 낙엽 쌓인 산자락", "초겨울 바다 곁의 찬 바람",
] as const;
const MONTH_OF_BRANCH = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 지지(자~해) → 대략 양력 달
const SEASON_OF = ["겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"] as const;
const GROUP: Record<TenGod, string> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};

export interface HiddenStemPacket { 이름: string; 본기: boolean; 십성: string }
export interface PillarPacket {
  기둥: "연주" | "월주" | "일주" | "시주";
  간지: string; // 예: 경오
  천간: { 이름: string; 오행: string; 십성: string }; // 일주의 천간 십성은 "나 자신(일간)"
  지지: { 이름: string; 오행: string; 본기십성: string; 지장간: HiddenStemPacket[] };
  십이운성: string; // 일간이 이 기둥의 지지에서 놓이는 단계
}
export interface TimePacket {
  이름: string; // 병술 / 병오
  구간: string; // 만 27세~37세(2023년경~) 또는 2026년
  연도?: number;
  지금: boolean;
  천간십성: string;
  십이운성: string;
  필요한기운쪽: { 천간: string; 지지: string }; // 도움 / 부담 / 중립
  원국관계: string[]; // 합·충·형·파·해 발견(성립 여부는 판정하지 않음)
  분위기: string; // 오르는 구간 / 엇갈리는 구간 / 쉬어가는 구간
}
export interface ChartPacket {
  버전: string;
  기본: { 성별: string; 나이: string; 출생시간: "있음" | "모름(시주 없음, 시주 얘기는 하지 않는다)" };
  일주의상징이미지: { 일간: string; 일지: string; 일주: string };
  일간: { 이름: string; 오행: string };
  네기둥: PillarPacket[];
  오행개수: Record<string, number>;
  오행요약: { 가장많은: string[]; 없는: string[] };
  십성묶음: Record<string, number>;
  월령: { 월지: string; 대략양력월: number; 계절: string; 안내: string };
  강약: { 판정: string; 상태: string; 득령: { 결과: string; 근거: string }; 득지: { 결과: string; 근거: string }; 득세: { 결과: string; 근거: string }; 한계: string };
  균형과필요한기운: {
    상태: string; 억부관점: string; 조후관점: string; 필요한기운: string; 우선규칙: string; 원국내작용: string;
    희신: string; 기신: string; 넘치는기운: string[]; 가장적은기운: string[];
  };
  구조패턴태그: PatternTag[]; // 일반 명리 이론으로 코드가 판정한 구조. 여기 없는 구조는 말하지 않는다
  원국의합충형파해: string[];
  신살: { 해당: { 이름: string; 위치: string[] }[]; 십이신살_일지기준: Record<string, string> };
  대운: { 방향: string; 첫시작나이: number; 목록: TimePacket[]; 교운기: { 연도: number; 나이: number; 안내: string } | null };
  향후5년: TimePacket[];
  오행상징대응: Record<string, { 색: string; 방향: string; 계절: string; 맛: string; 생활: string; 전통적연결부위: string }>;
  해석주의: string[];
}

const SYMBOLS: ChartPacket["오행상징대응"] = {
  나무: { 색: "초록·청록색", 방향: "동쪽", 계절: "봄", 맛: "신맛", 생활: "걷기·스트레칭·식물 가꾸기", 전통적연결부위: "간·눈·근육" },
  불: { 색: "붉은색·주황색", 방향: "남쪽", 계절: "여름", 맛: "쓴맛", 생활: "햇볕 쬐기·활동적인 운동·사람 만나기", 전통적연결부위: "심장·혈압·혈액순환" },
  흙: { 색: "노란색·황토색", 방향: "중앙", 계절: "환절기", 맛: "단맛", 생활: "규칙적인 식사와 수면·텃밭·산책", 전통적연결부위: "위장·소화" },
  쇠: { 색: "흰색·은색", 방향: "서쪽", 계절: "가을", 맛: "매운맛", 생활: "정리정돈·호흡 운동", 전통적연결부위: "폐·호흡기·피부" },
  물: { 색: "검은색·남색", 방향: "북쪽", 계절: "겨울", 맛: "짠맛", 생활: "충분한 수면과 수분·수영·휴식", 전통적연결부위: "신장·방광·귀·허리" },
};
const NOTES = [
  "모든 판정(강약·필요한 기운·분위기)은 일반 이론의 후보이며 점수 합산이 없다",
  "합·충·형·파·해는 발견만 했고 합화·삼합이 실제로 성립했는지, 충이 풀렸는지는 판정하지 않는다",
  "충이 있는 해는 사건이 아니라 변화·이동이 큰 신호다",
  "오행상징대응은 생활 처방 재료이며 의학·종교적 주장이 아니다",
];

const timeRow = (r: TimeRow): TimePacket => ({
  이름: r.name,
  구간: r.range,
  ...(r.year !== undefined ? { 연도: r.year } : {}),
  지금: r.now,
  천간십성: r.stemTenGod,
  십이운성: r.stage,
  필요한기운쪽: { 천간: signalWord(r.stemSignal), 지지: signalWord(r.branchSignal) },
  원국관계: r.links,
  분위기: r.mood.label,
});

export interface BuiltPacket {
  packet: ChartPacket;
  // 검수가 쓰는 값(패킷과 같은 계산에서 나온 것)
  tags: string[];
  sinsalNames: string[];
  strengthLabel: string;
  years: number[];
  yearNames: string[];
  daeunNow: string | null;
  needName: string;
  hasHour: boolean;
}

export function buildChartPacket(me: BirthInput, now: Date = new Date()): BuiltPacket | null {
  const p = previewFromBirthInput(me);
  if (!p.ok || !p.pillars || !p.elements) return null;
  const pil = p.pillars;
  const dm = pil.day.stem;
  const counts = p.elements ?? countElements(pil);
  const dt = computeDetail(pil, counts, computeDaeunForBirth(me), now);
  const { strength: st, need, effect: eff } = dt;
  const age = Math.max(0, Number(kstToday().slice(0, 4)) - Number(me.date.slice(0, 4)));

  const cols = [
    { n: "연주" as const, p: pil.year }, { n: "월주" as const, p: pil.month }, { n: "일주" as const, p: pil.day }, { n: "시주" as const, p: pil.hour },
  ];
  const tally: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const pillars: PillarPacket[] = [];
  for (const c of cols) {
    if (!c.p) continue;
    if (c.n !== "일주") tally[GROUP[tenGodOf(dm, c.p.stem)]]!++;
    tally[GROUP[tenGodOf(dm, mainStemOf(c.p.branch))]]!++;
    pillars.push({
      기둥: c.n,
      간지: c.p.ko,
      천간: { 이름: STEM_NAME[c.p.stem]!, 오행: EL_WORD[stemElement(c.p.stem)], 십성: c.n === "일주" ? "나 자신(일간)" : tenGodOf(dm, c.p.stem) },
      지지: {
        이름: BRANCH_KO[c.p.branch]!, 오행: EL_WORD[branchElement(c.p.branch)], 본기십성: tenGodOf(dm, mainStemOf(c.p.branch)),
        지장간: hiddenStemsOf(c.p.branch).map((h) => ({ 이름: STEM_NAME[h.stem]!, 본기: h.main, 십성: tenGodOf(dm, h.stem) })),
      },
      십이운성: stageOf(dm, c.p.branch),
    });
  }

  // 신살: 같은 신살이 일지·연지 기준으로 두 번 나오면 위치를 합친다
  const byName = new Map<string, string[]>();
  for (const r of computeSinsal(pil)) {
    if (!r.hits.length) continue;
    const base = r.name.replace(/ · .*$/, "");
    const cur = byName.get(base) ?? [];
    for (const h of r.hits) if (!cur.includes(h)) cur.push(h);
    byName.set(base, cur);
  }
  const t12 = twelveSinsal(pil)[0]!;
  const sinsal12: Record<string, string> = {};
  for (const c of t12.cells) if (c.idx !== null) sinsal12[c.label] = SINSAL12[c.idx]!;

  const mb = pil.month.branch;
  const max = Math.max(...ELEMENTS.map((e) => counts[e]));
  const excess = ELEMENTS.filter((e) => counts[e] === max && max >= 3).map((e) => EL_WORD[e]);
  const dRow = (r: TimeRow) => r;
  const nextChange = dt.nextChange;

  const packet: ChartPacket = {
    버전: PACKET_VERSION,
    기본: { 성별: me.gender === "f" ? "여성" : "남성", 나이: `만 ${age}세 안팎`, 출생시간: pil.hour ? "있음" : "모름(시주 없음, 시주 얘기는 하지 않는다)" },
    일주의상징이미지: { 일간: `${STEM_NAME[dm]}: ${STEM_IMAGE[dm]}`, 일지: `${BRANCH_KO[pil.day.branch]}: ${BRANCH_IMAGE[pil.day.branch]}`, 일주: `${pil.day.ko}: ${STEM_IMAGE[dm]}이(가) ${BRANCH_IMAGE[pil.day.branch]} 곁에 서 있는 모습` },
    일간: { 이름: STEM_NAME[dm]!, 오행: EL_WORD[stemElement(dm)] },
    네기둥: pillars,
    오행개수: Object.fromEntries(ELEMENTS.map((e) => [EL_WORD[e], counts[e]])),
    오행요약: { 가장많은: ELEMENTS.filter((e) => counts[e] === max).map((e) => EL_WORD[e]), 없는: ELEMENTS.filter((e) => counts[e] === 0).map((e) => EL_WORD[e]) },
    십성묶음: tally,
    월령: { 월지: BRANCH_KO[mb]!, 대략양력월: MONTH_OF_BRANCH[mb]!, 계절: SEASON_OF[mb]!, 안내: "달력의 달과 절기 달은 다를 수 있다" },
    강약: {
      판정: st.label,
      상태: st.status === "CONDITIONAL" ? "조건부 후보" : "후보",
      득령: { 결과: st.ryeong ? "예" : "아니오", 근거: st.evidence[0]!.replace(/^월령\(득령\) (예|아니오): /, "") },
      득지: { 결과: st.ji ? "예" : "아니오", 근거: st.evidence[1]!.replace(/^일지 뿌리\(득지\) (예|아니오): /, "") },
      득세: { 결과: st.se ? "예" : "아니오", 근거: st.evidence[2]!.replace(/^주변 도움\(득세\) (예|아니오): /, "") },
      한계: "종격 같은 특수 구조와 합충의 변화는 반영하지 않는다",
    },
    균형과필요한기운: {
      상태: "후보(생활 처방용 우선 순위는 임시 규칙)",
      억부관점: need.eokbuNote,
      조후관점: need.johuNote,
      필요한기운: EL_WORD[need.primary],
      우선규칙: need.primaryReason,
      원국내작용: eff.evidence,
      희신: EL_WORD[need.hee],
      기신: EL_WORD[need.gi],
      넘치는기운: excess,
      가장적은기운: need.least.map((e) => EL_WORD[e]),
    },
    구조패턴태그: [],
    원국의합충형파해: dt.natal,
    신살: { 해당: [...byName.entries()].map(([이름, 위치]) => ({ 이름, 위치 })), 십이신살_일지기준: sinsal12 },
    대운: {
      방향: dt.daeun.length ? (computeDaeunForBirth(me)?.forward ? "순행" : "역행") : "",
      첫시작나이: computeDaeunForBirth(me)?.startAge.years ?? 0,
      목록: dt.daeun.map((r) => timeRow(dRow(r))),
      교운기: nextChange ? { 연도: nextChange.year, 나이: nextChange.age, 안내: "바뀌기 전후 1~2년은 환경·마음이 전환되기 쉬운 시기로 본다" } : null,
    },
    향후5년: dt.years.map(timeRow),
    오행상징대응: SYMBOLS,
    해석주의: NOTES,
  };
  packet.구조패턴태그 = buildPatternTags(packet);
  const hc = findHyeonchim(packet);
  if (hc) {
    packet.신살.해당.push({ 이름: "현침살", 위치: hc });
    packet.구조패턴태그.push({ 태그: "현침살", 뜻: "날카롭고 정확한 감각(말·손끝·판단)을 뜻하는 일반 신살", 근거: hc });
    byName.set("현침살", hc);
  }
  return {
    packet,
    tags: packet.구조패턴태그.map((t) => t.태그),
    sinsalNames: [...byName.keys()],
    strengthLabel: st.label,
    years: dt.years.map((y) => y.year!),
    yearNames: dt.years.map((y) => y.name),
    daeunNow: dt.daeunNowName,
    needName: EL_WORD[need.primary],
    hasHour: !!pil.hour,
  };
}

/** AI 에 보낼 JSON 문자열(들여쓰기 없이 짧게) */
export const packetJson = (packet: ChartPacket) => JSON.stringify(packet);
