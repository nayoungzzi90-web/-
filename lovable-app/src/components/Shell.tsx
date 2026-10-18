import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Sparkles, Sun, Heart, User } from "lucide-react";
import { useStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "홈", icon: Home },
  { to: "/character", label: "캐릭터", icon: Sparkles },
  { to: "/today", label: "오늘운세", icon: Sun },
  { to: "/compatibility", label: "궁합", icon: Heart },
  { to: "/my", label: "마이", icon: User },
] as const;

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { coins, signedIn } = useStore();
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/" className="font-serif text-lg font-bold text-primary">오행 친구들</Link>
        {title && <span className="font-serif text-sm text-muted-foreground">{title}</span>}
        {signedIn
          ? <Link to="/invite" className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-foreground">🪙 {coins}냥</Link>
          : <Link to="/auth" className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-foreground">로그인</Link>}
      </header>
      <main className="px-4 py-5">{children}</main>
      <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-border bg-card py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex flex-col items-center gap-0.5 px-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary font-bold" }}>
            <Icon className="h-5 w-5" aria-hidden />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function MockBadge() {
  return <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">시범 계산 · 검증 중 (R-001)</span>;
}

export function NeedBirth({ to = "/input" }: { to?: "/input" }) {
  return (
    <div className="card-hanji p-6 text-center">
      <p className="text-4xl">📜</p>
      <p className="mt-3 font-serif text-lg">먼저 생년월일을 알려주세요</p>
      <Link to={to} className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground">출생정보 입력</Link>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-hanji mt-4 p-5">
      <h2 className="mb-2 font-serif text-base font-bold text-secondary">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
