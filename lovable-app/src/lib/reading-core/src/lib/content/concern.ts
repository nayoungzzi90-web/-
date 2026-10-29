// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import { GOD_LOVE, GOD_TRAIT, POS_BRANCH, analyzeChart, analyzeLove, bko } from '../report/analysis';
import { BRANCH_ELEMENT, STEM_ELEMENT, branchRelation } from '../saju/rules';
import type { Element, SajuFacts, Stem } from '../saju/types';
import { FRIEND, HOST } from './chat';

/** 고민 상담/상황극/팀 케미: 전부 규칙 기반이다. 자유 입력은 키워드로 분류만 하고, 내용은 저장·전송하지 않는다. */
export type Category = 'love' | 'career' | 'money' | 'people' | 'self' | 'study';
export interface Line { who: Element | 'mine'; text: string }

export const CATEGORIES: { id: Category; label: string; emoji: string; lead: Element; words: string[] }[] = [
  { id: 'love', label: '연애·인연', emoji: '💘', lead: 'fire', words: ['연애', '썸', '헤어', '이별', '짝사랑', '남친', '여친', '남자친구', '여자친구', '소개팅', '결혼', '재회', '고백', '애인', '솔로', '인연'] },
  { id: 'career', label: '일·진로', emoji: '💼', lead: 'metal', words: ['이직', '퇴사', '회사', '직장', '상사', '취업', '면접', '진로', '커리어', '일이', '번아웃', '승진', '창업', '사업'] },
  { id: 'money', label: '돈·재물', emoji: '💰', lead: 'earth', words: ['돈', '월급', '재테크', '투자', '저축', '빚', '대출', '집', '부동산', '수입', '지출', '적금'] },
  { id: 'people', label: '사람·관계', emoji: '🤝', lead: 'wood', words: ['친구', '가족', '엄마', '아빠', '부모', '동료', '인간관계', '싸움', '갈등', '오해', '시댁', '형제', '자매'] },
  { id: 'self', label: '내 마음', emoji: '🫧', lead: 'water', words: ['우울', '불안', '무기력', '외로', '자신감', '자존감', '스트레스', '지쳐', '힘들', '미래', '막막', '걱정'] },
  { id: 'study', label: '공부·시험', emoji: '📚', lead: 'wood', words: ['공부', '시험', '수능', '자격증', '합격', '학교', '대학', '성적', '고시', '공시'] },
];

/** 위기 신호: 사주 이야기를 멈추고 도움을 안내한다 */
const CRISIS = ['죽고 싶', '죽고싶', '자살', '사라지고 싶', '사라지고싶', '살기 싫', '살기싫', '끝내고 싶', '목숨'];
export const isCrisis = (t: string) => CRISIS.some((w) => t.replace(/\s+/g, ' ').includes(w) || t.replace(/\s/g, '').includes(w.replace(/\s/g, '')));
export const CRISIS_LINES = [
  '잠깐, 방금 한 말이 마음에 걸려. 지금은 사주 이야기보다 네가 안전한 게 제일 중요해.',
  '혼자 견디지 말고 지금 바로 도움을 받아 줘. 자살예방상담전화 109(24시간), 정신건강위기상담 1577-0199로 연결할 수 있어. 위급하면 112·119도 괜찮아.',
  '가까운 사람에게 지금 마음을 한마디만 보내 보는 것도 좋아. 나는 여기 있을게.',
];

/** 키워드 분류. 가장 많이 겹친 범주 하나(동률이면 목록 순서), 없으면 null */
export function classifyConcern(text: string): Category | null {
  const t = text.replace(/\s+/g, '');
  let best: Category | null = null, bestN = 0;
  for (const c of CATEGORIES) {
    const n = c.words.filter((w) => t.includes(w.replace(/\s+/g, ''))).length;
    if (n > bestN) { best = c.id; bestN = n; }
  }
  return best;
}

