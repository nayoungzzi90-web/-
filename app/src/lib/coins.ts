// 엽전(닢) 표시 정책 상수 — 화면 문구의 단일 출처(옛 앱 coins.ts 에서 필요한 것만 복원).
// 서버 가격표·결제와는 이어져 있지 않다(결제 꺼짐). 운영 DB 가격 적용은 별도 승인.

/** 1닢 = 1,000원(2026-11-15 사용자 결정). */
export const COIN_KRW = 1000;
export const won = (coins: number) => `${(coins * COIN_KRW).toLocaleString("ko-KR")}원`;
