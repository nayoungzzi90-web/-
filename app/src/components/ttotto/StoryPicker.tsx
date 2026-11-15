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

/** 홈 상품 타일(시안 배치): 삽화 왼쪽, 제목+가격 한 줄, 아래에 주제 줄. 신년운세는 전체 폭. */
export function HomeTiles() {
  return (
    <ul className="tt-t2-grid mt-3 grid grid-cols-2 gap-2.5">
      {TT.products.map((p, i) => {
        const soon = p.to === null;
        const last = i === TT.products.length - 1;
        return (
          <li key={p.id} className={last ? "col-span-2" : undefined}>
            <Link
              to="/story/$id"
              params={{ id: p.id }}
              className={`tt-t2 ${soon ? "tt-t2-soon" : "tt-t2-on"}`}
              style={{ background: p.bg }}
              aria-label={`${p.title} ${won(p.price)}. ${p.topics.join(", ")}${soon ? ". 준비 중" : ""}`}
            >
              {soon && <span className="tt-soon-band">준비 중</span>}
              <span className="tt-t2-art"><CardArt id={p.id} widthPct={last ? 30 : 66} /></span>
              <span className="tt-t2-title">{p.title}</span>
              <span className="tt-t2-plain-price">{won(p.price)}</span>
              <span className="tt-t2-topics">{p.topics.join(" · ")}</span>
              {!soon && <span className="tt-go-btn">지금 보기 <span aria-hidden>→</span></span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
