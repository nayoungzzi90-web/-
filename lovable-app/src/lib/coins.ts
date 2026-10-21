// 엽전(닢) 정책 상수 — 화면 문구의 단일 출처. DB(가격표·함수)의 값과 같아야 한다.
// DB 쪽은 docs/migrations/REVIEW_ONLY/ 의 PRICING_900_COIN_REVIEW_ONLY.sql, INVITE_COINS_KST_REVIEW_ONLY.sql (검토용, 운영 미적용).

/** 1닢 = 900원(부가세 포함 판매가) */
export const COIN_KRW = 900;

/** 상품별 가격(닢). 2026-10-21 결정: 기본 900·궁합 900·연애운 1,800·택일 1,800·심층사주 2,700원 */
export const PRODUCTS = {
  basic: { label: "기본 사주", coins: 1 },
  compat: { label: "궁합", coins: 1 },
  love: { label: "심층 연애운", coins: 2 },
  taekil: { label: "택일", coins: 2 },
  deep: { label: "심층 사주", coins: 3 },
} as const;
export type ProductKey = keyof typeof PRODUCTS;

export const won = (coins: number) => `${(coins * COIN_KRW).toLocaleString("ko-KR")}원`;

/** 초대받은 친구가 가입(초대 링크 적용)하면 초대한 사람이 받는 엽전 */
export const INVITE_REWARD = 1;
/** 초대자 한 명이 한국 시간 하루에 받을 수 있는 보상 횟수(보수적으로 시작, 지표를 보고 조정) */
export const INVITE_DAILY_CAP = 3;
/** 초대자 한 명이 한국 시간 한 달에 받을 수 있는 보상 횟수 */
export const INVITE_MONTHLY_CAP = 10;
/** 보상을 받으려면 초대한 사람이 엽전을 이만큼 이상 결제(환불 제외)한 적이 있어야 한다 */
export const INVITER_MIN_PAID_COINS = 1;
/** 가입 보너스 없음(2026-10-21 결정) */
export const SIGNUP_BONUS = 0;
