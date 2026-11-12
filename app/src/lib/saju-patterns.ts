// 구조 패턴 태그 — 원국의 십성 배치에서 일반 명리 이론대로 읽을 수 있는 구조를 코드가 판정한다.
//
// · 엔진 값(JSON 패킷의 네 기둥·십성)만 읽고 새로 계산하지 않는다. AI 는 여기에 태그가 있을 때만 해당 구조를 말한다.
// · 일반 명리 입문서 수준의 단순 판정이며 원문 규칙(R-005·R-010 등)의 구현이 아니다. 전문가 검증 전이고,
//   점수·가중치 없이 "위치를 세어 조건을 만족하는가"만 본다. 판정 기준은 PATTERN_CRITERIA 에 그대로 적어 둔다.
// · 세는 자리: 일간을 뺀 천간(연간·월간·시간)과 지지 본기(연지·월지·일지·시지). 지장간의 중기·여기는 세지 않는다.
//   출생 시간을 모르면 시간·시지는 없다.
// · 인접: 같은 기둥이거나 이웃한 기둥(연-월, 월-일, 일-시). 한 기둥 건너면 인접하지 않는다.
import type { ChartPacket } from "./saju-packet";

export interface PatternTag {
  태그: string;
  뜻: string; // 글에 쉬운 말로 풀어 쓸 수 있는 한 줄
  근거: string[]; // 어느 자리의 어떤 십성인지
}

type Group = "비겁" | "식상" | "재성" | "관성" | "인성";
const GROUP_OF: Record<string, Group> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};
interface Slot { 자리: string; 십성: string; 묶음: Group; 기둥: number }

export const PATTERN_CRITERIA: { 태그: string; 기준: string }[] = [
  { 태그: "간여지동", 기준: "일주의 천간과 지지 본기가 같은 오행(갑인·을묘·병오·정사·무진·무술·기축·기미·경신·신유·임자·계해)" },
  { 태그: "비겁 과다", 기준: "비겁(비견·겁재)이 세는 자리(최대 7곳) 중 3곳 이상" },
  { 태그: "식상 과다", 기준: "식상(식신·상관)이 3곳 이상" },
  { 태그: "재성 과다", 기준: "재성(편재·정재)이 3곳 이상" },
  { 태그: "관성 과다", 기준: "관성(편관·정관)이 3곳 이상" },
  { 태그: "인성 과다", 기준: "인성(편인·정인)이 3곳 이상" },
  { 태그: "군비쟁재", 기준: "재성이 1~2곳 있고, 비겁이 3곳 이상이거나(비겁이 2곳이고 일간 강약 판정이 신강·신강 경향)일 때 '군비쟁재 주의'. 재성이 없거나 3곳 이상이면 해당 없음. 식상이 있으면 근거에 '통관 역할 가능'을 덧붙이고 태그는 유지" },
  { 태그: "식상생재", 기준: "식상과 재성이 서로 인접한 자리에 있음(같은 기둥 또는 이웃 기둥)" },
  { 태그: "관인상생", 기준: "정관과 인성(편인·정인)이 서로 인접한 자리에 있음" },
  { 태그: "살인상생", 기준: "편관과 인성(편인·정인)이 서로 인접한 자리에 있음(압박이 배움·보호로 풀리는 구조)" },
  { 태그: "편관 중첩", 기준: "편관이 세는 자리 중 2곳 이상" },
  { 태그: "정관 중첩", 기준: "정관이 세는 자리 중 2곳 이상" },
  { 태그: "같은 천간 병존", 기준: "연간·월간·일간·시간 네 천간 가운데 같은 글자가 2개 이상(예: 경·경)" },
  { 태그: "양팔통", 기준: "여덟 글자(시주까지 있을 때) 모두 양의 글자(천간 갑병무경임, 지지 자인진오신술)" },
  { 태그: "음팔통", 기준: "여덟 글자(시주까지 있을 때) 모두 음의 글자(천간 을정기신계, 지지 축묘사미유해)" },
  { 태그: "재생관", 기준: "재성과 관성이 서로 인접한 자리에 있음(재물·현실의 힘이 직책·책임으로 이어지는 흐름)" },
  { 태그: "현침살", 기준: "신살 일반 표: 원국 글자 중 천간 갑·신, 지지 묘·오·미·신에 해당하는 글자가 3개 이상(출생 시간을 모르면 시주 제외). 책마다 기준이 달라 일반적으로 쓰이는 형태로 정했다" },
  { 태그: "관살혼잡", 기준: "편관과 정관이 모두 있음(위치 무관)" },
  { 태그: "상관견관", 기준: "상관과 정관이 서로 인접한 자리에 있음" },
  { 태그: "식신제살", 기준: "식신과 편관이 서로 인접한 자리에 있음" },
];

