import { GOD_LOVE, POS_BRANCH, analyzeChart, analyzeLove, analyzeYear, bko, ko } from '../report/analysis';
import { calculator } from '../saju/calculator';
import { elementRelation, STEM_ELEMENT } from '../saju/rules';
import { Branch, ELEMENT_KO, Element, SajuFacts, Stem, TenGod } from '../saju/types';
import { CHARACTERS } from './characters';
import { CHECK_QUESTIONS, FIGHT_SCRIPT, FIRST_IMPRESSION, STAGE_TIP, LOVE_MOMENT, PATTERN_STORY, RELATION_STYLE, SEASON_TIP, STEM_STRENGTH } from './readingBank3';
import { BRANCH_LOVE, STEM_LIFE, STEM_LOVE, STEM_WORK } from './readingBank2';
import { BRANCH_SCENE, CYCLE_GOD, CYCLE_LOVE, ELEMENT_LACK, ELEMENT_MANY, ELEMENT_PARTNER, GOD_DEEP, GROUP_JOB, GROUP_LEVEL, Group, LOVE_YEAR, POWER_TEXT, SEASON_REL, STEM_IMAGE, YEAR_BRANCH, YEAR_STEM } from './readingBank';

/** 규칙 기반 해석 작성기: 계산된 사실(원국·월령·십성 분포·신강약·합충·대운·세운)을 풀어서 쓴다. AI 호출 없음, 같은 입력이면 같은 글. */
const batchim = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const eun = (w: string) => w + (batchim(w) ? '은' : '는');
const i = (w: string) => w + (batchim(w) ? '이' : '가');
const kb = (b: Branch) => bko(b);
const ka = (st: Stem) => ko(st);
const eu = (w: string) => w + (batchim(w) ? '을' : '를');
const EL_NAME: Record<Element, string> = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const pk = (p: string) => `${p}(${ko(p[0] as Stem)}${bko(p[1] as Branch)})`;
const lv = (n: number): 'high' | 'mid' | 'none' => (n >= 3 ? 'high' : n === 0 ? 'none' : 'mid');
const GROUP_OF_GOD: Record<TenGod, Group> = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };

export interface Draft { id: string; title: string; paras: string[]; evidenceIds: string[] }
export interface ReadingCtx { baseYear: number }

/** 현재 대운 번호(0부터). 나이를 모르면 -1 */
function currentCycle(f: SajuFacts, year: number): number {
  if (!f.birth || !f.luckCycles.length) return -1;
  const age = year - f.birth.year;
  let idx = -1;
  f.luckCycles.forEach((c, k) => { if (c.startAge <= age) idx = k; });
  return idx;
}
const ageText = (a: number) => (Number.isInteger(a) ? `${a}세` : `${Math.floor(a)}세경`);
function cycleLines(f: SajuFacts, year: number, love: boolean): string[] {
  const dm = f.dayMaster;
  const cur = currentCycle(f, year);
  const out: string[] = [];
  f.luckCycles.slice(0, 5).forEach((c, k) => {
    const g = analyzeYear(f, 0, c.pillar).stemGod;
    out.push(`${k === cur ? '▶ 지금 ' : '• '}${ageText(c.startAge)}부터 ${pk(c.pillar)} 대운: ${(love ? CYCLE_LOVE : CYCLE_GOD)[g]}${k === cur ? ' (현재 걷고 있는 구간)' : ''}.`);
  });
  void dm;
  return out;
}

function yearPara(f: SajuFacts, y: number, mode: 'general' | 'love'): string {
  const yp = calculator.yearPillar(y);
  const Y = analyzeYear(f, y, yp);
  const bits: string[] = [];
  bits.push(`${y}년은 ${pk(yp)}의 해예요. 겉으로 드러나는 흐름(천간)은 ${Y.stemGod}으로, ${mode === 'love' ? LOVE_YEAR[Y.stemGod] : YEAR_STEM[Y.stemGod]}. 안쪽의 생활 리듬(지지)은 ${Y.branchGod}이라 ${YEAR_BRANCH[Y.branchGod]}.`);
  if (Y.toDay === '충') bits.push(`올해의 지지가 내 일지(${f.pillars.day[1]})와 부딪히는 모양이라, ${mode === 'love' ? '가까운 사람과의 관계에서 의견 충돌이나 거리 두기, 환경 변화가 생기기 쉬워요. 감정이 올라올 때는 하루 묵혀서 말해 보세요' : '생활 터전이나 가까운 관계에서 변화·이동 이야기가 나오기 쉬워요. 큰 결정은 한 번 더 확인하세요'}.`);
  else if (Y.toDay === '육합') bits.push(`올해의 지지가 내 일지(${f.pillars.day[1]})와 손을 잡는 모양이라, ${mode === 'love' ? '가까운 관계에 끌림과 인연의 소식이 생기기 좋아요' : '가까운 사람과의 협력과 새로운 인연이 힘이 되기 좋아요'}.`);
  if (Y.toMonth === '충') bits.push(`월지(${f.pillars.month[1]})와도 부딪혀 일터·사회적 환경의 변화가 있을 수 있어요.`);
  else if (Y.toMonth === '육합') bits.push(`월지(${f.pillars.month[1]})와는 합이 되어 일터·사회적 관계에서 협력의 기회가 생기기 쉬워요.`);
  return bits.join(' ');
}


