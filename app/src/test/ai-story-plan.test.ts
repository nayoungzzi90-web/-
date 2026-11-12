import { describe, expect, it } from "vitest";
import { buildChartPacket } from "../lib/saju-packet";
import { concernKeywords, validEvidence, validateSpine, type PlanSection } from "../lib/ai-story-plan";
import { BASIC_SECTIONS, checkStory } from "../lib/ai-story.server";
import { buildStoryFacts } from "../lib/ai-story-facts";
import { buildCoreImage, elementTenGods } from "../lib/saju-material";

const NOW = new Date("2026-11-12T03:00:00Z");
const GOLD = { name: "김나영", calendar: "solar" as const, leap: false, date: "1990-04-19", time: "01:10", gender: "f" as const };
const pk = buildChartPacket(GOLD, NOW)!.packet;
const facts = buildStoryFacts(GOLD, NOW)!;
const sections: PlanSection[] = BASIC_SECTIONS.map((s) => ({ id: s.id, title: s.title, purpose: s.purpose, ...(s.concernMust ? { concernMust: true } : {}) }));
const CONCERN = "사주에 관심이 많아 부업을 하고 있고 사주 사이트를 만들고 싶어요. 돈 벌 수 있을까요?";

describe("재료 보강(검증 사례 1990-04-19 01:10 여성)", () => {
  it("일주 핵심 이미지: 갑인 = 푸른 호랑이, 봄의 큰 나무", () => {
    expect(pk.일주핵심이미지.핵심이미지).toBe("푸른 호랑이, 봄의 큰 나무");
    expect(buildCoreImage(0, 6).핵심이미지).toBe("붉은 말, 여름의 큰 나무");
    expect(pk.일주핵심이미지.사용).toContain("1번 카드");
  });
  it("위치별 의미 메모와 12신살(연지 기준), 지나간 대운(십성 포함), 십성 표기가 패킷에 있다", () => {
    expect(pk.네기둥.find((p) => p.기둥 === "월주")!.위치의미).toContain("사회");
    expect(pk.네기둥.find((p) => p.기둥 === "일주")!.위치의미).toContain("배우자");
    expect(Object.keys(pk.신살.십이신살_연지기준).length).toBeGreaterThan(0);
    expect(pk.대운.지나간대운.length).toBeGreaterThan(0);
    expect(pk.대운.지나간대운.every((t) => !t.지금 && t.천간십성 && t.지지본기십성)).toBe(true);
    expect(pk.균형과필요한기운.십성표기.필요한기운).toBe("식신·상관"); // 갑목 기준 불
    expect(elementTenGods(0, "물")).toBe("편인·정인");
    expect(elementTenGods(0, "쇠")).toBe("편관·정관");
  });
  it("구조 태그: 양팔통·같은 천간 병존·편관 중첩·군비쟁재 주의가 판정된다", () => {
    const t = pk.구조패턴태그.map((x) => x.태그);
    expect(t).toEqual(expect.arrayContaining(["간여지동", "양팔통", "같은 천간 병존", "편관 중첩", "군비쟁재", "식상생재", "재생관", "현침살"]));
    expect(t).not.toContain("음팔통");
  });
});

