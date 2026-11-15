import { Link } from "@tanstack/react-router";
import { CardArt, CoinIcon, TtottoFace } from "@/components/ttotto/Art";
import { TT, won } from "@/lib/ttotto-content";

// 이야기 선택 영역(이야기 선택 화면과 홈 아래쪽이 함께 쓴다): 무료 맛보기 배너 + 상품 카드. 지금 열려 있는 상품이 앞에 오고 준비 중인 것은 뒤에 표시한다.
const ordered = [...TT.products].sort((a, b) => Number(b.to !== null) - Number(a.to !== null));

export function FreeBanner() {
  return (
    <Link to="/input" className="tt-card mt-3" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff4d4", minHeight: 48, padding: "8px 14px" }}>
      <TtottoFace size={30} />
      <span className="flex-1 text-[15px] font-extrabold leading-snug">{TT.stories.freeEntry}</span>
      <span aria-hidden className="font-extrabold">→</span>
    </Link>
  );
}

export function ProductGrid() {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      {ordered.map((p, i) => {
        const last = i === ordered.length - 1;
        const soon = p.to === null;
        return (
          <li key={p.id} className={last ? "min-[380px]:col-span-2" : undefined}>
            <Link
              to="/story/$id"
              params={{ id: p.id }}
              className="tt-card h-full"
              style={{ background: p.bg }}
              aria-label={`${p.title} ${won(p.price)}. ${p.question}${soon ? ". 준비 중" : ""}`}
            >
              <span className={`flex gap-2 ${last ? "items-center" : "items-start"}`}>
                <CardArt id={p.id} widthPct={last ? 30 : 34} />
                <span className="min-w-0 flex-1">
                  <h2>
                    <span>{p.title}</span>
                    <span className="tt-price">{won(p.price)}</span>
                  </h2>
                  <p className="tt-q">{p.question}</p>
                  {soon && <span className="tt-soon">준비 중</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export const PRICE_NOTE = "가격을 보는 것만으로는 결제되지 않아요. 지금은 결제가 열려 있지 않아서, 상품을 눌러 내용을 먼저 확인할 수 있어요.";

/** 홈 상품(정리판 v12): 2열 카드. 위에 그림, 아래 왼쪽에 이름·주제, 오른쪽에 동전 알약(동전 수 = 가격). 마지막 시즌 상품은 가로 카드. */
export function HomeTiles() {
  const basePrice = Math.min(...TT.products.map((p) => p.price));
  return (
    <ul className="tt-cards">
      {TT.products.map((p, i) => {
        const wide = i === TT.products.length - 1;
        const coins = Math.max(1, Math.round(p.price / basePrice));
        return (
          <li key={p.id} className={wide ? "is-wide" : undefined}>
            <Link
              to="/story/$id"
              params={{ id: p.id }}
              className={wide ? "tt-card tt-card-wide" : "tt-card"}
              style={{ ["--tile" as string]: p.bg }}
              aria-label={`${p.title} ${won(p.price)}. ${p.topics.join(", ")}`}
            >
              <span className="tt-card-pill" aria-hidden>
                <CoinIcon size={22} />
                <b>{coins}</b>
              </span>
              <span className="tt-card-art">
                <CardArt id={p.id} fit />
              </span>
              <span className="tt-card-main">
                <span className={p.title.length > 5 ? "tt-card-title is-long" : "tt-card-title"}>{p.title}</span>
                <span className="tt-card-sub">{p.topics.join(" · ")}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
