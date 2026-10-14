import { calculator } from '../saju/sampleCalculator';
import { tenGod } from '../saju/rules';
import { BirthInput, SajuFacts, Stem, TenGod } from '../saju/types';
import { pick } from '../hash';
import { kstDate } from '../kst';

export const DAILY_RULE_VERSION = 'daily-rules-1.0';

interface Bank { one: string[]; flow: string; work: string; money: string; relation: string; action: string[] }
const BANK: Record<TenGod, Bank> = {
  비견: { one: ['오늘은 나와 닮은 에너지가 곁에 모이는 날이에요.', '내 페이스를 지키면 든든한 동료가 생겨요.'], flow: '비슷한 마음을 가진 사람들과 호흡이 잘 맞는 하루예요. 다만 비교하는 마음이 올라오면 한 템포 쉬어 가세요.', work: '혼자 끌고 가기보다 믿는 사람과 역할을 나누면 속도가 붙어요.', money: '지출은 친구·동료와 얽히기 쉬워요. 나눠 쓰는 금액은 미리 정해 두세요.', relation: '경쟁심보다 응원의 말을 먼저 건네 보세요.', action: ['오늘 할 일 3가지만 적고 그중 하나를 바로 시작하기', '동료에게 짧은 응원 메시지 보내기'] },
  겁재: { one: ['에너지가 넘치는 날, 속도 조절이 포인트예요.', '승부욕을 살짝 내려놓으면 더 멀리 가요.'], flow: '의욕이 강해지는 만큼 충동도 같이 올라와요. 중요한 결정은 한 번 더 확인하고 움직이세요.', work: '경쟁 상황에서 집중력이 올라가요. 단, 무리한 약속은 피하세요.', money: '즉흥 소비 주의. 장바구니에 담고 하루 뒤에 결제해 보세요.', relation: '내 의견을 조금 부드럽게 전하면 오해가 줄어요.', action: ['결제 전 10분 기다리기', '물 한 잔 마시고 숨 고르기'] },
  식신: { one: ['여유와 즐거움이 재능이 되는 날이에요.', '맛있는 것, 좋아하는 일에 마음을 써 보세요.'], flow: '표현력이 풀리고 마음이 편안한 하루예요. 만들고 나누는 일에서 보람이 커요.', work: '아이디어를 말로, 글로 꺼내 보세요. 반응이 좋아요.', money: '작은 즐거움에 쓰는 돈이 만족을 줘요. 과하지만 않으면 괜찮아요.', relation: '진심 어린 칭찬 한마디가 관계를 부드럽게 해요.', action: ['좋아하는 음식으로 한 끼 천천히 먹기', '떠오른 아이디어 메모하기'] },
  상관: { one: ['재치와 솔직함이 빛나지만 말은 한 번 걸러서!', '번뜩이는 생각이 많은 날이에요.'], flow: '틀을 깨고 싶은 마음이 커져요. 창의적인 일엔 좋지만 직설은 조심하세요.', work: '새로운 방식 제안에 좋은 날이에요. 표현은 부드럽게 다듬으세요.', money: '관심 가는 곳에 지갑이 열리기 쉬워요. 필요한 것인지 한 번만 체크하세요.', relation: '하고 싶은 말을 보내기 전에 한 번 읽어 보세요.', action: ['보내기 전 메시지 한 번 다시 읽기', '새로운 방식으로 작은 일 하나 해 보기'] },
  편재: { one: ['기회가 스치는 날, 눈과 발이 가벼워요.', '움직일수록 좋은 소식이 따라와요.'], flow: '활동 반경이 넓어지고 사람·정보가 활발하게 오가요. 다만 욕심내서 벌리지는 마세요.', work: '외부 미팅, 협상, 새 연락에 운이 따라요.', money: '들어오고 나가는 흐름이 커요. 기록을 남기면 새는 돈이 줄어요.', relation: '먼저 연락하면 반가운 답이 와요.', action: ['오래 연락 못 한 사람에게 안부 보내기', '오늘 쓴 돈 한 줄 기록하기'] },
  정재: { one: ['차근차근 쌓은 것이 안정감을 주는 날이에요.', '꾸준함이 오늘의 보너스예요.'], flow: '계획대로 착실하게 진행되는 하루예요. 큰 변화보다 정리와 마무리가 잘 맞아요.', work: '미뤄 둔 정리·정산·문서 작업을 끝내기 좋아요.', money: '고정 지출 점검에 좋은 날이에요. 작은 절약이 눈에 보여요.', relation: '약속을 지키는 모습이 신뢰를 더해요.', action: ['구독·고정비 하나 점검하기', '책상 정리 10분'] },
  편관: { one: ['긴장감 속에서 실력이 드러나는 날이에요.', '압박은 있지만 해내면 한 단계 올라가요.'], flow: '책임이나 과제가 눈앞에 놓이기 쉬워요. 우선순위를 정하면 오히려 집중이 잘돼요.', work: '도전적인 과제에서 존재감이 생겨요. 무리한 일정은 미리 조율하세요.', money: '불필요한 지출보다 필요한 투자에 집중하세요.', relation: '날 선 말에는 바로 반응하지 말고 한 박자 쉬세요.', action: ['가장 부담되는 일을 15분만 먼저 하기', '스트레칭으로 어깨 풀기'] },
  정관: { one: ['예의와 질서가 나를 빛나게 하는 날이에요.', '맡은 일을 반듯하게 해내면 인정받아요.'], flow: '규칙적이고 안정적인 흐름이에요. 평판과 신뢰를 쌓기에 좋아요.', work: '보고, 발표, 공식적인 자리에서 좋은 인상을 줘요.', money: '계획된 지출 위주로, 무리한 결정은 피하세요.', relation: '예의 바른 한마디가 큰 호감으로 돌아와요.', action: ['오늘 해야 할 보고·연락 먼저 처리하기', '단정한 옷차림으로 기분 내기'] },
  편인: { one: ['혼자 생각할 때 아이디어가 샘솟는 날이에요.', '조용한 몰입이 답을 줘요.'], flow: '직관과 호기심이 깨어나요. 사람 많은 곳보다 혼자만의 시간이 도움이 돼요.', work: '새로운 공부, 연구, 기획 초안에 좋아요.', money: '충동구매보다 배움에 쓰는 비용이 남아요.', relation: '말하지 않아도 알아주길 바라기보다 한 줄이라도 표현해 보세요.', action: ['30분 방해금지 시간 만들기', '궁금한 주제 하나 검색해서 메모하기'] },
  정인: { one: ['도움과 배움이 따뜻하게 찾아오는 날이에요.', '마음이 든든해지는 소식이 있을 수 있어요.'], flow: '귀인의 조언이나 안정감이 느껴지는 하루예요. 받는 것에 감사하면 더 커져요.', work: '배운 것을 정리하고 조언을 구하기에 좋아요.', money: '큰 변동은 없고 안정적이에요. 저축 계획을 세우기 좋아요.', relation: '고마웠던 사람에게 감사 인사를 전해 보세요.', action: ['고마운 사람에게 한 줄 감사 보내기', '따뜻한 차 한 잔 마시기'] },
};