export const CONTEXTS: Record<Category, { id: string; label: string }[]> = {
  love: [{ id: 'some', label: '썸 타는 중' }, { id: 'dating', label: '연애 중' }, { id: 'breakup', label: '헤어졌어' }, { id: 'solo', label: '솔로 오래됐어' }],
  career: [{ id: 'move', label: '이직 고민' }, { id: 'burnout', label: '지치고 번아웃' }, { id: 'path', label: '진로를 못 정했어' }, { id: 'people', label: '직장 사람이 힘들어' }],
  money: [{ id: 'save', label: '모으기가 어려워' }, { id: 'spend', label: '큰 지출을 앞뒀어' }, { id: 'earn', label: '수입을 늘리고 싶어' }, { id: 'worry', label: '돈 걱정이 커' }],
  people: [{ id: 'family', label: '가족' }, { id: 'friend', label: '친구' }, { id: 'work', label: '직장·학교 사람' }, { id: 'conflict', label: '오해·갈등이 생겼어' }],
  self: [{ id: 'conf', label: '자신감이 없어' }, { id: 'burn', label: '무기력해' }, { id: 'lonely', label: '외로워' }, { id: 'future', label: '앞날이 막막해' }],
  study: [{ id: 'exam', label: '시험이 코앞이야' }, { id: 'focus', label: '집중이 안 돼' }, { id: 'choice', label: '전공·진로 선택' }, { id: 'slump', label: '슬럼프야' }],
};

const CONTEXT_LINE: Record<Category, Record<string, string>> = {
  love: {
    some: '썸일 땐 상대 마음을 캐묻기보다 내 속도를 먼저 정하는 게 좋아. 이번 주에 "내가 편한 만남 방식" 한 가지만 정해 봐.',
    dating: '연애 중이라면 큰 이벤트보다 작은 약속을 지키는 게 오래가. 서운한 건 쌓지 말고 "나는 이럴 때 서운해" 한 문장으로 말해 보자.',
    breakup: '헤어진 직후엔 결론을 내리지 않아도 돼. 충분히 아파하고, 당분간 큰 결정(연락·재회)은 미뤄 두자. 시간이 지나면 보이는 게 달라져.',
    solo: '솔로가 길어졌다고 문제가 있는 게 아니야. 새로운 장소·모임에 한 달에 한 번만 나가 보는 걸 목표로 해 볼까?',
  },
  career: {
    move: '이직은 "싫은 것"과 "원하는 것"을 따로 적어 보면 선명해져. 사주는 방향의 힌트일 뿐, 조건 비교는 현실 정보로 하자.',
    burnout: '번아웃엔 의욕 쥐어짜기보다 회복이 먼저야. 오늘 끝낼 일을 반으로 줄이고, 잠부터 지켜 봐.',
    path: '진로가 안 정해질 땐 직업 이름보다 "하루 중 시간 가는 줄 모르는 순간"을 3개 적어 봐. 거기에 단서가 있어.',
    people: '사람 때문에 힘든 건 능력 문제가 아니야. 기록을 남기고, 믿을 만한 사람이나 공식 창구에 상의하는 것도 방법이야.',
  },
  money: {
    save: '모으기가 어려울 땐 의지력보다 구조가 답이야. 월급날 자동이체로 "먼저 떼어 놓기" 하나만 해 봐.',
    spend: '큰 지출 앞에선 24시간 룰! 하루 지나도 마음이 같으면 그때 결정해. 투자·대출 판단은 사주가 아니라 재무 정보와 전문가 상담으로 해야 해.',
    earn: '수입을 늘리려면 가진 재능 하나를 "작게 팔아 보는" 실험이 좋아. 한 달짜리 작은 시도부터!',
    worry: '돈 걱정이 클수록 숫자를 눈에 보이게 적는 게 도움 돼. 막막하면 공공 금융상담(서민금융진흥원 등)도 알아봐.',
  },
  people: {
    family: '가족일수록 말이 쉽게 거칠어지지. 결론보다 "그때 내 기분은 이랬어"를 먼저 말해 보자.',
    friend: '친구 사이는 거리 조절이 핵심이야. 서운함은 쌓이기 전에 가볍게 한 번 꺼내 봐.',
    work: '직장·학교 사람과는 감정보다 사실 위주로 기록하고 소통해 봐. 선을 긋는 건 이기적인 게 아니야.',
    conflict: '오해는 시간이 지날수록 커져. "내가 이렇게 이해했는데 맞아?" 한 줄로 확인하는 게 제일 빨라.',
  },
  self: {
    conf: '자신감은 큰 성공보다 작은 약속을 지킬 때 쌓여. 오늘 5분짜리 약속 하나만 나와 해 보자.',
    burn: '무기력은 쉬어도 쉬어지지 않는 피로일 수 있어. 햇빛 쬐며 10분 걷기부터, 오래 지속되면 전문가 상담을 꼭 받아 봐.',
    lonely: '외로움은 "사람 수"가 아니라 "마음이 닿는 순간"의 문제일 때가 많아. 안부 한 줄을 오늘 보내 볼까?',
    future: '앞날이 막막할 땐 1년 계획 말고 "이번 주 할 일 3개"만 정해 봐. 작은 걸음이 안개를 걷어 줘.',
  },
  study: {
    exam: '시험 직전엔 새로운 걸 늘리기보다 아는 걸 확실히 하는 게 이득이야. 수면 시간은 줄이지 말기!',
    focus: '집중이 안 될 땐 25분 공부+5분 휴식을 반복해 봐. 폰은 다른 방에 두기!',
    choice: '선택 앞에선 "후회 최소화"로 보자. 해보고 안 맞으면 바꿀 수 있는 선택인지 먼저 따져 봐.',
    slump: '슬럼프는 열심히 해 온 사람에게 오는 신호일 수 있어. 목표를 반으로 줄이고 리듬부터 되찾자.',
  },
};

