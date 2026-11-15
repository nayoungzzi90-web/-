// 또또사주 화면 문구·가격의 단일 원본(ttotto_design_handoff/content.json 2026-11-15 그대로).
// 가격은 2026-11-15 최종 확정 표기값(일반 1,900원·신년 2,900원)이며 표시용이다. 서버 결제 상품 금액(lovable-app/src/lib/coins.ts 의 닢 가격: 기본 900·궁합 900·연애운 1,800 등)과는 아직 다르고,
// 결제는 꺼져 있다(PAYMENTS_MODE). 이 파일은 결제를 일으키지 않는다.
export const TT = {
  brand: "또또사주",
  mascot: "또또",
  cookieName: "오늘의 운세쿠키",
  // 2026-11-15 디자인 보드(개정판) 기준 상품 구성과 표시 가격. 해석 엔진·서버 결제는 그대로이며 준비된 흐름만 연결한다(to).
  products: [
    { id: "basic", title: "내 사주", price: 1900, question: "내 타고난 강점은?", topics: ["성향", "강점", "기본사주"], bg: "#edf6df", to: "/input" },
    { id: "compatibility", title: "궁합", price: 1900, question: "우린 어떤 점이 잘 맞을까?", topics: ["성격 조화", "관계", "소통"], bg: "#e4f1fb", to: "/compat" },
    { id: "love", title: "연애운", price: 1900, question: "내 인연은 언제쯤?", topics: ["연애 성향", "인연", "결혼"], bg: "#fce6e8", to: null },
    { id: "money", title: "재물운", price: 1900, question: "내 돈 흐름은 어떨까?", topics: ["수입", "저축", "올해 흐름"], bg: "#fff1c9", to: null },
    { id: "career", title: "직업·진로운", price: 1900, question: "나에게 맞는 일은 뭘까?", topics: ["적성", "이직", "일 스타일"], bg: "#dff3ee", to: null },
    { id: "date", title: "택일", price: 1900, question: "중요한 시작, 언제가 좋을까?", topics: ["결혼", "이사", "개업"], bg: "#fff4d4", to: null },
    { id: "year", title: "신년운세", price: 2900, question: "새해엔 어떤 기회가 찾아올까?", topics: ["한 해 흐름", "재물", "일", "연애"], bg: "#eee4fb", to: null },
  ],
  home: { title: "또또와 알아보는 나의 사주", speech: "어떤 이야기가 궁금해?", primary: "또또랑 사주 보러 가기", secondary: "오늘의 운세쿠키", badge: "무료" },
  stories: { title: "궁금한 이야기를 골라봐", freeEntry: "처음이라면? 내 사주 무료로 맛보기" },
  cookie: {
    title: "오늘의 운세쿠키",
    headline: "오늘의 운세쿠키가 도착했어.",
    subtitle: "또또와 함께 열어볼까?",
    button: "쿠키열기",
    footer: "오늘 받은 쪽지는 다시 볼 수 있어요.",
  },
  sampleResult: {
    label: "결과 예시",
    title: "먼저 건네는 한마디",
    message: "작은 표현이 관계를 부드럽게 만드는 날.",
    actionTitle: "오늘의 작은 실천",
    action: "고마운 사람에게 안부를 전해봐요.",
    share: "오늘의 쪽지 공유하기",
    save: "내 쪽지함에 저장",
    footer: "내일 또 새로운 쿠키가 기다려요.",
  },
} as const;

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export type TtProduct = (typeof TT.products)[number];