export interface DailyFortune {
  date: string; // KST
  chartId: string;
  version: string;
  dayPillar: string;
  relation: TenGod;
  oneLine: string;
  flow: string;
  work: string;
  money: string;
  relationAdvice: string;
  action: string;
  timeUnknownNote?: string;
}

/** 일진은 만세력 계산기(양력 00:00 경계)를 따르고, 화면 표시/캐시 날짜는 KST 를 쓴다. */
export function buildDaily(facts: SajuFacts, date = kstDate()): DailyFortune {
  const [y, m, d] = date.split('-').map(Number);
  const today: BirthInput = { calendar: 'solar', leapMonth: false, year: y, month: m, day: d, timeUnknown: true, country: 'KR' };
  const dayPillar = calculator.calculate(today).pillars.day;
  const rel = tenGod(facts.dayMaster, dayPillar[0] as Stem);
  const b = BANK[rel];
  const seed = `${facts.inputHash}|${date}|${DAILY_RULE_VERSION}`;
  return {
    date,
    chartId: facts.chartId,
    version: DAILY_RULE_VERSION,
    dayPillar,
    relation: rel,
    oneLine: pick(b.one, seed + 'o'),
    flow: b.flow,
    work: b.work,
    money: b.money,
    relationAdvice: b.relation,
    action: pick(b.action, seed + 'a'),
    timeUnknownNote: facts.pillars.hour === null ? '출생 시간을 몰라 시주는 반영하지 않았어요.' : undefined,
  };
}