describe("구상 검증", () => {
  const good = (over: Record<string, unknown> = {}) => ({
    theme: "혼자 길을 열어 온 사람의 이야기", contradiction: "겉으로는 단단하고 속으로는 여려요",
    past: ["어린 시절부터 스스로 길을 찾아야 했어요.", "청년기에는 책임을 먼저 떠안았어요."],
    concern: { conclusion: "부업은 구조와 잘 맞는 바탕이에요", evidence: ["월지 진 편재", "없는근거 월지 정관"], caution: "동업은 조심해요", action: "작게 시작해요", quotes: ["부업", "사주 사이트", "없는말"] },
    cards: sections.map((s, i) => ({ id: s.id, evidence: ["월지 진 편재", "연지 오 상관"], angle: `${s.title}만의 각도`, concernLink: false, concernSentence: "문장", contrast: i < 2 ? "겉속" : "없음", motif: i === 3 ? "같은소재" : i === 4 ? "같은소재" : `${s.title}소재` })),
    ...over,
  });
  it("패킷에 없는 근거는 버리고, 같은 근거는 세 장까지만 쓴다", () => {
    const sp = validateSpine(good(), sections, pk, CONCERN)!;
    expect(sp).not.toBeNull();
    expect(sp.concern!.evidence).toEqual(["월지 진 편재"]);
    const uses = Object.values(sp.cards).filter((c) => c.evidence.includes("월지 진 편재")).length;
    expect(uses).toBeLessThanOrEqual(3);
  });
  it("고민 인용은 고객 글에 있는 말만 남기고, 필수 카드는 고민 연결이 true가 된다", () => {
    const sp = validateSpine(good(), sections, pk, CONCERN)!;
    expect(sp.concern!.quotes).toEqual(expect.arrayContaining(["부업", "사주 사이트"]));
    expect(sp.concern!.quotes).not.toContain("없는말");
    for (const s of sections.filter((x) => x.concernMust)) expect(sp.cards[s.id]!.concernLink).toBe(true);
    expect(sp.cards["love"]!.concernLink).toBe(false);
  });
  it("대비는 전체 3장 이상이 되도록 보정하고, 제목 소재가 겹치면 뒤쪽을 비운다", () => {
    const sp = validateSpine(good(), sections, pk, CONCERN)!;
    expect(Object.values(sp.cards).filter((c) => c.contrast).length).toBeGreaterThanOrEqual(3);
    expect(sp.cards["ilju"]!.motif).toBe("같은소재");
    expect(sp.cards["work"]!.motif).toBe("");
  });
  it("한자·방어 문구가 섞이거나 과거 서사가 두 문장이 아니면 버린다", () => {
    expect(validateSpine(good({ theme: "격국이 강한 사람" }), sections, pk, CONCERN)).toBeNull();
    expect(validateSpine(good({ past: ["한 문장뿐이에요."] }), sections, pk, CONCERN)).toBeNull();
  });
  it("근거 형식 검증: 위치+십성, 대운·세운 이름, 오행 개수만 통과한다", () => {
    expect(validEvidence(pk, "월지 진 편재")).toBe(true);
    expect(validEvidence(pk, "연주 홍염살")).toBe(true);
    expect(validEvidence(pk, "월지 진 정관")).toBe(false);
    expect(validEvidence(pk, "병자 대운")).toBe(true);
    expect(validEvidence(pk, "나무 3개")).toBe(true);
    expect(validEvidence(pk, "그냥 좋아요")).toBe(false);
  });
  it("고민 키워드: 인용이 우선이고 보조 낱말은 불용어를 뺀다", () => {
    const k = concernKeywords(CONCERN, ["부업", "없는말"]);
    expect(k[0]).toBe("부업");
    expect(k).not.toContain("없는말");
    expect(k).toContain("사이트");
  });
});

describe("새 검수(카드 단위)", () => {
  const s = BASIC_SECTIONS[4]!; // 나에게 맞는 일
  const body = (extra = "") => `김나영님은 월지에 자리한 편재가 중심이라 판을 벌여 굴리는 사람이에요. 연주의 상관은 표현이 앞서는 힘이에요.${extra}\n\n결론부터 말하면 부업을 키울 바탕이 있어요. ${"가나다라마바사아자차카타파하".repeat(22)}이에요.`;
  const run = (b: string, o: Record<string, unknown> = {}, sec = s) => checkStory("묵묵히 버텨 온 사람이 끝내 길을 얻는 이야기", b, sec, { ...facts, sinsalNames: ["홍염살"] }, { callName: "김나영", ...o }).map((i) => i.code);
  it("호칭 시작과 위치 근거 2개", () => {
    expect(run(body())).not.toContain("NAME_START");
    expect(run(body().replace("김나영님은", "당신은"))).toContain("NAME_START");
    expect(run(body())).not.toContain("EVIDENCE_FEW");
    expect(run("김나영님은 월지에 자리한 편재가 중심이에요.\n\n결론이에요.")).toContain("EVIDENCE_FEW");
  });
  it("패킷에 없는 십성·간지는 말하지 못한다", () => {
    // 십성이 비견뿐인 패킷으로 검수하면 다른 십성 언급은 막힌다
    const thin = { ...pk, 네기둥: pk.네기둥.map((p) => ({ ...p, 천간: { ...p.천간, 십성: "비견" }, 지지: { ...p.지지, 본기십성: "비견", 지장간: [] } })), 대운: { ...pk.대운, 목록: [] }, 향후5년: [] };
    const chk = (b: string) => checkStory("묵묵히 버텨 온 사람이 끝내 길을 얻는 이야기", b, s, { ...facts, packet: thin, sinsalNames: ["홍염살"] }, { callName: "김나영" }).map((i) => i.code);
    expect(chk(body(" 정재도 있어요."))).toContain("TENGOD_UNKNOWN");
    expect(run(body())).not.toContain("TENGOD_UNKNOWN");
    expect(run(body(" 무술년에는 변화가 커요."))).toContain("GANJI_UNKNOWN");
    expect(run(body(" 병오년에는 변화가 커요."))).not.toContain("GANJI_UNKNOWN");
  });
  it("일주 핵심 이미지는 1번 카드에서만 쓴다", () => {
    expect(run(body(" 푸른 호랑이 같은 사람이에요."))).toContain("CORE_IMAGE_REUSE");
    expect(run(body(), {}, BASIC_SECTIONS[0]!)).toContain("CORE_IMAGE_MISSING");
    expect(run(body(" 푸른 호랑이 같은 사람이에요."), {}, BASIC_SECTIONS[0]!)).not.toContain("CORE_IMAGE_MISSING");
  });
  it("고민 키워드·대비·단정 제한", () => {
    expect(run(body(), { concernKeys: ["부업"] })).not.toContain("CONCERN_MISSING");
    expect(run(body(), { concernKeys: ["사이트"] })).toContain("CONCERN_MISSING");
    expect(run(body(), { plan: { contrast: "겉속" } })).toContain("CONTRAST_MISSING");
    expect(run(body(" 겉으로는 단단하고 속으로는 여려요."), { plan: { contrast: "겉속" } })).not.toContain("CONTRAST_MISSING");
    expect(run(body(" 잘될 수 있어요. 힘들 수도 있어요."))).toContain("HEDGE_LIMIT");
    expect(run(body(" 수익이 보장돼요."))).toContain("OVERCLAIM");
  });
  it("문단 수 상한과 직무 나열 문단", () => {
    expect(run(`${body()}\n\n세 번째 문단이에요.`)).toContain("MANY_PARAGRAPHS");
    expect(run(body().replace("결론부터 말하면 부업을 키울 바탕이 있어요.", "서비스 기획자, 프로젝트 관리자, 사업 개발 담당자가 어울려요."))).toContain("JOB_LIST");
  });
});

