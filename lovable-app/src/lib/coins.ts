// 엽전(닢) 정책 상수 — 화면 문구의 단일 출처. DB 함수(apply_invite 등)의 값과 같아야 한다.
// DB 쪽은 docs/migrations/REVIEW_ONLY/INVITE_COINS_KST_REVIEW_ONLY.sql (검토용, 운영 미적용)에서 같은 값으로 정의한다.
/** 초대받은 친구가 가입(초대 링크 적용)하면 초대한 사람이 받는 엽전 */
export const INVITE_REWARD = 1;
/** 초대자 한 명이 한국 시간 하루에 받을 수 있는 보상 횟수 */
export const INVITE_DAILY_CAP = 5;
/** 초대자 한 명이 한국 시간 한 달에 받을 수 있는 보상 횟수 */
export const INVITE_MONTHLY_CAP = 30;
/** 가입 보너스 없음(2026-10-21 결정) */
export const SIGNUP_BONUS = 0;