const lvl = (n: number) => (n >= 3 ? 'high' : n === 0 ? 'none' : 'mid') as 'high' | 'mid' | 'none';

/** 사주 근거 + 상황별 조언을 친구들의 대사로 만든다. 모든 문장은 '경향'으로 쓰고 단정하지 않는다. */
export function buildReading(cat: Category, ctx: string | undefined, f: SajuFacts): Line[] {
  const A = analyzeChart(f);
  const g = A.groupScore;
  const lead = CATEGORIES.find((c) => c.id === cat)!.lead;
  const out: Line[] = [];
  if (cat === 'love') {
    const L = analyzeLove(f);
    out.push({ who: lead, text: `네 일지(배우자궁 자리)에는 ${bko(L.palaceBranch)}가 앉아 있고, 십성은 ${L.palaceGod}이야. 관계에서 ${GOD_LOVE[L.palaceGod]}.` });
    const star = g.재성 + g.관성;
    out.push({ who: HOST, text: { high: '인연의 별(재성·관성)이 풍성한 편이야. 마음 가는 곳이 여럿일 수 있으니 선택 기준을 먼저 적어 두면 편해.', mid: '인연의 별이 적당히 있어. 천천히 알아가며 깊어지는 편이라고 볼 수 있어.', none: '원국에서 인연의 별이 조용한 편이야. 기다리기보다 활동 반경을 넓힐 때 문이 열리는 타입에 가까워.' }[lvl(star)] });
    if (L.palaceRelations.length) {
      const r = L.palaceRelations[0];
      out.push({ who: 'water', text: r[1] === '충' ? `일지와 ${POS_BRANCH[r[0]]}가 서로 부딪히는 모양이야. 가까운 사이에서 의견이 엇갈리기 쉬우니 대화 규칙을 미리 정해 두면 좋아.` : `일지와 ${POS_BRANCH[r[0]]}가 손을 잡는 모양이야. 마음을 열면 깊이 이어지는 편이야.` });
    }
  } else if (cat === 'career') {
    out.push({ who: lead, text: `일터를 뜻하는 월주의 십성은 ${A.monthGod}이야. 그래서 일에서 ${GOD_TRAIT[A.monthGod]}이 두드러지는 편이야.` });
    out.push({ who: 'fire', text: { high: '책임·규칙의 힘(관성)이 커서 맡은 일을 해내지만, 무거운 짐이 되기도 해. 쉬는 시간을 일정에 먼저 넣자.', mid: '책임과 자율이 적당히 섞여 있어. 역할이 분명할수록 편한 타입이야.', none: '조직의 틀(관성)이 약한 편이라 자기 방식으로 일할 때 힘이 나. 자율성 있는 환경이 맞을 수 있어.' }[lvl(g.관성)] });
    out.push({ who: 'water', text: { high: '표현과 아이디어(식상)가 넘쳐서 새로운 걸 만들 때 신이 나. 결과를 마무리하는 습관만 더하면 날개야.', mid: '표현과 실행이 균형 잡혀 있어.', none: '표현 쪽(식상)은 조용해서 속으로 오래 생각하는 편이야. 글로 먼저 정리해 보면 힘이 나와.' }[lvl(g.식상)] });
  } else if (cat === 'money') {
    out.push({ who: lead, text: { high: '현실·재물을 다루는 힘(재성)이 큰 편이야. 기회도 보이고 쓸 곳도 보여서, 모으기보다 "새는 곳 관리"가 포인트야.', mid: '재물 감각이 무난하게 있어. 꾸준히 쌓는 방식이 잘 맞아.', none: '원국에 재성이 조용해서 돈을 쫓기보다 재능·신뢰로 벌어 오는 길이 맞을 수 있어. 구조(자동이체)로 보완하자.' }[lvl(g.재성)] });
    out.push({ who: 'metal', text: { high: '나와 같은 편(비겁) 에너지가 강해서 친구·동료에게 쓰는 돈이 커지기 쉬워. 나눠 쓰는 금액은 미리 정해 두자.', mid: '주변과 나누는 마음과 내 몫의 균형이 괜찮아.', none: '비겁이 적어서 혼자 감당하는 편이야. 필요할 땐 도움을 요청해도 괜찮아.' }[lvl(g.비겁)] });
  } else if (cat === 'people') {
    out.push({ who: lead, text: { high: '나와 같은 편(비겁)이 강해서 자기 기준이 분명해. 그래서 의견이 부딪힐 때 양보가 어렵게 느껴질 수 있어.', mid: '자기 기준과 배려가 적당히 섞여 있어.', none: '비겁이 적어서 남에게 맞추다 지칠 수 있어. "싫어"를 부드럽게 연습해 보자.' }[lvl(g.비겁)] });
    out.push({ who: 'earth', text: { high: '인성(보호·정서)이 풍부해서 사람의 마음을 잘 받아줘. 대신 받아주다 지치지 않게 거리를 챙겨 줘.', mid: '정서적 지지와 독립이 균형을 이뤄.', none: '인성이 적어 도움을 청하는 게 서툴 수 있어. 기대는 연습도 힘이야.' }[lvl(g.인성)] });
  } else if (cat === 'self') {
    const weak = A.missing[0] ?? A.weak[0];
    out.push({ who: lead, text: weak ? `네 사주엔 ${FRIEND[weak].short}(${{ wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' }[weak]}) 친구가 적은 편이야. 그 친구의 일을 일부러 챙기면 마음이 균형을 찾는 데 도움이 돼.` : '다섯 친구가 비교적 고르게 모였어. 그만큼 상황 따라 여러 얼굴이 나올 수 있어.' });
    if (weak) out.push({ who: weak, text: { wood: '나는 새로 시작하는 힘이야. 산책하거나 작은 새 취미를 시작해 줘!', fire: '나는 따뜻함과 표현이야. 좋아하는 사람과 웃는 시간을 늘려 줘!', earth: '나는 중심 잡기야. 규칙적인 식사·수면 루틴이 나를 도와줘.', metal: '나는 정리와 마무리야. 책상 하나만 치워도 마음이 또렷해져.', water: '나는 쉼과 흐름이야. 아무것도 안 하는 시간을 허락해 줘.' }[weak] });
    out.push({ who: 'mine', text: '마음이 많이 힘든 날이 오래가면, 사주보다 전문가 상담이 먼저야. 그건 약한 게 아니라 똑똑한 선택이야.' });
  } else {
    out.push({ who: lead, text: { high: '배움·정서를 받쳐 주는 힘(인성)이 커서 공부의 바탕이 든든해. 다만 계획만 세우다 시작을 미룰 수 있으니 오늘 10분부터!', mid: '배움의 힘이 적당해. 꾸준한 루틴이 가장 잘 맞아.', none: '인성이 적어서 혼자 파고들기보다 함께 공부하거나 설명을 들을 때 효과가 클 수 있어.' }[lvl(g.인성)] });
    out.push({ who: 'fire', text: { high: '아는 것을 꺼내는 힘(식상)이 강해. 누군가에게 설명하며 공부해 보자.', mid: '입력과 출력이 균형 잡혀 있어.', none: '출력(식상)이 조용한 편이라 요약 노트·말로 정리하기를 습관으로 만들면 좋아.' }[lvl(g.식상)] });
  }
  out.push({ who: 'mine', text: (ctx && CONTEXT_LINE[cat][ctx]) || '' });
  return out.filter((l) => l.text);
}

