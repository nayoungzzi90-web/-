import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Friend, FRIEND_INFO } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { decodeInvite } from "@/lib/invite";
import { EL_FRIEND, EL_HANJA, EL_WORD, stemElement } from "@/lib/reading";
import { setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/invite")({
  validateSearch: (s: Record<string, unknown>): { c: string } => ({
    c: typeof s["c"] === "string" ? s["c"] : "",
  }),
  component: Invite,
});

function Invite() {
  const { c } = Route.useSearch();
  const nav = useNavigate();
  const { me } = useStore();
  const p = decodeInvite(c);
  if (!p)
    return (
      <Page>
        <section className="px-4 pt-10 text-center">
          <Friend kind="turtle" size={110} className="mx-auto" />
          <p className="font-display mt-3 text-xl">초대 링크를 읽지 못했어요</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            링크가 잘렸거나 바뀌었을 수 있어요. 친구에게 다시 받아주세요.
          </p>
          <Link
            to="/"
            className="font-display mt-5 inline-block rounded-full border-[2.5px] border-[var(--line)] bg-[var(--to)] px-6 py-2.5"
          >
            홈으로 가기
          </Link>
        </section>
      </Page>
    );
  const el = stemElement(p.stem);
  const kind = EL_FRIEND[el];
  const info = FRIEND_INFO[kind];
  return (
    <Page>
      <section className="px-4 pt-6 text-center">
        <p className="text-sm font-bold text-[var(--stamp)]">
          친구가 궁합을 보자고 해요
        </p>
        <h1 className="font-display mt-1 text-[26px] leading-tight">
          {p.name}님의 오행 친구는
          <br />
          {info.name}!
        </h1>
        <div
          className="hj-card mx-auto mt-5 max-w-[300px] px-4 pb-4 pt-5"
          style={{ background: info.tint }}
        >
          <Friend
            kind={kind}
            accessory="sunglasses"
            size={150}
            className="bob mx-auto"
          />
          <p className="font-display mt-1 text-lg">
            {info.role} · {EL_HANJA[el]} {EL_WORD[el]}의 기운
          </p>
        </div>
        <p className="mt-5 text-[15px] leading-relaxed">
          나와 {p.name}님은 어떤 케미일까요?
          <br />내 정보를 넣으면 바로 알려줄게요.
        </p>
        <button
          type="button"
          onClick={() => {
            setStore({ invite: c });
            void nav({ to: me ? "/compat" : "/input" });
          }}
          className="font-display mt-4 w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] active:translate-y-0.5"
        >
          {me ? "바로 우리 궁합 보기" : "내 정보 넣고 궁합 보기"}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          초대 링크에는 이름과 일주 정보만 들어 있어요. 생년월일은 들어 있지
          않아요.
        </p>
      </section>
    </Page>
  );
}