const ELEMENT_ACTION: Record<Element, string> = {
  wood: '이번 주에 새로 배울 것 하나를 정하고 첫날 30분만 해 보기',
  fire: '좋아하는 사람 한 명에게 안부를 보내고 함께 웃는 시간 만들기',
  earth: '기상·식사·취침 시간을 사흘 동안 고정해 보기',
  metal: '책상이나 휴대폰을 15분 정리하고 미뤄 둔 일 하나 끝내기',
  water: '잠들기 전 20분은 휴대폰 없이 생각을 정리하기',
};
export const DATE_STYLE: Record<TenGod, string> = {
  비견: '각자의 취미를 존중하면서 같이 운동하거나 여행을 계획하는 대등한 데이트',
  겁재: '함께 경쟁하고 웃을 수 있는 활동적인 데이트',
  식신: '맛집과 카페에서 편하게 먹고 이야기하는 데이트',
  상관: '공연·전시·새로운 장소처럼 자극과 대화가 있는 데이트',
  편재: '새로운 장소를 탐험하고 즉흥적으로 움직이는 데이트',
  정재: '미리 계획해서 안정적으로 보내는 데이트',
  편관: '등산·클래스처럼 목표나 도전이 있는 데이트',
  정관: '예의와 분위기를 갖춘 단정한 데이트',
  편인: '조용한 공간에서 깊은 대화를 나누는 데이트',
  정인: '서로를 챙기고 함께 배우며 편안히 쉬는 데이트',
};
const LOVE_TIP: Record<TenGod, string> = {
  비견: '친구 모임에서 시작되는 인연에 마음을 열어 두기', 겁재: '비교와 경쟁 대신 내 속도를 지키기', 식신: '취미 모임에 나가 편하게 웃기',
  상관: '말하기 전에 한 번 다듬어 보기', 편재: '새 만남의 기준 세 가지를 미리 정해 두기', 정재: '관계의 약속과 계획을 구체적으로 나누기',
  편관: '책임감 있는 사람과 천천히 신뢰 쌓기', 정관: '관계를 정리하고 공식화할 대화를 나눠 보기', 편인: '혼자만의 시간으로 마음을 정리하기', 정인: '믿는 사람에게 속마음을 털어놓기',
};
const sent = (x: string) => (/[.!?…]$/.test(x.trim()) ? x.trim() : `${x.trim()}.`);
const MONEY_LEVEL = {
  high: '재성이 강해 기회와 돈의 흐름을 잘 알아보지만, 벌이는 일이 많아질수록 우선순위와 기록이 중요해요.',
  mid: '재물 감각이 무난해서 꾸준히 쌓아 가는 방식이 잘 맞아요.',
  none: '재성이 조용해서 돈을 쫓기보다 재능과 신뢰로 벌어 오는 길이 맞고, 자동이체 같은 구조가 도움이 돼요.',
} as const;
const jong = (w: string, a: string, b: string) => w + (batchim(w) ? a : b);
const stemRef = (s: Stem) => `${ko(s)}(${s})`;
const branchRef = (b: Branch) => `${bko(b)}(${b})`;
const stemSub = (s: Stem) => `${stemRef(s)}${batchim(ko(s)) ? '은' : '는'}`;
const branchSub = (b: Branch) => `${branchRef(b)}${batchim(bko(b)) ? '은' : '는'}`;
void kb; void ka; void eu; void jong;


