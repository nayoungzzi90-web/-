import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Friend, type FriendKind } from "@/components/Friends";

export const Route = createFileRoute("/")({ component: Home });

// 서비스 카드마다 사진 한 장. 사진 파일이 없으면 오리 그림으로 대신 보여 준다.
// 사진은 public/characters/ 에 넣는다(권리가 확인된 이미지만).
type Service = {
  id: string;
  title: string;
  desc: string;
  price: string;
  photo: string;
  fallback: FriendKind;
  soon?: boolean;
};

const SERVICES: Service[] = [
  {
    id: "basic",
    title: "기본 사주 풀이",
    desc: "내 사주 한눈에 보기",
    price: "1닢",
    photo: "/characters/basic.jpg",
    fallback: "rabbit",
  },
  {
    id: "love",
    title: "심층 연애운",
    desc: "요즘 연애, 어떻게 될까?",
    price: "2닢",
    photo: "/characters/love.jpg",
    fallback: "ssi",
  },
  {
    id: "compat",
    title: "궁합",
    desc: "우리 둘, 잘 맞을까?",
    price: "1닢",
    photo: "/characters/compat.jpg",
    fallback: "tiger",
  },
  {
    id: "today",
    title: "오늘의 운세",
    desc: "오늘 하루 미리보기",
    price: "무료",
    photo: "/characters/today.jpg",
    fallback: "seonbi",
  },
  {
    id: "date",
    title: "택일",
    desc: "좋은 날 골라드려요",
    price: "2닢",
    photo: "/characters/date.jpg",
    fallback: "turtle",
    soon: true,
  },
  {
    id: "deep",
    title: "심층 사주",
    desc: "평생 흐름까지 깊게",
    price: "3닢",
    photo: "/characters/deep.jpg",
    fallback: "rabbit",
    soon: true,
  },
];

function Thumb({ s }: { s: Service }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // 화면이 열리기 전에 이미 실패한 사진도 오리 그림으로 바꾼다.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  return failed ? (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#2a2a28]">
      <Friend kind={s.fallback} size={110} />
    </div>
  ) : (
    <img
      ref={ref}
      src={s.photo}
      alt={s.title}
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full object-cover"
    />
  );
}

function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#111] px-4 pb-28 pt-8 text-white">
      <header className="text-center">
        <h1 className="text-2xl font-bold">오행 친구들</h1>
        <p className="mt-1 text-sm text-white/60">
          내 사주 속 친구를 만나보세요
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={s.soon}
            className="relative min-w-0 overflow-hidden rounded-3xl bg-[#1d1d1b] text-left disabled:opacity-60"
          >
            <Thumb s={s} />
            <div className="p-3">
              <p className="text-[15px] font-bold">{s.title}</p>
              <p className="mt-0.5 text-xs text-white/60">{s.desc}</p>
              <span className="mt-2 inline-block rounded-full bg-[#3a3a36] px-2.5 py-0.5 text-[11px] font-bold">
                {s.soon ? "준비 중" : s.price}
              </span>
            </div>
          </button>
        ))}
      </div>

      <nav className="fixed inset-x-0 bottom-4 mx-auto flex w-fit gap-3">
        {["홈", "탐색", "마이"].map((t) => (
          <span
            key={t}
            className="flex h-14 w-16 items-center justify-center rounded-2xl bg-[#2c2c2a] text-sm font-bold shadow-lg"
          >
            {t}
          </span>
        ))}
      </nav>
    </main>
  );
}
