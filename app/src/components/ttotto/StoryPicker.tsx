import { Link } from "@tanstack/react-router";
import { CardArt, CoinIcon } from "@/components/ttotto/Art";
import { TT, won } from "@/lib/ttotto-content";

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
                <CoinIcon size={17} />
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