const SAME_ELEMENT_DAY = new Set(["갑인", "을묘", "병오", "정사", "무진", "무술", "기축", "기미", "경신", "신유", "임자", "계해"]);
const ORDER = ["연주", "월주", "일주", "시주"] as const;

export function buildPatternTags(packet: ChartPacket): PatternTag[] {
  const slots: Slot[] = [];
  packet.네기둥.forEach((p) => {
    const idx = ORDER.indexOf(p.기둥);
    const pre = p.기둥[0]!;
    if (p.기둥 !== "일주") slots.push({ 자리: `${pre}간`, 십성: p.천간.십성, 묶음: GROUP_OF[p.천간.십성]!, 기둥: idx });
    slots.push({ 자리: `${pre}지`, 십성: p.지지.본기십성, 묶음: GROUP_OF[p.지지.본기십성]!, 기둥: idx });
  });
  const of = (g: Group) => slots.filter((s) => s.묶음 === g);
  const label = (s: Slot) => `${s.자리} ${s.십성}`;
  const near = (a: Slot, b: Slot) => a !== b && Math.abs(a.기둥 - b.기둥) <= 1;
  const pairs = (a: Slot[], b: Slot[]) => a.flatMap((x) => b.filter((y) => near(x, y)).map((y) => `${label(x)} — ${label(y)}`));
  const out: PatternTag[] = [];
  const add = (태그: string, 뜻: string, 근거: string[]) => out.push({ 태그, 뜻, 근거 });

  const day = packet.네기둥.find((p) => p.기둥 === "일주");
  if (day && SAME_ELEMENT_DAY.has(day.간지)) add("간여지동", "일간과 일지가 같은 오행이라 자기 힘이 한 줄로 이어진 구조", [`일주 ${day.간지}`]);

  const over: [Group, string, string][] = [
    ["비겁", "비겁 과다", "나와 같은 기운(내 편·경쟁자)이 많아 자기주장과 주도권 의식이 강한 구조"],
    ["식상", "식상 과다", "표현하고 쏟아내는 기운이 많아 말·재능·움직임이 넘치는 구조"],
    ["재성", "재성 과다", "재물·현실·관리의 기운이 많아 챙길 것이 많은 구조"],
    ["관성", "관성 과다", "책임·규칙·압박의 기운이 많아 스스로 짊어지는 것이 많은 구조"],
    ["인성", "인성 과다", "배움·보호·생각의 기운이 많아 생각이 깊고 행동이 늦어지기 쉬운 구조"],
  ];
  for (const [g, name, mean] of over) if (of(g).length >= 3) add(name, mean, of(g).map(label));

  const strong = packet.강약.판정.startsWith("신강");
  if (of("재성").length >= 1 && of("재성").length <= 2 && (of("비겁").length >= 3 || (of("비겁").length >= 2 && strong))) {
    const 통관 = of("식상").length ? ["식상이 있어 비겁의 힘을 재성으로 이어 주는 통관 역할 가능: " + of("식상").map(label).join(", ")] : [];
    add("군비쟁재", "내 편이 많은데 재물 자리는 적어, 같은 것을 두고 주도권을 다투기 쉬운 구조", [...of("비겁").map(label), ...of("재성").map(label), ...통관]);
  }
  const sg = pairs(of("식상"), of("재성"));
  if (sg.length) add("식상생재", "재능과 표현이 재물·성과로 이어지는 흐름의 구조", sg);
  const jg2 = pairs(of("재성"), of("관성"));
  if (jg2.length) add("재생관", "재물·현실의 힘이 직책과 책임으로 이어져 자리를 얻어 가는 흐름의 구조", jg2);
  const jgs = of("관성").filter((s) => s.십성 === "정관");
  const pgs = of("관성").filter((s) => s.십성 === "편관");
  const gi = pairs(jgs, of("인성"));
  if (gi.length) add("관인상생", "책임과 규칙이 배움·보호로 이어져 자리를 잡아 가는 구조", gi);
  const si = pairs(pgs, of("인성"));
  if (si.length) add("살인상생", "강한 압박(편관)이 배움·보호(인성)로 풀려 오히려 힘이 되는 구조", si);
  if (pgs.length >= 2) add("편관 중첩", "편관이 겹쳐 책임과 압박을 크게 짊어지는 구조", pgs.map(label));
  if (jgs.length >= 2) add("정관 중첩", "정관이 겹쳐 규칙과 체면의 무게가 큰 구조", jgs.map(label));
  const pg = pgs, jg = jgs;
  if (pg.length && jg.length) add("관살혼잡", "편관과 정관이 함께 있어 요구와 책임이 여러 갈래로 오는 구조", [...pg, ...jg].map(label));
  const sk = pairs(of("식상").filter((s) => s.십성 === "상관"), jg);
  if (sk.length) add("상관견관", "상관과 정관이 맞닿아 규칙·권위에 대한 반발심이 생기기 쉬운 구조", sk);
  const ss = pairs(of("식상").filter((s) => s.십성 === "식신"), pg);
  if (ss.length) add("식신제살", "식신이 편관 곁에서 압박을 다스리는 구조", ss);
  // 같은 천간 병존 / 양팔통·음팔통
  const stems = packet.네기둥.map((p) => ({ 기둥: p.기둥, 글자: p.간지[0]! }));
  const seen = new Map<string, string[]>();
  for (const x of stems) seen.set(x.글자, [...(seen.get(x.글자) ?? []), `${x.기둥[0]}간`]);
  const dup = [...seen.entries()].filter(([, v]) => v.length >= 2);
  if (dup.length) add("같은 천간 병존", "같은 천간이 나란히 있어 그 기운이 겹쳐 힘이 세지는 구조", dup.map(([g, v]) => `${v.join("·")} ${g}`));
  if (packet.네기둥.length === 4) {
    const chars = packet.네기둥.flatMap((p) => [p.간지[0]!, p.간지[1]!]);
    const yang = chars.map((c, i) => (i % 2 === 0 ? STEMS.indexOf(c) % 2 === 0 : BRANCHES.indexOf(c) % 2 === 0));
    if (yang.every(Boolean)) add("양팔통", "여덟 글자가 모두 양이라 추진력과 직선적인 기운이 강한 구조", packet.네기둥.map((p) => p.간지));
    if (yang.every((v) => !v)) add("음팔통", "여덟 글자가 모두 음이라 섬세하고 안으로 모으는 기운이 강한 구조", packet.네기둥.map((p) => p.간지));
  }
  return out;
}

const STEMS = "갑을병정무기경신임계";
const BRANCHES = "자축인묘진사오미신유술해";
const HYEONCHIM_STEM = new Set(["갑", "신"]);
const HYEONCHIM_BRANCH = new Set(["묘", "오", "미", "신"]);
/** 현침살(신살 일반 표). 해당하면 위치 목록, 아니면 null. 엔진(sinsal.ts)은 건드리지 않고 이 파일에서만 판정한다. */
export function findHyeonchim(packet: ChartPacket): string[] | null {
  const hits: string[] = [];
  for (const p of packet.네기둥) {
    const pre = p.기둥[0]!;
    if (HYEONCHIM_STEM.has(p.간지[0]!)) hits.push(`${pre}간 ${p.간지[0]}`);
    if (HYEONCHIM_BRANCH.has(p.간지[1]!)) hits.push(`${pre}지 ${p.간지[1]}`);
  }
  return hits.length >= 3 ? hits : null;
}
