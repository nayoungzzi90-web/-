// 또또사주 삽화(2026-11-15 투명 PNG 15종, 여백을 잘라 WebP 로 줄인 사본: public/assets/ttotto, 원본: design/ttotto-original).
// 그림은 이미지 파일을 그대로 쓰고 CSS/이모지로 다시 그리지 않는다.
export const A = (name: string) => `/assets/ttotto/${name}.webp`;
export const ASSETS = {
  bodyNormal: A("ttotto-body-normal"),
  bodySurprised: A("ttotto-body-surprised"),
  handLeft: A("ttotto-hand-left"),
  handRight: A("ttotto-hand-right"),
  cookieClosed: A("cookie-closed"),
  cookieLeft: A("cookie-left"),
  cookieRight: A("cookie-right"),
  paper: A("fortune-paper"),
  flame: A("flame-friend"),
  bookHome: A("ttotto-book-home"),
} as const;
export const COOKIE_PRELOAD = [ASSETS.bodyNormal, ASSETS.bodySurprised, ASSETS.handLeft, ASSETS.handRight, ASSETS.cookieClosed, ASSETS.cookieLeft, ASSETS.cookieRight, ASSETS.paper];

/** 로고 얼굴: 정면 몸통 그림의 머리 부분만 보이게 자른다(그림 파일 그대로). */
export function TtottoFace({ size = 34 }: { size?: number }) {
  return (
    <span aria-hidden className="relative inline-block shrink-0 overflow-hidden" style={{ width: size, height: Math.round(size * 0.94) }}>
      <img src={ASSETS.bodyNormal} alt="" className="absolute left-0 top-0 block w-full" draggable={false} />
    </span>
  );
}

const CARD_IMG: Record<string, { src: string; ratio: number }> = {
  basic: { src: A("card-my-saju"), ratio: 372 / 560 },
  love: { src: A("card-love"), ratio: 527 / 560 },
  compatibility: { src: A("card-compatibility"), ratio: 560 / 427 },
  date: { src: A("card-date"), ratio: 560 / 545 },
  year: { src: A("card-new-year"), ratio: 560 / 413 },
};
/** 상품 카드 삽화(높이 기준). */
export function CardArt({ id, height = 44 }: { id: string; height?: number }) {
  const c = CARD_IMG[id] ?? CARD_IMG["basic"]!;
  const w = Math.round(height * 1.3);
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center" style={{ width: w, height }}>
      <img src={c.src} alt="" style={{ maxWidth: w, maxHeight: height, width: "auto", height: "auto" }} draggable={false} />
    </span>
  );
}

/** 쿠키 아이콘(홈 보조 버튼용): 닫힌 쿠키 그림. */
export function CookieIcon({ className = "" }: { className?: string }) {
  return <img src={ASSETS.cookieClosed} alt="" aria-hidden className={className} draggable={false} />;
}