// ── 팀 케미: 사주 네 기둥을 한 팀으로 보고, 실제 합·충 관계를 이야기로 푼다 ──
const ROLE = { year: '뿌리(가족·배경) 자리', month: '일터(사회) 자리', day: '나 자리', hour: '꿈(미래) 자리' } as const;
const STEM_COMBINE: [string, string][] = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
export function teamStory(f: SajuFacts): Line[] {
  const pos = (['year', 'month', 'day', 'hour'] as const).filter((p) => f.pillars[p]);
  const nameOf = (p: (typeof pos)[number]) => (p === 'day' ? '나(일간)' : `${FRIEND[STEM_ELEMENT[f.pillars[p]![0] as Stem]].short}`);
  const out: Line[] = [{ who: HOST, text: `네 사주는 ${pos.length}명이 앉은 팀이야! ${pos.map((p) => `${ROLE[p]}엔 ${nameOf(p)}`).join(', ')}.` }];
  const events: Line[] = [];
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
    const a = pos[i], b = pos[j], pa = f.pillars[a]!, pb = f.pillars[b]!;
    const w = (e: Stem) => FRIEND[STEM_ELEMENT[e]].short;
    if (STEM_COMBINE.some(([x, y]) => (x === pa[0] && y === pb[0]) || (y === pa[0] && x === pb[0]))) events.push({ who: STEM_ELEMENT[pa[0] as Stem], text: `${ROLE[a]}의 ${w(pa[0] as Stem)}와 ${ROLE[b]}의 ${w(pb[0] as Stem)}가 손을 꼭 잡았어! 이 두 자리는 서로 끌리고 힘을 모으는 모양이야.` });
    const r = branchRelation(pa[1] as never, pb[1] as never);
    const ea = BRANCH_ELEMENT[pa[1] as never] as Element, eb = BRANCH_ELEMENT[pb[1] as never] as Element;
    if (r === '충') events.push({ who: ea, text: `${ROLE[a]}와 ${ROLE[b]}가 티격태격! (${pa[1]}${pb[1]}충) 두 영역 사이에 긴장이 있어서, 이쪽 문제는 일찍 대화로 풀수록 좋아. ${FRIEND[eb].short}가 중재하러 달려갔어.` });
    if (r === '육합') events.push({ who: ea, text: `${ROLE[a]}와 ${ROLE[b]}가 눈이 마주쳐 방긋! (${pa[1]}${pb[1]}합) 두 영역이 서로 보듬는 모양이야.` });
  }
  out.push(...(events.length ? events.slice(0, 3) : [{ who: HOST, text: '이 팀은 큰 다툼도, 큰 의기투합도 없는 잔잔한 모임이야. 상황에 따라 유연하게 움직이는 편이래.' } as Line]));
  out.push({ who: 'mine', text: '합이나 충은 "있다/없다"가 아니라 영역마다 힘을 주는지 긴장을 주는지를 보는 힌트야. 실제 삶은 그보다 훨씬 다양해!' });
  return out;
}

