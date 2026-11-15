// 또또사주 화면 문구·가격의 단일 원본(ttotto_design_handoff/content.json 2026-11-15 그대로).
// 가격은 사용자 제안값(기본사주 900원, 나머지 1,900원)이며 표시용이다. 서버 결제 상품 금액(lovable-app/src/lib/coins.ts 의 닢 가격: 기본 900·궁합 900·연애운 1,800 등)과는 아직 다르고,
// 결제는 꺼져 있다(PAYMENTS_MODE). 이 파일은 결제를 일으키지 않는다.
export const TT = {
  brand: "또또사주",
  mascot: "또또",
  cookieName: "오늘의 운세쿠키",
  // 2026-11-15 상품 구성(사용자 제안, 표시용): 기본사주 900원, 나머지 1,900원. 결과 해석 엔진은 그대로이며 준비된 흐름만 연결한다(to).
  products: [
    { id: "basic", title: "기본사주", price: 900, question: "내 타고난 강점은?", topics: ["성향", "강점", "기본사주"], bg: "#edf6df", to: "/input" },
    { id: "love", title: "연애운·결혼운", price: 1900, question: "내 인연은 언제쯤?", topics: ["연애 성향", "인연", "결혼"], bg: "#fce6e8", to: null },
    { id: "career", title: "진로운·사업운", price: 1900, question: "어떤 일이 나랑 맞을까?", topics: ["진로", "사업", "일하는 방식"], bg: "#fff4d4", to: null },
    { id: "compatibility", title: "궁합", price: 1900, question: "우린 어떤 점이 잘 맞을까?", topics: ["성격 조화", "관계", "소통"], bg: "#e4f1fb", to: "/compat" },
    { id: "family", title: "임신운·자식운", price: 1900, question: "아이와의 인연은 어떨까?", topics: ["자녀와의 인연", "가족 계획"], bg: "#eee4fb", to: null },
  ],
  home: { title: "내 사주, 한 편의 웹툰", speech: "어떤 이야기가 궁금해?", primary: "또또랑 사주 보러 가기", secondary: "오늘의 운세쿠키", badge: "무료" },
  stories: { title: "궁금한 이야기를 골라봐", freeEntry: "처음이라면? 무료 웹툰 먼저 보기" },
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
