import { describe, expect, it } from 'vitest';
import { elementReactions, MOODS, moodReply, secretStory } from './chat';
import { CHARACTERS } from './characters';

describe('채팅 대사 규칙', () => {
  it('3개 이상은 많음, 0개는 없음 반응, 고르면 균형 안내', () => {
    const r = elementReactions({ wood: 3, fire: 1, earth: 2, metal: 2, water: 0 });
    expect(r.map((x) => x.element)).toEqual(['wood', 'water']);
    expect(r[0].text).toContain('3명');
    expect(elementReactions({ wood: 2, fire: 2, earth: 2, metal: 1, water: 1 })[0].text).toContain('고르게');
  });
  it('기분마다 담당 친구가 있고 답변은 결정적', () => {
    expect(MOODS.map((m) => m.friend).sort()).toEqual(['earth', 'fire', 'metal', 'water', 'wood']);
    expect(moodReply('tired', 3)).toBe(moodReply('tired', 3));
  });
  it('비밀 이야기는 약점을 낙인 없이 풀고 단정 표현이 없다', () => {
    for (const c of Object.values(CHARACTERS)) expect(secretStory(c).join(' ')).not.toMatch(/반드시|무조건|운명/);
  });
});