// ── 상황극: 고른 행동 스타일과 사주 속 오행을 비교하는 놀이 ──
export interface Scenario { id: string; prompt: string; options: { el: Element; label: string }[] }
export const SCENARIOS: Scenario[] = [
  { id: 'cancel', prompt: '단톡방에서 친구가 약속을 또 취소했어. 나는?', options: [{ el: 'wood', label: '솔직하게 서운하다고 말한다' }, { el: 'fire', label: '이모티콘 폭발! 감정부터 쏟아낸다' }, { el: 'earth', label: '괜찮아~ 하고 다음 약속을 잡는다' }, { el: 'metal', label: '취소 규칙을 정하자고 선을 긋는다' }, { el: 'water', label: '답 없이 혼자 생각하며 흘려보낸다' }] },
  { id: 'vacation', prompt: '갑자기 휴가가 3일 생겼다! 나는?', options: [{ el: 'wood', label: '새로 배워 보고 싶던 걸 시작한다' }, { el: 'fire', label: '사람들 불러서 놀러 간다' }, { el: 'earth', label: '집에서 맛있는 걸 먹으며 푹 쉰다' }, { el: 'metal', label: '밀린 정리와 계획을 끝낸다' }, { el: 'water', label: '혼자 훌쩍 떠나 바다를 본다' }] },
  { id: 'choice', prompt: '중요한 선택 앞에서 나는?', options: [{ el: 'wood', label: '일단 저지르고 길을 낸다' }, { el: 'fire', label: '가슴이 뛰는 쪽을 고른다' }, { el: 'earth', label: '주변 의견을 듣고 안전한 쪽을 고른다' }, { el: 'metal', label: '장단점을 표로 정리해 결정한다' }, { el: 'water', label: '며칠 묵히며 흐름을 지켜본다' }] },
];
export const STYLE_NAME: Record<Element, string> = { wood: '씩씩한 새싹형', fire: '불꽃 열정형', earth: '든든한 큰바위형', metal: '또박또박 칼각형', water: '유유자적 물결형' };