/** 출생 시간을 모를 때만 덧붙이는 안내. 시주를 지어내지 않고, 빠진 것과 그대로인 것, 시간을 찾는 방법을 알려 준다. */
const TIME_UNKNOWN_BASIC = [
  '출생 시간을 모르면 시간의 기둥인 시주를 빼고 여섯 글자로 풀이해요. 시주는 마음속 바람, 나이 들어서의 분위기, 자녀와의 인연 같은 결을 더해 주는 자리라서, 시간을 알게 되면 이 글에서 "나이가 들수록"이나 "마무리"를 말하는 부분이 조금 더 또렷해져요. 반대로 지금 읽은 성격과 재능, 관계의 큰 줄기는 일주와 월주가 중심이라 시간이 없어도 대부분 그대로 유지돼요.',
  '시간을 찾아보는 방법도 있어요. 출생증명서나 산모수첩, 가족의 기억, 오래된 사진첩 메모가 가장 믿을 만해요. 정확한 시각이 아니어도 "새벽쯤", "해 질 무렵"처럼 대략의 시간대만 알면 후보를 좁힐 수 있어요. 시주는 두 시간 단위로 바뀌니, 경계에 가까운 시각이라면 한 번 더 확인해 보세요.',
  '그때까지는 이 풀이를 시간 미상 버전으로 가볍게 참고해 주세요. 마음에 와닿는 문장만 골라 담아도 충분하고, 시간이 정해지면 같은 방식으로 다시 풀어 볼 수 있어요.',
];
const TIME_UNKNOWN_LOVE = [
  '출생 시간을 모를 때는 연애 풀이에서도 시주를 빼고 읽어요. 시주는 연애에서 마음속 바람과 관계가 깊어진 뒤의 모습에 해당하는 자리라서, 시간을 알게 되면 "오래 만났을 때"나 "관계의 후반부"를 말하는 부분이 더 세밀해질 수 있어요. 처음 끌리는 방식, 다툼의 패턴, 올해부터의 흐름은 일주와 월주, 해마다의 기운으로 읽기 때문에 지금 내용 그대로 참고할 수 있어요.',
  '연애에서는 특히 "누가 먼저 다가가는가"나 "관계가 깊어진 뒤의 변화" 같은 질문이 시간의 영향을 받는 편이에요. 그래서 시간을 알게 된 뒤에 이 부분만 다시 읽어 보면 새로 보이는 문장이 있을 거예요.',
  '시간을 알아내고 싶다면 출생증명서나 산모수첩, 가족에게 들은 이야기를 먼저 살펴보세요. 대략의 시간대만 알아도 도움이 되고, 모르는 채로 두어도 괜찮아요. 이 풀이는 시간 미상 버전이라고 생각하고, 내 이야기 같은 문장만 가볍게 골라 보세요.',
];

