import { CATALOG, ProductId } from '../catalog';
import type { Category } from './concern';

export interface NextStep { productId: ProductId | null; to: string; title: string; reason: string; cta: string }

/** 고민 범주와 보유 상품에 따라 다음 상품을 한 가지만 권한다. 가격·엽전은 카탈로그 값 그대로 보여 준다. */
export function recommendNext(cat: Category | null | undefined, owned: ProductId[]): NextStep {
  const has = (p: ProductId) => owned.includes(p);
  if (cat === 'love' && !has('love_deep')) return step('love_deep', '연애·인연 고민이 있다면', '관계 패턴과 앞으로 5년 연도별 분위기까지 이어서 봐요.');
  if (cat === 'people' && !has('compatibility')) return step('compatibility', '사람·관계 고민이 있다면', '상대와 나의 결이 어떻게 만나는지 궁합으로 확인해 보세요.');
  if (!has('basic')) return step('basic', '나를 먼저 깊이 알고 싶다면', '원국과 십성, 오행으로 성격·재능·관계 경향을 쉬운 말로 풀어 드려요.');
  if (!has('love_deep')) return step('love_deep', '관계가 궁금해졌다면', '연애 기질과 반복되는 패턴, 5년 흐름을 이어서 살펴봐요.');
  return { productId: null, to: '/daily', title: '내일도 만나요', reason: '오늘의 운세를 매일 보면서 연속 출석 도장을 모아 보세요.', cta: '오늘의 운세 보기' };
}
const step = (id: ProductId, title: string, reason: string): NextStep => ({ productId: id, to: CATALOG[id].path, title, reason, cta: `${CATALOG[id].name} 보러 가기` });