/** 고른 행동 스타일의 최다 오행(동률이면 먼저 고른 쪽)과 사주 속 개수를 비교한 한마디 */
export function styleVsChart(picks: Element[], counts: Record<Element, number>): { style: Element; lines: Line[] } {
  const tally = new Map<Element, number>();
  picks.forEach((e) => tally.set(e, (tally.get(e) ?? 0) + 1));
  let style = picks[0], best = 0;
  for (const e of picks) if ((tally.get(e) ?? 0) > best) { best = tally.get(e)!; style = e; }
  const n = counts[style], nm = FRIEND[style].short;
  const text = n >= 2 ? `너는 ${STYLE_NAME[style]}! 사주에도 ${nm} 친구가 ${n}명이나 있어서 겉으로 하는 행동과 타고난 결이 닮았어. 자연스러운 너다운 모습이야!` : n === 1 ? `너는 ${STYLE_NAME[style]}! 사주엔 ${nm} 친구가 한 명 있어. 평소엔 조용하다가 필요할 때 그 친구가 나서는 타입일 수도 있어.` : `너는 ${STYLE_NAME[style]}! 그런데 사주엔 ${nm} 친구가 한 명도 없어. 타고난 게 아니라 노력해서 만든 모습일 수 있어 — 그래서 더 멋진 거야!`;
  return { style, lines: [{ who: style, text }, { who: 'mine', text: '이건 재미로 보는 비교야. 정답은 없고, 사주와 달라도 전혀 이상한 게 아니야 😊' }] };
}
