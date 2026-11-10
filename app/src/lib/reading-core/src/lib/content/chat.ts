// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import type { Element, SajuFacts, Stem } from '../saju/types';
import { CHARACTERS, CharacterBase } from './characters';

/** 대화에 나오는 다섯 안내 친구 (오행 하나씩). 대화 내용은 모두 규칙 기반이며 AI 생성이 아니다. */
export const FRIEND: Record<Element, { stem: Stem; short: string; voice: string }> = {
  wood: { stem: '甲', short: '솔이', voice: '씩씩하고 곧은 말투' },
  fire: { stem: '丙', short: '댕이', voice: '밝고 들뜬 말투' },
  earth: { stem: '戊', short: '호동이', voice: '느긋하고 든든한 말투' },
  metal: { stem: '庚', short: '달토', voice: '또박또박한 말투' },
  water: { stem: '壬', short: '거북이', voice: '느릿하고 깊은 말투' },
};
export const HOST: Element = 'earth';
export const friendBase = (el: Element): CharacterBase => CHARACTERS[FRIEND[el].stem];

const MANY: Record<Element, string> = {
  wood: '우리 나무 친구가 {n}명이나 있네! 하고 싶은 걸 쭉쭉 밀고 나가는 힘이 있다는 뜻이야. 가끔은 쉬어 가도 괜찮아~',
  fire: '불 친구가 {n}명이나 모였어! 표현도 감정도 확 타오르는 편이라는 뜻이야. 뜨거울 땐 물 한 잔 마시고 가자!',
  earth: '흙 친구가 {n}명! 믿음직하고 느긋하게 버티는 힘이 큰 편이야. 다만 너무 참고만 있진 않기!',
  metal: '쇠 친구가 {n}명이야. 선이 분명하고 결단이 빠른 편이라는 뜻이지. 말은 조금만 둥글게, 알지?',
  water: '물 친구가 {n}명이나 있어요… 생각도 감정도 깊고 넓게 흐르는 편이라는 뜻이에요. 너무 깊이 잠기진 말기.',
};
const NONE: Record<Element, string> = {
  wood: '이번 판에는 나무 친구가 한 명도 없네… 새로 시작하는 힘은 일부러 챙겨 줘야 할지도 몰라. 필요할 땐 나를 불러!',
  fire: '불 친구는 아직 안 보여~ 열정을 꺼내는 건 조금 천천히 데워야 할 수 있어. 따뜻한 사람 곁이 도움이 돼!',
  earth: '흙 친구가 없구나. 중심을 잡아 주는 루틴을 만들어 두면 든든할 거야.',
  metal: '쇠 친구는 없네. 선을 긋고 마무리하는 건 의식해서 해 보면 좋아. 내가 곁에서 응원할게.',
  water: '물 친구는 보이지 않아요. 쉬고 정리하는 시간을 일부러 만들어 주면 좋아요.',
};
const BALANCED = '다섯 친구가 비교적 고르게 모였어! 어느 한쪽으로 쏠리지 않은 구성이라 상황 따라 이런저런 얼굴을 보여 줄 수 있대.';

export interface Reaction { element: Element; text: string }
/** 오행 개수(사주 팔자 글자 기준)를 보고 친구들이 하는 말. 3개 이상이면 '많음', 0개면 '없음'. */
export function elementReactions(counts: Record<Element, number>): Reaction[] {
  const out: Reaction[] = [];
  (Object.keys(counts) as Element[]).forEach((el) => {
    if (counts[el] >= 3) out.push({ element: el, text: MANY[el].replace('{n}', String(counts[el])) });
  });
  (Object.keys(counts) as Element[]).forEach((el) => {
    if (counts[el] === 0) out.push({ element: el, text: NONE[el] });
  });
  if (!out.length) out.push({ element: HOST, text: BALANCED });
  return out.slice(0, 3);
}

export type Mood = 'tired' | 'stuck' | 'excited' | 'worried' | 'lonely';
export const MOODS: { id: Mood; label: string; emoji: string; friend: Element }[] = [
  { id: 'tired', label: '지쳤어', emoji: '😮‍💨', friend: 'water' },
  { id: 'stuck', label: '답답해', emoji: '😤', friend: 'wood' },
  { id: 'excited', label: '설레', emoji: '🥰', friend: 'fire' },
  { id: 'worried', label: '걱정돼', emoji: '😟', friend: 'earth' },
  { id: 'lonely', label: '허전해', emoji: '🫥', friend: 'metal' },
];
const MOOD_REPLY: Record<Mood, string[]> = {
  tired: ['그럴 땐 아무것도 안 해도 괜찮아요. 따뜻한 물 한 잔 마시고, 오늘은 할 일 하나만 남겨 둬요.', '지친 건 게으른 게 아니라 많이 해냈다는 뜻이에요.'],
  stuck: ['막힌 건 방향을 바꿀 때일 수도 있어! 창문 열고 심호흡 세 번, 그다음에 제일 작은 일부터 쏙!', '답답할 땐 몸을 먼저 움직여 보자. 10분만 걷고 와!'],
  excited: ['우와, 설렘이 오면 일단 즐겨야지! 그 마음 지금 적어 둬~ 나중에 힘이 돼!', '좋은 기분은 나눌수록 커져! 누구한테 얘기할래?'],
  worried: ['걱정은 마음이 준비하고 있다는 신호야. 걱정되는 걸 종이에 세 줄로 적어 보자. 할 수 있는 것과 없는 것으로 나누면 한결 가벼워져.', '오늘 내가 할 수 있는 건 작은 것 하나야. 그거면 충분해.'],
  lonely: ['허전할 땐 연락 한 통이 의외로 크게 닿아. 오래 못 본 사람한테 안부 한 줄, 어때?', '혼자인 시간도 나를 단단하게 해. 그래도 오늘은 나랑 이야기했잖아!'],
};
export const moodReply = (mood: Mood, seed: number) => MOOD_REPLY[mood][Math.abs(seed) % MOOD_REPLY[mood].length];

/** 호감도가 오르면 열리는 '비밀 이야기': 약점을 낙인이 아닌 팁으로 풀어 준다. */
export function secretStory(base: CharacterBase): string[] {
  return [`사실 나한테도 약한 구석이 있어… ${base.weaknesses[0]}.`, `${base.weaknesses[1] ?? base.weaknesses[0]} 그래서 이런 날엔 이렇게 해 보려고 해: 숨 한 번 고르고, 믿는 사람에게 한마디 해 보기.`, '너에게만 말하는 거야. 비밀이야, 알겠지? 🤫'];
}

export const AFFINITY_MAX = 5;
export const hasPolicyNote = (f: SajuFacts) => !!f.review?.uncertainties.some((u) => u.code === 'PILLAR_POLICY_DEPENDENT' || u.severity === 'REVIEW');