export function basicDrafts(f: SajuFacts, ctx: ReadingCtx): Draft[] {
  const A = analyzeChart(f), L = analyzeLove(f);
  const c = CHARACTERS[f.dayMaster];
  const dm = f.dayMaster, db = f.pillars.day[1] as Branch;
  const dmImg = STEM_IMAGE[dm], dbScene = BRANCH_SCENE[db], life = STEM_LIFE[dm];
  const topGroups = (A.top.length ? A.top : (['비겁'] as Group[])).slice(0, 2);
  const monthG = A.monthGod, pg = L.palaceGod;
  const yearG = f.tenGods.find((t) => t.position === 'year')?.god, hourG = f.tenGods.find((t) => t.position === 'hour')?.god;
  const dom = A.dominant[0], miss = A.missing[0] ?? A.weak[0];
  const rel = elementRelation(A.dmEl, A.season.element);
  const counts = (Object.keys(f.fiveElements) as Element[]).map((e) => `${EL_NAME[e]} ${f.fiveElements[e]}`).join(' · ');
  const cyc = cycleLines(f, ctx.baseYear, false);
  const star = L.jae + L.gwan;
  const summaryEnd = batchim(c.summary) ? '이에요' : '예요';

  const s1: string[] = [
    `사주 원국은 연주 ${pk(f.pillars.year)}, 월주 ${pk(f.pillars.month)}, 일주 ${pk(f.pillars.day)}, 시주 ${f.pillars.hour ? pk(f.pillars.hour) : '없음(출생 시간을 몰라 계산하지 않았어요)'}로 이루어져 있어요. 연주는 뿌리와 어린 시절의 배경, 월주는 일터와 사회적인 모습, 일주는 나 자신, 시주는 꿈과 마무리의 결을 보여 주는 자리예요.`,
    `나를 뜻하는 일주는 ${pk(f.pillars.day)}${batchim(bko(f.pillars.day[1] as Branch)) ? '이에요' : '예요'}. ${dmImg.img}(${dm})${batchim(dmImg.img) ? '이' : '가'} ${dbScene.scene}(${db}) 곁에 서 있는 모습으로 그려 볼 수 있어요. 일간 ${stemSub(dm)} ${dmImg.nature}이고, 일지 ${branchSub(db)} ${dbScene.trait}을 더해 줘요. 그래서 이 사주의 첫인상은 "${c.name}", 곧 ${c.summary}${summaryEnd}.`,
    `${eun(c.name)} 주변에서 ${life.heard} 같은 말을 자주 듣는 편이에요. ${life.comfort} 마음이 가장 편하고, ${life.drain} 쉽게 지쳐요. ${life.env}에서 힘이 나고, 힘들 때는 ${life.words} 같은 말이 가장 큰 위로가 돼요.`,
    `태어난 달의 지지는 ${branchRef(A.monthBranch)}, 계절로는 ${A.season.name}이에요. ${SEASON_REL[rel]} ${A.seasonSupported ? '월령의 도움을 받는 구조라 바탕이 안정적이에요.' : '월령의 도움을 직접 받는 구조는 아니라서, 스스로 힘을 모으는 과정이 성장의 열쇠가 돼요.'}`,
    `오행 분포는 ${counts}이에요(천간·지지 글자 기준). ${dom ? `${eun(EL_NAME[dom])} 가장 많아 ${ELEMENT_KO[dom]}의 성향이 전체 분위기를 이끌고` : '오행이 고르게 퍼져 있어'}${A.missing.length ? `, ${A.missing.map((e) => eun(EL_NAME[e])).join(' ')} 원국에 보이지 않아요` : ''}. 오행은 좋고 나쁨이 아니라 내가 자주 쓰는 에너지와 덜 쓰는 에너지를 알려 주는 지도예요.`,
    `${POWER_TEXT[A.power]} (나를 돕는 힘 ${A.self} · 밖으로 쓰는 힘 ${A.other})`,
  ];
  if (A.relations.length) s1.push(`원국 안의 관계도 눈에 띄어요. ${A.relations.slice(0, 3).join(', ')}. 합은 끌어당기고 힘을 모으는 모양, 충은 부딪히며 변화를 만드는 모양이에요. 실제로 어떻게 작용하는지는 세력과 시기에 따라 달라지니 경향으로 봐 주세요.`);

  if (!f.pillars.hour) s1.push(...TIME_UNKNOWN_BASIC);
  const s2: string[] = [
    c.temperament,
    `겉과 속을 나눠 보면, 사회에서 보이는 모습(월간 ${f.pillars.month[0]})은 ${monthG}의 결이라 ${GOD_DEEP[monthG].self}. 반면 가장 편한 사람 앞에서 나오는 속마음(일지 ${db})은 ${pg}의 결이라 ${GOD_DEEP[pg].self}. 둘이 다르다면 "겉으론 이런데 속은 달라"라는 말을 들어 본 적이 있을 거예요.`,
    ...(yearG ? [`뿌리를 뜻하는 연간은 ${yearG}이라, 어린 시절의 환경과 가족의 분위기에서 ${GOD_TRAIT_OF(yearG)}이 중요하게 작용했을 가능성이 있어요.`] : []),
    ...(hourG ? [`마음속 바람과 마무리를 뜻하는 시주는 ${hourG}의 결이라, 나이가 들수록 ${GOD_TRAIT_OF(hourG)}을 더 소중하게 여기게 되는 경향이 있어요.`] : []),
    ...topGroups.map((g) => GROUP_LEVEL[g][lv(A.groupScore[g])]),
    ...A.absent.slice(0, 2).map((g) => GROUP_LEVEL[g].none),
    `나를 한 줄 키워드로 정리하면 ${[...c.strengths.slice(0, 2), GOD_TRAIT_OF(monthG), GOD_TRAIT_OF(pg)].map((k) => '#' + k.replace(/\s/g, '')).join(' ')} 예요. 친구에게 "나 이런 사람이래" 하고 보여 줘도 좋아요.`,
    `스트레스를 받을 때는 ${A.power === 'SELF' ? '고집이 세지고 혼자 끌어안으려는 모습이' : A.power === 'OTHER' ? '남의 기대에 맞추다 지쳐 말수가 줄어드는 모습이' : '상황에 따라 앞으로 나서거나 뒤로 물러나는 모습이'} 나타나기 쉬워요. ${dom ? ELEMENT_MANY[dom] : ''}`.trim(),
  ];

  const s3: string[] = [
    `${c.name}의 대표 강점은 ${c.strengths.join(', ')}${batchim(c.strengths[c.strengths.length - 1]) ? '이에요' : '예요'}.`,
    ...STEM_STRENGTH[dm].map((t, k) => `${k + 1}. ${t}.`),
    `월간 십성이 ${monthG}이라 사회적인 자리에서는 ${GOD_DEEP[monthG].work}. 이 힘은 일터에서 가장 선명하게 드러나요.`,
    ...topGroups.map((g) => `${g}의 힘이 큰 편이라 ${GROUP_JOB[g]}에서 만족도가 높은 경향이 있어요.`),
    `재능을 키우는 팁: ${GOD_DEEP[monthG].tip}.${dom ? ` 그리고 ${eun(EL_NAME[dom])} 많은 만큼 ${ELEMENT_KO[dom]}의 활동(${{ wood: '새로 배우고 성장하는 일', fire: '표현하고 사람을 북돋는 일', earth: '꾸준히 쌓고 중심을 잡는 일', metal: '정리하고 결단하는 일', water: '생각하고 연구하는 일' }[dom]})에서 힘을 얻기 쉬워요.` : ''}`,
    `강점이 과해지면 약점이 되기도 해요. ${sent(c.weaknesses[0])} ${sent(GOD_DEEP[monthG].caution)}`,
  ];

  const s4: string[] = [
    `일의 방향으로는 ${topGroups.map((g) => GROUP_JOB[g]).join(', 그리고 ')}이 잘 맞는 경향이 있어요. 직업 이름을 정답으로 삼기보다 "어떤 방식으로 일할 때 에너지가 나는가"를 기준으로 삼아 보세요.`,
    `일하는 나의 모습은 이래요. ${STEM_WORK[dm]}`,
    `일터에서 조심할 점은 이거예요. ${sent(GOD_DEEP[monthG].caution)}`,
    `재물 흐름은 ${GOD_DEEP[monthG].money}. ${MONEY_LEVEL[lv(A.groupScore.재성)]} ${A.groupScore.비겁 >= 3 ? '비겁이 강해 친구·동료와 얽힌 지출이 커지기 쉬우니 나눠 쓰는 금액은 미리 정해 두세요.' : '수입과 지출을 한 달에 한 번만 정리해도 새는 곳이 눈에 보여요.'}`,
    ...(cyc.length ? [`10년 단위의 큰 흐름(대운)을 보면 다음과 같아요.\n${cyc.join('\n')}`] : []),
    yearPara(f, ctx.baseYear, 'general'),
  ];

  const nowGod = analyzeYear(f, ctx.baseYear, calculator.yearPillar(ctx.baseYear)).stemGod;
  const s5: string[] = [
    `관계에서의 나는 이래요. ${STEM_LOVE[dm]}`,
    `속마음의 자리인 일지 ${branchSub(db)} ${pg}의 결이에요. ${BRANCH_LOVE[db]} 그래서 ${GOD_DEEP[pg].love}.`,
    `인연의 별(재성·관성)은 ${star >= 3 ? '풍성한 편이에요. 마음 가는 곳이 여럿일 수 있어서 선택 기준을 먼저 적어 두면 편해요' : star === 0 ? '원국에서 조용한 편이에요. 기다리기보다 활동 반경을 넓힐 때 인연의 문이 열리는 타입에 가까워요' : '적당히 있어요. 천천히 알아가며 깊어지는 관계가 잘 맞아요'}.`,
    ...(L.palaceRelations.length ? [L.palaceRelations.map(([pos, r]) => (r === '충' ? `일지가 ${POS_BRANCH[pos]}와 부딪히는 모양이라 가까운 사이에서 의견이 엇갈리기 쉬워요. 감정이 올라올 땐 하루 묵혀서 말하는 규칙을 정해 두면 좋아요.` : `일지가 ${POS_BRANCH[pos]}와 손을 잡는 모양이라 마음을 열면 깊이 이어지는 편이에요.`)).join(' ')] : []),
    `관계에서 조심할 패턴은 이거예요. ${sent(c.weaknesses[0])} ${sent(GOD_DEEP[pg].caution)}`,
    `${RELATION_STYLE.work[A.power]}`,
    `${RELATION_STYLE.friend[A.power]}`,
    `${RELATION_STYLE.family[A.power]}`,
    `올해 관계 흐름은 ${LOVE_YEAR[nowGod]}.`,
    `마음이 힘들 때 가까운 사람에게 이렇게 부탁해도 좋아요. ${life.words}처럼 말해 달라고요. 그리고 서운할 땐 "나는 이럴 때 서운해. 네가 이렇게 해 주면 좋겠어."라고 마음을 먼저 한 문장으로 전해 보세요.`,
  ];

  const s6: string[] = [
    miss ? `부족한 기운 보완: ${ELEMENT_LACK[miss]}` : '오행이 고르게 모여 있어 특별히 보완할 기운은 없어요. 지금의 균형을 잘 유지하는 것이 최선이에요.',
    dom && A.dominant.length < 5 ? `많은 기운 관리: ${ELEMENT_MANY[dom]}` : '',
    SEASON_TIP[A.season.element],
    `전략: ${A.power === 'SELF' ? '쌓아 둔 힘을 밖으로 쓰세요. 작은 결과물을 만들어 공개하고, 책임 있는 역할을 하나 맡아 보세요.' : A.power === 'OTHER' ? '나를 채우는 시간을 먼저 확보하세요. 배우는 시간, 쉬는 시간, 믿을 사람과의 대화를 일정에 고정해 두세요.' : '균형이 깨졌다고 느낄 때 속도를 조절하세요. 한쪽 일만 늘고 있다면 반대쪽을 하나 더해 보세요.'}`,
    `이번 달 작은 미션 3가지\n• ${GOD_DEEP[monthG].tip}.\n• ${miss ? `${EL_NAME[miss]} 기운 채우기: ${ELEMENT_ACTION[miss]}` : '지금 하는 일 중 가장 즐거운 것을 기록하기'}\n• 서운한 일이 생기면 하루 묵히고 한 문장으로 전하기`,
    '사주는 정해진 결론이 아니라 나를 이해하는 지도예요. 읽은 내용 중 "맞아!" 싶은 한 가지만 골라 이번 주에 해 보세요. 그게 풀이를 내 것으로 만드는 가장 쉬운 방법이에요.',
  ].filter(Boolean);

  return [
    { id: 's1', title: '원국 핵심', paras: s1, evidenceIds: ['pillars', 'day_master', 'elements'] },
    { id: 's2', title: '타고난 성격·기질', paras: s2, evidenceIds: ['day_master', 'god_month'] },
    { id: 's3', title: '강점·재능', paras: s3, evidenceIds: ['day_master', 'elements', 'god_month'] },
    { id: 's4', title: '직업·재물 경향', paras: s4, evidenceIds: ['god_month', 'god_year'] },
    { id: 's5', title: '관계·연애 경향', paras: s5, evidenceIds: ['day_master', 'god_year'] },
    { id: 's6', title: '실천 조언', paras: s6, evidenceIds: ['elements'] },
  ];
}

