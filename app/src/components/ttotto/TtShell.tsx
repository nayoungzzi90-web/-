import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { TtottoFace } from "@/components/ttotto/Art";

/** 또또사주 화면 공용 껍데기: 뒤로가기 + 제목 머리글. (옛 화면의 하단 메뉴·로그인·닢 표시는 쓰지 않는다) */
export function TtShell({ title, children, pb = "pb-10" }: { title: string; children: ReactNode; pb?: string }) {
  const nav = useNavigate();
  const back = () => (window.history.length > 1 ? window.history.back() : void nav({ to: "/" }));
  return (
    <div className="tt">
      <div className={`tt-wrap ${pb}`}>
        <header className="tt-header">
          <button type="button" className="tt-back" onClick={back} aria-label="뒤로 가기">
            <span aria-hidden className="text-[24px] font-extrabold">←</span>
          </button>
          <Link to="/" className="tt-header-title">
            {title}
            <TtottoFace size={32} />
          </Link>
        </header>
        <main className="mt-4">{children}</main>
      </div>
    </div>
  );
}
