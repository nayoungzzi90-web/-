import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import hero from "@/assets/hero.jpg";
import { Shell } from "@/components/Shell";

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
  { to: "/character", t: "나의 오행 캐릭터", d: "무료 · 회원가입 없이", e: "🐯" },
  { to: "/today", t: "오늘의 운세", d: "무료 · 매일 새로", e: "☀️" },
  { to: "/basic", t: "기본 사주 풀이", d: "990원 · 4닢", e: "📜" },
  { to: "/compatibility", t: "궁합", d: "990원 · 4닢", e: "💞" },
  { to: "/love", t: "심층 연애운", d: "3,900원 · 12닢", e: "🌸" },
] as const;

function Index() {
  const { ref } = Route.useSearch();
  useEffect(() => {
    if (ref) sessionStorage.setItem("ref", ref);
  }, [ref]);
  return (
    <Shell>
      <div className="card-hanji overflow-hidden">
        <img
          src={hero}
          alt="민화풍 오행 친구들: 호랑이, 학, 토끼, 까치, 거북"
          width={1024}
          height={768}
          className="w-full"
        />
        <div className="p-5">
          <h1 className="font-serif text-2xl font-bold leading-snug">
            나를 닮은
            <br />
            <span className="text-primary">오행 친구</span>는 누구일까?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            생년월일만 알려주면 열 친구 중 나의 짝꿍을 찾아드려요.
          </p>
          <Link
            to="/input"
            className="mt-4 block rounded-full bg-primary py-3 text-center font-bold text-primary-foreground"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
      <h2 className="mt-7 font-serif text-lg font-bold">풀이 보따리</h2>
      <div className="mt-3 grid gap-3">
        {SERVICES.map((s) => (
          <Link key={s.to} to={s.to} className="card-hanji flex items-center gap-4 p-4">
            <span className="text-3xl" aria-hidden>
              {s.e}
            </span>
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
