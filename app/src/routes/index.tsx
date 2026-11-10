import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Friend, type FriendKind } from "@/components/Friends";
import { Coin, Page } from "@/components/Shell";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/")({ component: Home });

// 서비스 카드마다 사진 한 장(없으면 오리 그림). 사진은 public/characters/ 에 넣는다(권리가 확인된 이미지만).
type Shape = "arch" | "moon" | "hex" | "squircle";
type Service = {
  id: string;
  title: string;
  desc: string;
  price: string;
  photo: string;
  fallback: FriendKind;
  bg: string;
  shape: Shape;
  soon?: boolean;
  to?: "/input" | "/today" | "/compat";
};

const SERVICES: Service[] = [
  {
    id: "basic",
    title: "내 사주 보기",
    desc: "내 사주 속 오행 친구 만나기",
    price: "무료",
    photo: "/characters/basic.jpg",
    fallback: "rabbit",
    bg: "#e9e5f6",
    shape: "arch",
    to: "/input",
  },
  {
    id: "love",
    title: "연애운",
    desc: "썸·결혼운·재회운까지",
    price: "2",
    photo: "/characters/love.jpg",
    fallback: "ssi",
    bg: "#fbd9d4",
    shape: "moon",
    soon: true,
  },
  {
    id: "compat",
    title: "궁합",
    desc: "우리 둘, 어떤 케미일까꽥?",
    price: "무료",
    photo: "/characters/compat.jpg",
    fallback: "tiger",
    bg: "#f8e4ae",
    shape: "hex",
    to: "/compat",
  },
  {
    id: "today",
    title: "오늘의 복주머니",
    desc: "하루 한 번 공짜 운세",
    price: "무료",
    photo: "/characters/today.jpg",
    fallback: "seonbi",
    bg: "#d3ead9",
    shape: "squircle",
    to: "/today",
  },
  {
    id: "date",
    title: "택일",
    desc: "좋은 날 골라드려요",
    price: "2",
    photo: "/characters/date.jpg",
    fallback: "turtle",
    bg: "#d5e1f3",
    shape: "arch",
    soon: true,
  },
  {
    id: "deep",
    title: "심층 사주",
    desc: "평생 흐름까지 깊게",
    price: "3",
    photo: "/characters/deep.jpg",
    fallback: "rabbit",
    bg: "#e4e2ee",
    shape: "moon",
    soon: true,
  },
];

const CLIP: Record<Shape, React.CSSProperties> = {
  arch: { borderRadius: "999px 999px 22px 22px" },
  moon: { borderRadius: "50%" },
  hex: {
    clipPath: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)",
  },
  squircle: { borderRadius: "34%" },
};

function Thumb({ s }: { s: Service }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // 화면이 열리기 전에 이미 실패한 사진도 오리 그림으로 바꾼다.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  return (
    <div
      className="mx-auto aspect-square w-[86%] overflow-hidden bg-[#fffaf0]/70"
      style={CLIP[s.shape]}
    >
      {failed ? (
        <div className="flex h-full items-center justify-center">
          <Friend kind={s.fallback} size={118} />
        </div>
      ) : (
        <img
          ref={ref}
          src={s.photo}
          alt={s.title}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function Card({ s, children }: { s: Service; children: React.ReactNode }) {
  const cls = "hj-card relative block min-w-0 px-2 pb-3 pt-4 text-left";
  if (s.to && !s.soon)
    return (
      <Link to={s.to} className={cls} style={{ background: s.bg }}>
        {children}
      </Link>
    );
  return (
    <div
      className={`${cls} opacity-60`}
      style={{ background: s.bg }}
      aria-disabled="true"
    >
      {children}
    </div>
  );
}

function Home() {
  return (
    <Page>
      <section className="px-4 pt-4 text-center">
        <Storefront />
        <h1 className="font-display mt-4 text-[27px] leading-tight">
          내 운세는
          <br />
          <span className="text-[var(--stamp)]">오리</span>가 알고 있꽥!
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          생년월일만 알려주면 오행 친구가 찾아와요
        </p>
        <Link
          to="/input"
          className="font-display mt-4 block w-full rounded-full border-[2.5px] border-[var(--line)] bg-[var(--stamp)] py-3.5 text-lg text-white shadow-[4px_4px_0_var(--line)] active:translate-y-0.5 active:shadow-[2px_2px_0_var(--line)]"
        >
          내 사주 뽑으러 가기
        </Link>
        <Link
          to="/sample"
          className="mt-3 block text-sm text-[var(--ink-soft)] underline"
        >
          샘플 결과 먼저 구경하기
        </Link>
      </section>

      <section className="mt-8 px-4">
        <h2 className="font-display text-xl">오늘의 점집 메뉴</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <Card key={s.id} s={s}>
              <Thumb s={s} />
              <div className="mt-2.5 flex items-start justify-between gap-1 px-1">
                <p className="font-display text-[17px] leading-tight">
                  {s.title}
                </p>
                {s.soon ? (
                  <span className="shrink-0 rounded-md border-2 border-[var(--ink-soft)] px-1.5 text-[11px] font-extrabold text-[var(--ink-soft)]">
                    준비중
                  </span>
                ) : (
                  <span className="stamp shrink-0">
                    {s.price === "무료" ? (
                      "무료"
                    ) : (
                      <>
                        <Coin size={12} />
                        {s.price}
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-0.5 px-1 text-xs text-[var(--ink-soft)]">
                {s.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <div className="hj-card bg-[var(--su)] p-4 text-[#fffaf0]">
          <p className="font-display text-lg">오행 친구는 다섯 마리</p>
          <p className="mt-0.5 text-xs text-[#d8d4e6]">
            나의 일간이 정하는 내 친구는 누구일까?
          </p>
          <div className="mt-3 flex justify-between">
            {(
              ["seonbi", "ssi", "tiger", "rabbit", "turtle"] as FriendKind[]
            ).map((k, i) => (
              <div key={k} className="text-center">
                <div
                  className="rounded-2xl p-1"
                  style={{
                    background: [
                      "#3b8f7b",
                      "#d6463a",
                      "#e8b23a",
                      "#ece8df",
                      "#4a4d78",
                    ][i],
                  }}
                >
                  <Friend kind={k} size={52} />
                </div>
                <p className="mt-1 text-[11px] font-bold">
                  {["목", "화", "토", "금", "수"][i]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          풀이는 참고용 재미예요. 계산 근거와 한계는 결과 화면에 함께 적어 둬요.
        </p>
      </section>
    </Page>
  );
}
