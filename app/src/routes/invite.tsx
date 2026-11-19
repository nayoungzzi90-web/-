import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ASSETS, CardArt, TtottoFace } from "@/components/ttotto/Art";
import { decodeInvite } from "@/lib/invite";
import { setStore, useStore } from "@/lib/store";
import { TT } from "@/lib/ttotto-content";

export const Route = createFileRoute("/invite")({
  head: () => ({ meta: [{ title: "친구가 궁합을 보자고 해요 · 또또사주" }] }),
  validateSearch: (s: Record<string, unknown>): { c: string } => ({
    c: typeof s["c"] === "string" ? s["c"] : "",
  }),
  component: Invite,
});

// 궁합 "친구에게 링크 보내기"의 도착 화면(또또사주 말투). 링크에는 이름과 일주 정보만 들어 있다.
function Invite() {
  const { c } = Route.useSearch();
  const nav = useNavigate();
  const { me } = useStore();
  const p = decodeInvite(c);
  return (
    <div className="tt tt-soft tt-detail" style={{ background: "#fffaf2" }}>
      <div className="tt-wrap pb-10">
        <header className="tt-header">
          <Link to="/" className="tt-header-title">
            {TT.brand}
            <TtottoFace size={32} />
          </Link>
        </header>
        {!p ? (
          <main className="mt-8 text-center">
            <img src={ASSETS.heroFlame} alt="" aria-hidden className="mx-auto h-auto w-[34%]" draggable={false} />
            <h1 className="tt-dt-title">초대 링크를 읽지 못했어요</h1>
            <p className="tt-dt-note">링크가 잘렸거나 바뀌었을 수 있어요. 친구에게 다시 받아주세요.</p>
            <Link to="/" className="tt-btn tt-primary mt-5">홈으로 가기</Link>
          </main>
        ) : (
          <main className="mt-5">
            <section className="tt-dt-hero" style={{ ["--tile" as string]: "#e4f1fb" }}>
              <div className="tt-dt-art"><CardArt id="compatibility" fit /></div>
            </section>
            <p className="mt-5 text-center text-[15px] font-bold text-[var(--tt-orange)]">친구가 궁합을 보자고 해요</p>
            <h1 className="tt-dt-title" style={{ marginTop: 6 }}>
              <mark className="tt-mark">{p.name}</mark>님과 나는<br />어떤 케미일까?
            </h1>
            <p className="tt-dt-note">내 정보를 넣으면 바로 알려줄게요.</p>
            <button
              type="button"
              onClick={() => {
                setStore({ invite: c });
                void nav({ to: me ? "/compat" : "/input" });
              }}
              className="tt-btn tt-primary mt-4"
            >
              {me ? "바로 우리 궁합 보기" : "내 정보 넣고 궁합 보기"}
            </button>
            <p className="tt-dt-note" style={{ fontSize: 13 }}>
              초대 링크에는 이름과 일주 정보만 들어 있어요. 생년월일은 들어 있지 않아요.
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
