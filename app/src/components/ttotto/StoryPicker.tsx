import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CardArt, TtottoFace } from "@/components/ttotto/Art";
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

/** 홈 상품(정리판 v5): 핵심 4개는 2열 큰 칸(그림·이름·주제·가격), 나머지는 "더 보기"로 펼친다. */
const FEATURED = 4;
export function HomeTiles() {
  const [open, setOpen] = useState(false);
  const main = TT.products.slice(0, FEATURED);
  const rest = TT.products.slice(FEATURED);
  return (
    <div className="mt-3">
      <ul className="tt-mini-grid">
        {main.map((p) => (
          <li key={p.id}>
            <Link
              to="/story/$id"
              params={{ id: p.id }}
              className="tt-mini"
              style={{ ["--tile" as string]: p.bg }}
              aria-label={`${p.title} ${won(p.price)}. ${p.topics.join(", ")}`}
            >
              <span className="tt-mini-art">
                <CardArt id={p.id} fit />
              </span>
              <span className="tt-mini-head">
                <span className="tt-mini-title">{p.title}</span>
                <span className="tt-mini-price">{won(p.price)}</span>
              </span>
              <span className="tt-mini-sub">{p.topics.join(" · ")}</span>
            </Link>
          </li>
        ))}
      </ul>

      <button type="button" className="tt-more" aria-expanded={open} aria-controls="tt-more-list" onClick={() => setOpen((v) => !v)}>
        {open ? "접기" : `다른 이야기 ${rest.length}개 더 보기`}
        <span aria-hidden className={open ? "tt-more-chev is-open" : "tt-more-chev"}>⌄</span>
      </button>

      {open && (
        <ul id="tt-more-list" className="tt-rows">
          {rest.map((p) => (
            <li key={p.id}>
              <Link
                to="/story/$id"
                params={{ id: p.id }}
                className="tt-row"
                style={{ ["--tile" as string]: p.bg }}
                aria-label={`${p.title} ${won(p.price)}. ${p.topics.join(", ")}`}
              >
                <span className="tt-row-art">
                  <CardArt id={p.id} fit />
                </span>
                <span className="tt-row-main">
                  <span className="tt-mini-head tt-mini-head-left">
                    <span className="tt-row-title">{p.title}</span>
                    <span className="tt-mini-price">{won(p.price)}</span>
                  </span>
                  <span className="tt-row-sub">{p.topics.join(" · ")}</span>
                </span>
                <span aria-hidden className="tt-row-chev">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
