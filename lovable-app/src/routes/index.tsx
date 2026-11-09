import { cleanRef } from "@/lib/share";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Friend, FRIEND_INFO, FriendsHero, type FriendKind } from "@/components/Friends";
import { Shell } from "@/components/Shell";
import { PRODUCTS, won } from "@/lib/coins";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s["ref"] === "string" ? { ref: s["ref"] } : {},
  head: () => ({
    meta: [
      { title: "오행 친구들 — 민화 캐릭터로 보는 나의 사주" },
      {
        name: "description",
        content: "생년월일로 나를 닮은 오행 캐릭터, 오늘의 운세, 궁합을 귀엽게 풀어드려요.",
      },
      { property: "og:title", content: "오행 친구들 — 민화 캐릭터 사주" },
      { property: "og:description", content: "나를 닮은 오행 친구를 만나보세요." },
    ],
  }),
  component: Index,
});

const SERVICES = [
  { to: "/character", t: "나의 오행 캐릭터", d: "무료 · 회원가입 없이", g: "tiger" },
  { to: "/today", t: "오늘의 운세", d: "무료 · 매일 새로", g: "rabbit" },
  { to: "/sample", t: "예시 풀이 미리보기", d: "무료 · 풀이가 이렇게 나와요", g: "turtle" },
  {
    to: "/basic",
    t: "기본 사주 풀이",
    d: `${won(PRODUCTS.basic.coins)} · ${PRODUCTS.basic.coins}닢`,
    g: "seonbi",
  },
  {
    to: "/compatibility",
    t: "궁합",
    d: `${won(PRODUCTS.compat.coins)} · ${PRODUCTS.compat.coins}닢`,
    g: "tiger",
  },
  {
    to: "/love",
    t: "심층 연애운",
    d: `${won(PRODUCTS.love.coins)} · ${PRODUCTS.love.coins}닢`,
    g: "ssi",
  },
] as const satisfies readonly { to: string; t: string; d: string; g: FriendKind }[];

function Index() {
  const { ref } = Route.useSearch();
  useEffect(() => {
    const clean = cleanRef(ref);
    if (!clean) return;
    try {
      // 가입 도중 다른 탭·창으로 넘어가도 남도록 localStorage 에 둔다(없으면 sessionStorage)
      localStorage.setItem("ref", clean);
    } catch {
      sessionStorage.setItem("ref", clean);
    }
  }, [ref]);
  return (
    <Shell>
      <div className="card-hanji overflow-hidden">
        <div className="px-5 pb-3 pt-5">
          <p className="text-xs font-bold text-muted-foreground">조선시대 감성 사주풀이</p>
          <h1 className="font-serif text-4xl font-bold leading-tight">오행 친구들</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            나무, 불, 흙, 쇠, 물 다섯 친구가
            <br />
            당신의 길을 안내해요. 생년월일만 알려주세요.
          </p>
        </div>
        <FriendsHero />
        <div className="p-5">
          <Link
            to="/input"
            className="block rounded-full border-2 border-[#2b1d2e] bg-primary py-3 text-center font-bold text-primary-foreground shadow-[3px_3px_0_#2b1d2e]"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
      <h2 className="mt-7 font-serif text-lg font-bold">오행 친구들을 소개해요</h2>
      <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {(Object.keys(FRIEND_INFO) as FriendKind[]).map((k) => {
          const f = FRIEND_INFO[k];
          return (
            <div key={k} className="card-hanji w-28 shrink-0 snap-start p-3 text-center">
              <Friend kind={k} size={56} className="mx-auto" />
              <p className="mt-1 font-serif font-bold">{f.name}</p>
              <p className="text-[10px] font-bold text-primary">
                {f.tag} · {f.role}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{f.line}</p>
            </div>
          );
        })}
      </div>
      <h2 className="mt-7 font-serif text-lg font-bold">풀이 보따리</h2>
      <div className="mt-3 grid gap-3">
        {SERVICES.map((s) => (
          <Link key={s.to} to={s.to} className="card-hanji flex items-center gap-4 p-4">
            <Friend kind={s.g} size={52} className="shrink-0" />
            <span className="flex-1">
              <span className="block font-serif font-bold">{s.t}</span>
              <span className="text-xs text-muted-foreground">{s.d}</span>
            </span>
            <span className="text-primary">›</span>
          </Link>
        ))}
        {["택일", "심층 사주"].map((t) => (
          <div
            key={t}
            className="flex items-center gap-4 rounded-2xl border border-dashed border-border p-4 text-muted-foreground"
          >
            <span className="text-3xl" aria-hidden>
              ⏳
            </span>
            <span className="flex-1 font-serif">{t}</span>
            <span className="text-xs">준비 중</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
