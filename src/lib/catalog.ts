export type ProductId = 'character' | 'daily' | 'basic' | 'compatibility' | 'love_deep' | 'date_selection' | 'saju_deep';

export interface Product {
  id: ProductId;
  name: string;
  priceKrw: number;
  coinCost: number;
  status: 'free' | 'active' | 'coming_soon';
  path: string;
  tagline: string;
  length?: [number, number];
  toc: string[];
}

/** 서버 카탈로그가 가격의 원천이다. (supabase/migrations 의 products 시드와 동일해야 한다.) */
export const CATALOG: Record<ProductId, Product> = {
  character: { id: 'character', name: '나의 사주 캐릭터', priceKrw: 0, coinCost: 0, status: 'free', path: '/birth', tagline: '일간으로 만나는 나의 오행 친구', toc: ['캐릭터 이름·칭호', '내 기질', '강점', '약점', '공유 카드'] },
  daily: { id: 'daily', name: '오늘의 운세', priceKrw: 0, coinCost: 0, status: 'free', path: '/daily', tagline: '오늘 하루의 흐름과 작은 행동', toc: ['오늘의 한 문장', '하루 흐름', '일·돈·관계 조언', '작은 행동 제안'] },
  basic: { id: 'basic', name: '기본사주', priceKrw: 900, coinCost: 1, status: 'active', path: '/products/basic', tagline: '원국·성격·재능·직업·재물·관계를 한 번에', length: [1800, 2500], toc: ['원국 핵심', '타고난 성격·기질', '강점·재능', '직업·재물 경향', '관계·연애 경향', '실천 조언'] },
  compatibility: { id: 'compatibility', name: '궁합', priceKrw: 900, coinCost: 1, status: 'active', path: '/products/compatibility', tagline: '두 사람의 결을 소통·갈등·애정표현·생활방식으로', length: [1500, 2000], toc: ['관계 유형', '소통', '갈등·차이', '애정표현', '생활방식', '소통 조언'] },
  love_deep: { id: 'love_deep', name: '심층 연애운', priceKrw: 2900, coinCost: 3, status: 'active', path: '/products/love', tagline: '연애 기질과 앞으로 5년의 흐름', length: [4000, 5000], toc: ['연애 기질', '원하는 관계·상대', '반복되는 관계 패턴', '강점·어려움', '현재 대운', '5개 연도 세운', '조언'] },
  date_selection: { id: 'date_selection', name: '택일', priceKrw: 1900, coinCost: 2, status: 'coming_soon', path: '/products/date-selection', tagline: '결혼·이사·개업·계약·행사 후보일 비교', toc: [] },
  saju_deep: { id: 'saju_deep', name: '심층사주', priceKrw: 3900, coinCost: 4, status: 'coming_soon', path: '/products/saju-deep', length: [7000, 9000], tagline: '대운·세운까지 깊게 보는 종합 사주', toc: [] },
};

/** 엽전 충전 상품 (서버 카탈로그가 가격의 원천). 법률 검토(선불 결제수단·환불 규정) 전에는 라이브 결제 금지. */
export interface CoinPack { id: string; name: string; coins: number; priceKrw: number; badge?: string }
export const COIN_PACKS: CoinPack[] = [
  { id: 'coin_1', name: '한 닢', coins: 1, priceKrw: 900 },
  { id: 'coin_2', name: '두 닢', coins: 2, priceKrw: 1800 },
  { id: 'coin_3', name: '세 닢', coins: 3, priceKrw: 2700, badge: '연애운 1건' },
  { id: 'coin_4', name: '네 닢', coins: 4, priceKrw: 3600 },
];
/** 1닢 = 900원 (묶음 할인 없음: 계산하기 쉽게) */
export const BASE_COIN_PRICE = 900;
export const packPerCoin = (p: CoinPack) => Math.round(p.priceKrw / p.coins);
export type OrderItem = ProductId | 'coin_pack';
export const orderItemName = (item: OrderItem, subjectId?: string) =>
  item === 'coin_pack' ? `엽전 ${COIN_PACKS.find((c) => c.id === subjectId)?.name ?? ''}`.trim() : CATALOG[item].name;

export const PAID_P0: ProductId[] = ['basic', 'compatibility', 'love_deep'];
export const PRODUCT_LIST = Object.values(CATALOG);
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 추천 정책 (PRD 3.2 / 11) */
export const REFERRAL = { rewardCoins: 1, dailyCap: 5, monthlyCap: 30 } as const;
export const COMPAT_RETENTION_DAYS = 30;
export const MAX_REPORT_ATTEMPTS = 3; // 최초 + 재시도 2회
