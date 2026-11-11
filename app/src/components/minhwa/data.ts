// 오행 친구 5종 정의(원본 시안 기준). 이미지는 시안에서 잘라낸 임시 에셋이다(해상도 낮음 → 고해상 원본으로 교체 예정).
export type MhKind = "solri" | "daengi" | "hodongi" | "dalto" | "geobuki";
export type MhElement = "목" | "화" | "토" | "금" | "수";

export const FRIENDS: Record<
  MhKind,
  {
    name: string;
    element: MhElement;
    hanja: string;
    role: string;
    blurb: string[];
    color: string;
    img: string;
  }
> = {
  solri: {
    name: "솔이",
    element: "목",
    hanja: "木",
    role: "푸른 선비",
    blurb: ["평생 사주 안내.", "차분하게", "큰 그림을", "짚어줘요."],
    color: "var(--mh-teal)",
    img: "/restore/characters/solri.png",
  },
  daengi: {
    name: "댕이",
    element: "화",
    hanja: "火",
    role: "댕기머리 소녀",
    blurb: ["연애와 궁합 안내.", "두근두근", "이야기를", "좋아해요."],
    color: "var(--mh-red)",
    img: "/restore/characters/daengi.png",
  },
  hodongi: {
    name: "호동이",
    element: "토",
    hanja: "土",
    role: "인기 호랑이",
    blurb: ["직업과 재물 안내.", "든든하게", "조언을", "저겨요."],
    color: "#b9852a",
    img: "/restore/characters/hodongi.png",
  },
  dalto: {
    name: "달토",
    element: "금",
    hanja: "金",
    role: "달토끼",
    blurb: ["오늘의 운세 안내.", "매일 아침", "한 줄 운을", "건네요."],
    color: "#8a8f98",
    img: "/restore/characters/dalto.png",
  },
  geobuki: {
    name: "거북기",
    element: "수",
    hanja: "水",
    role: "아기 거북",
    blurb: ["대운과 월운 안내.", "느긋하게", "긴 흐름을", "봐요."],
    color: "var(--mh-indigo)",
    img: "/restore/characters/geobuki.png",
  },
};
export const ORDER: MhKind[] = [
  "solri",
  "daengi",
  "hodongi",
  "dalto",
  "geobuki",
];
export const KIND_BY_ELEMENT: Record<MhElement, MhKind> = {
  목: "solri",
  화: "daengi",
  토: "hodongi",
  금: "dalto",
  수: "geobuki",
};

// 오방색: 원국표 칸 색(원본: 목 청록, 화 적, 토 황, 금 백, 수 쪽빛)
export const EL_CELL: Record<MhElement, { bg: string; fg: string }> = {
  목: { bg: "var(--mh-teal)", fg: "#fff" },
  화: { bg: "var(--mh-red)", fg: "#fff" },
  토: { bg: "#d9a63a", fg: "#2b2320" },
  금: { bg: "#e9e7e3", fg: "#2b2320" },
  수: { bg: "var(--mh-indigo)", fg: "#fff" },
};