export function loveDrafts(f: SajuFacts, years: number[], ctx: ReadingCtx): Draft[] {
  const A = analyzeChart(f), L = analyzeLove(f);
  const c = CHARACTERS[f.dayMaster];
  const dm = f.dayMaster, db = f.pillars.day[1] as Branch;
  const dmImg = STEM_IMAGE[dm], life = STEM_LIFE[dm];
  const pg = L.palaceGod, monthG = A.monthGod;
  const miss = A.missing[0] ?? A.weak[0];
  const star = L.jae + L.gwan;
  const top = (A.top[0] ?? '비겁') as Group;
  const cyc = cycleLines(f, ctx.baseYear, true);
  const cur = currentCycle(f, ctx.baseYear);
  const curGod = cur >= 0 ? analyzeYear(f, 0, f.luckCycles[cur].pillar).stemGod : null;
  const keywords = pg === '정인' || pg === '편인' ? '이해심, 정서적 안정, 말이 통하는 사람' : pg === '정재' || pg === '정관' ? '신뢰, 성실, 약속을 지키는 사람' : pg === '식신' || pg === '상관' ? '유머, 편안함, 솔직한 사람' : pg === '편재' ? '활동적, 자유로움, 유쾌한 사람' : pg === '편관' ? '든든함, 카리스마, 책임감' : '대등함, 존중, 친구 같은 사람';

  const s1 = [
    `${dmImg.img}의 결을 가진 ${c.name}. 사랑 앞에서는 이런 사람이에요. ${c.temperament}`,
    STEM_LOVE[dm],
    `연애의 핵심 자리인 일지 ${branchSub(db)} ${pg}의 결이에요. ${BRANCH_LOVE[db]} 그래서 ${GOD_DEEP[pg].love}.`,
    `마음이 설레는 순간은 ${LOVE_MOMENT[dm].spark}이에요. 반대로 마음이 식는 순간은 ${LOVE_MOMENT[dm].cool}이에요. 이 두 장면을 알아 두면 관계에서 무엇을 요청해야 할지 분명해져요.`,
    `사회에서 보이는 모습(월간)은 ${monthG}이라 ${GOD_DEEP[monthG].self}. ${FIRST_IMPRESSION[monthG]}. 처음 만났을 때의 인상과 가까워진 뒤의 모습이 다를 수 있다는 뜻이에요.`,
    `전체 성향으로는 ${GROUP_LEVEL[top][lv(A.groupScore[top])]}`,
    `연애 한 줄 요약 카드: "${c.name}, ${pg}의 속마음을 가진 사람 — ${GOD_TRAIT_OF(pg)}이 사랑의 열쇠". 이 문장을 기억해 두고 관계가 흔들릴 때 꺼내 보세요.`,
  ];
  if (!f.pillars.hour) s1.push(...TIME_UNKNOWN_LOVE);
  const s2 = [
    `끌리는 관계의 기준은 ${GOD_LOVE[pg]}. 잘 맞는 데이트 방식은 ${DATE_STYLE[pg]}예요.`,
    miss ? `사주에 ${EL_NAME[miss]} 기운이 ${A.missing.includes(miss) ? '없어서' : '약해서'} 무의식적으로 ${ELEMENT_PARTNER[miss]}에게 끌릴 수 있어요. 나에게 없는 결을 채워 주는 사람이라 편하게 느껴질 수 있지만, 그 차이가 가끔 답답함으로 바뀌기도 하니 서로의 속도를 확인해 보세요.` : '오행이 고르게 모여 있어 특정한 결에 치우치지 않고 다양한 사람과 어울릴 수 있어요.',
    `인연의 별(재성·관성)은 ${star >= 3 ? '풍성한 편이에요. 선택지가 많아 고민이 길어질 수 있으니 "절대 양보할 수 없는 것 세 가지"를 먼저 적어 보세요' : star === 0 ? '조용한 편이에요. 만남이 저절로 오기를 기다리기보다 모임·취미·소개처럼 만날 통로를 만들 때 인연이 보이는 타입이에요' : '적당히 있어요. 서두르지 않고 알아가며 깊어지는 만남이 잘 맞아요'}.`,
    `관계 단계별 팁이에요.\n• 초반: ${STAGE_TIP[A.power].early}\n• 중반: ${STAGE_TIP[A.power].mid}\n• 오래된 관계: ${STAGE_TIP[A.power].long}`,
    `처음 몇 번의 만남에서 나누면 좋은 대화 주제는 "요즘 가장 재미있는 것", "쉬는 날 보내는 방식", "관계에서 중요하게 여기는 것" 세 가지예요. 이 이야기를 들어 보면 서로의 속도와 결이 자연스럽게 보여요.`,
    `이상형 키워드 세 가지를 정리하면 "${keywords}"예요.`,
    `피하면 좋은 관계는 ${GOD_DEEP[pg].caution.replace(/(해요|돼요|좋아요|세요)\.?$/, '')} 상황이 반복되는 관계예요. 처음 몇 달 동안 이런 패턴이 보이는지 가만히 살펴보세요.`,
  ];
  const s3 = [
    `반복되기 쉬운 패턴 첫째. ${GOD_DEEP[pg].caution}. 이 패턴은 관계가 가까워질수록 더 자주 올라와요.`,
    PATTERN_STORY[pg],
    `둘째. ${sent(c.weaknesses[0])} ${c.weaknesses[1] ? sent(c.weaknesses[1]) : ''}`.trim(),
    ...(L.palaceRelations.length ? [L.palaceRelations.map(([pos, r]) => (r === '충' ? `셋째. 일지가 ${POS_BRANCH[pos]}와 부딪히는 모양이라 가까운 관계에서 의견 충돌이 반복되기 쉬워요. 서운함이 생기면 그날 안에 한 문장으로 전하는 규칙을 만들어 보세요.` : `셋째. 일지가 ${POS_BRANCH[pos]}와 손을 잡는 모양이라 한 번 마음을 열면 관계가 깊고 오래가는 편이에요. 다만 가까운 만큼 기대도 커지니 말로 확인하는 습관이 필요해요.`)).join(' ')] : ['셋째. 원국에서 일지와 직접 부딪히거나 합하는 글자는 보이지 않아요. 관계의 갈등은 사주보다 소통 방식에서 오는 경우가 많아요.']),
    `지칠 때 나오는 모습은 이래요. ${life.drain} 쉽게 지치고, 그때 관계에서는 ${A.power === 'SELF' ? '고집이 세지거나 연락이 뜸해지는' : A.power === 'OTHER' ? '참고 맞추다 한꺼번에 서운함이 터지는' : '앞으로 나서다가 갑자기 물러나는'} 모습이 나오기 쉬워요.`,
    `갈등이 생길 때 그대로 써도 좋은 말이에요.\n${FIGHT_SCRIPT.map((x) => `• ${x}`).join('\n')}`,
    `패턴을 끊는 3단계: ① 감정이 올라오면 바로 반응하지 않고 10분 쉬기 ② "내가 느낀 것"을 한 문장으로 쓰기 ③ 상대에게 "이렇게 이해했는데 맞아?"라고 확인하기. 작아 보여도 오래된 패턴을 바꾸는 가장 현실적인 방법이에요.`,
  ];
  const s4 = [
    `연애에서의 강점은 ${c.strengths.join(', ')}${batchim(c.strengths[c.strengths.length - 1]) ? '이에요' : '예요'}. 특히 ${GOD_DEEP[pg].tip}.`,
    `어려움은 마음을 표현하는 순간에 생기기 쉬워요. ${GOD_DEEP[pg].caution}. ${top}의 힘이 ${A.groupScore[top] >= 3 ? '강해 한쪽으로 쏠린 모습이 나올 수 있으니' : '고루 작용해'} 상대의 속도를 한 번 더 살펴보면 좋아요.`,
    `어떤 기운의 사람과 결이 맞는지도 간단히 정리해 볼게요. ${(['wood', 'fire', 'earth', 'metal', 'water'] as Element[]).map((e) => `${EL_NAME[e]} 기운이 강한 사람과는 ${{ '같은 기운': '거울처럼 닮아 편하지만 부딪히면 서로 양보가 어려운 관계', '도움 받음': '내가 힘을 얻고 배우는 관계', '내가 도움': '내가 챙기고 북돋아 주는 관계', '내가 조절': '내가 이끌고 정리해 주는 관계', '조절 받음': '긴장과 자극을 주고받으며 성장하는 관계' }[elementRelation(A.dmEl, e)]}이에요`).join('. ')}. 어느 쪽이 좋고 나쁘다기보다 어떤 역할을 주고받는지의 차이예요.`,
    `나를 지키는 선 세 가지도 정해 두세요.\n• ${A.power === 'OTHER' ? '거절해야 할 때는 이유를 길게 설명하지 않고 "이번엔 어려워"라고 짧게 말하기' : '내 방식을 요구하기 전에 상대의 의견을 한 번 묻기'}\n• 연락과 만남의 빈도에 대해 서로 편한 기준을 한 번은 이야기해 두기\n• 감정이 크게 흔들리는 날에는 중요한 결정을 하루 미루기`,
    `관계가 어려울 때 나를 지켜 주는 습관은 ${miss ? `${EL_NAME[miss]} 기운 채우기, 곧 ${ELEMENT_ACTION[miss]}` : '지금의 균형을 유지하는 것'}이에요.`,
  ];
  const s5 = cyc.length
    ? [`10년 단위의 큰 흐름(대운)에서 관계의 분위기를 읽어 볼게요.\n${cyc.join('\n')}`,
       ...(curGod ? [`지금 걷고 있는 구간은 ${curGod}의 시기예요. 이 시기에 해 보면 좋은 일은 이거예요. ${GOD_DEEP[curGod].tip}.`] : []),
       '대운은 한 시기의 배경 분위기일 뿐이에요. 같은 대운 안에서도 사람과 선택에 따라 연애의 모습은 크게 달라져요.']
    : ['대운은 성별과 정확한 출생 시각이 있어야 계산돼요. 입력하면 이 자리에 10년 단위의 관계 흐름이 나타나요.'];
  const overview = years.map((y) => { const yp = calculator.yearPillar(y); const g = analyzeYear(f, y, yp).stemGod; return `• ${y}년 ${pk(yp)} · ${g} — ${LOVE_YEAR[g]}`; });
  const s6 = [`앞으로 5년을 한눈에 보면 이렇게 이어져요.\n${overview.join('\n')}\n연도마다 분위기는 달라도, 가장 중요한 건 그 해의 분위기를 알고 나에게 맞는 속도로 움직이는 거예요.`, ...years.map((y) => {
    const g = analyzeYear(f, y, calculator.yearPillar(y)).stemGod;
    return `${yearPara(f, y, 'love')} 이 해의 작은 실천: ${LOVE_TIP[g]}.`;
  })];
  const s7 = [
    `이번 일주일 실험 세 가지\n• 하루에 한 번, 고마운 점을 한 문장으로 전하기\n• 서운한 일이 생기면 그날 안에 "나는 ~해서 서운했어"로 말하기\n• ${miss ? `${EL_NAME[miss]} 기운 채우기: ${ELEMENT_ACTION[miss]}` : '나에게 편한 데이트 방식 하나 정해 보기'}`,
    `상대와 이야기가 막힐 땐 "정답을 맞히려는 대화" 대신 "서로의 속도를 확인하는 대화"로 바꿔 보세요. 예: "나는 지금 좀 쉬고 싶은데, 너는 어때?"`,
    `관계 점검 질문 일곱 가지예요. 하루에 하나씩 조용히 적어 보세요.\n${CHECK_QUESTIONS.map((x, k) => `${k + 1}. ${x}`).join('\n')}`,
    `마음이 힘들 때 듣고 싶은 말은 ${life.words}일 거예요. 가까운 사람에게 이렇게 말해 달라고 먼저 부탁해도 괜찮아요.`,
    '결과를 결혼이나 이별 같은 사건의 예언으로 받아들이지 마세요. 사주는 내가 사랑을 대하는 방식과 흐름을 비춰 주는 거울이에요. 읽은 문장 가운데 가장 마음에 남은 한 가지를 실제 대화에서 써 보는 것이 풀이를 내 것으로 만드는 방법이에요.',
  ];
  s7.push(
    `마지막으로 올해 안에 해 볼 연애 계획을 세 가지로 정리해 볼게요. 첫째는 만남의 폭을 넓히는 일이에요. ${c.name}에게는 ${keywords} 같은 결이 잘 맞으니, 새로운 모임이나 취미 자리에서 그런 사람을 눈여겨보세요. 둘째는 마음을 말로 옮기는 연습이에요. 좋아하는 마음도 서운한 마음도 하루 안에 한 문장으로 전해 보면 오해가 훨씬 줄어요. 셋째는 나를 돌보는 시간이에요. 연애가 잘 풀리는 시기에도 혼자 있는 시간이 마음의 중심을 잡아 줘요. 세 가지를 모두 하지 않아도 괜찮고, 하나만 꾸준히 해도 흐름이 달라져요.`,
    '한 달에 한 번, 스스로에게 이런 질문을 던져 보세요. 요즘 나는 상대의 말을 끝까지 듣고 있는지, 내 마음을 숨기느라 에너지를 쓰고 있지는 않은지, 연애가 아닌 시간에도 웃을 일이 있는지예요. 답이 하나라도 마음에 걸린다면 그 부분부터 천천히 고쳐 가면 돼요.',
  );

  return [
    { id: 's1', title: '연애 기질', paras: s1, evidenceIds: ['day_master'] },
    { id: 's2', title: '원하는 관계·상대', paras: s2, evidenceIds: ['elements', 'god_month'] },
    { id: 's3', title: '반복될 수 있는 관계 패턴', paras: s3, evidenceIds: ['day_master'] },
    { id: 's4', title: '강점·어려움', paras: s4, evidenceIds: ['day_master'] },
    { id: 's5', title: '현재 대운', paras: s5, evidenceIds: ['pillars'] },
    { id: 's6', title: `${years[0]}~${years[years.length - 1]}년 세운`, paras: s6, evidenceIds: years.map((y) => `year_${y}`) },
    { id: 's7', title: '조언', paras: s7, evidenceIds: ['elements'] },
  ];
}

const GOD_TRAIT_OF = (g: TenGod) => GOD_TRAIT_MAP[g];
const GOD_TRAIT_MAP: Record<TenGod, string> = {
  비견: '자립심과 동료 의식', 겁재: '승부욕과 추진력', 식신: '표현력과 여유', 상관: '재치와 창의성', 편재: '활동성과 기회 포착력',
  정재: '성실함과 현실 감각', 편관: '도전 정신과 책임감', 정관: '신뢰감과 단정함', 편인: '직관과 독창성', 정인: '배려와 학습 의욕',
};
export { STEM_ELEMENT, GROUP_OF_GOD, i as subj };