describe("고민 직답 분담", () => {
  const sp = validateSpine({
    theme: "혼자 길을 열어 온 사람의 이야기", contradiction: "겉으로는 단단하고 속으로는 여려요", past: ["어린 시절 이야기예요.", "청년기 이야기예요."],
    concern: { conclusion: "부업은 잘 맞는 바탕이에요", evidence: ["월지 진 편재"], caution: "동업 비용을 흐리지 않는 것이에요", action: "소규모 유료 상담부터 시작해요", quotes: ["부업"] },
    cards: sections.map((s) => ({ id: s.id, evidence: [], angle: `${s.title}각도`, concernLink: true, concernSentence: `${s.title} 연결`, contrast: "없음", motif: `${s.title}소재` })),
  }, sections, pk, CONCERN)!;
  it("결론·시작 방법은 일 카드, 조심할 점은 재물 카드, 시기는 흐름 카드가 맡고 나머지는 연결 문장만 받는다", async () => {
    const { spineBlockFor } = await import("../lib/ai-story-plan");
    const blk = (id: string) => spineBlockFor(sp, id, sections);
    expect(blk("work")).toContain("부업은 잘 맞는 바탕이에요");
    expect(blk("work")).toContain("소규모 유료 상담부터 시작해요");
    expect(blk("money")).toContain("동업 비용을 흐리지 않는 것이에요");
    expect(blk("money")).not.toContain("부업은 잘 맞는 바탕이에요");
    expect(blk("flow")).toContain("실행하기 좋은 시기");
    for (const id of ["summary", "elements", "ilju"]) {
      expect(blk(id)).not.toContain("부업은 잘 맞는 바탕이에요");
      expect(blk(id)).not.toContain("소규모 유료 상담부터 시작해요");
      expect(blk(id)).toContain("되풀이하지 않는다");
    }
  });
});

describe("고객 단어 분배·유보 표현", () => {
  it("고민 연결 카드마다 서로 다른 단어를 인용하게 나눠 준다", async () => {
    const { assignedQuotes } = await import("../lib/ai-story-plan");
    const sp = validateSpine({
      theme: "혼자 길을 열어 온 사람의 이야기", contradiction: "겉으로는 단단하고 속으로는 여려요", past: ["어린 시절 이야기예요.", "청년기 이야기예요."],
      concern: { conclusion: "부업은 잘 맞아요", evidence: [], caution: "동업이에요", action: "작게 시작해요", quotes: ["부업", "사주 사이트", "돈 벌 수 있을까요"] },
      cards: sections.map((s) => ({ id: s.id, evidence: [], angle: `${s.title}각도`, concernLink: !!s.concernMust, concernSentence: "연결", contrast: "없음", motif: `${s.title}소재` })),
    }, sections, pk, CONCERN)!;
    const picks = sections.filter((s) => s.concernMust).map((s) => assignedQuotes(sp, s.id, sections)[0]);
    expect(new Set(picks).size).toBeGreaterThanOrEqual(3);
    expect(picks.every((p) => p && p.length > 0)).toBe(true);
  });
  it("기본 카드 본문에 후보·임시·잠정 같은 유보 표현이 있으면 막는다", () => {
    const s = BASIC_SECTIONS[2]!;
    const body = `김나영님은 월지에 자리한 편재가 중심이에요. 연주의 상관도 있어요. 필요한 불은 후보 판정이에요.\n\n결론이에요. ${"가나다라마바사아자차카타파하".repeat(22)}이에요.`;
    const codes = checkStory("묵묵히 버텨 온 사람이 끝내 길을 얻는 이야기", body, s, { ...facts, sinsalNames: [] }, { callName: "김나영" }).map((i) => i.code);
    expect(codes).toContain("META_PHRASE");
  });
});
