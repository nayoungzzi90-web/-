// 십성 이름 계산(결정론 공식). 일간 기준으로 대상 천간의 오행 관계와 음양만 본다.
// 이름을 붙이는 것까지만 한다. 십성이 '무엇을 뜻하는지'의 해석은 전문가 검증 전이라 풀이 문장에 쓰지 않는다.
export type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

const ELEMENT_INDEX = (stem: number) => Math.floor((((stem % 10) + 10) % 10) / 2); // 목0 화1 토2 금3 수4
const isYang = (stem: number) => stem % 2 === 0;

/** dm: 일간(0~9), stem: 대상 천간(0~9) */
export function tenGodOf(dm: number, stem: number): TenGod {
  const diff = (ELEMENT_INDEX(stem) - ELEMENT_INDEX(dm) + 5) % 5;
  const same = isYang(dm) === isYang(stem);
  switch (diff) {
    case 0:
      return same ? "비견" : "겁재";
    case 1:
      return same ? "식신" : "상관"; // 내가 낳는 오행
    case 2:
      return same ? "편재" : "정재"; // 내가 다스리는 오행
    case 3:
      return same ? "편관" : "정관"; // 나를 다스리는 오행
    default:
      return same ? "편인" : "정인"; // 나를 낳아 주는 오행
  }
}

/** 관계의 이름 설명(정의). 운세 해석이 아니다. */
export const TEN_GOD_NOTE: Record<TenGod, string> = {
  비견: "나와 같은 오행, 같은 음양",
  겁재: "나와 같은 오행, 다른 음양",
  식신: "내가 낳는 오행, 같은 음양",
  상관: "내가 낳는 오행, 다른 음양",
  편재: "내가 다스리는 오행, 같은 음양",
  정재: "내가 다스리는 오행, 다른 음양",
  편관: "나를 다스리는 오행, 같은 음양",
  정관: "나를 다스리는 오행, 다른 음양",
  편인: "나를 낳아 주는 오행, 같은 음양",
  정인: "나를 낳아 주는 오행, 다른 음양",
};
