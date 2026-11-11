import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Friend,
  type FriendKind,
  FRIEND_IMG,
  FRIEND_INFO,
} from "@/components/Friends";
import { Coin, Page } from "@/components/Shell";

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
    fallback: "seonbi",
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
    desc: "우리 둘, 어떤 케미일까요?",
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
    fallback: "rabbit",
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
    fallback: "seonbi",
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
  return (
    <div
      className="mx-auto flex aspect-square w-[86%] items-end justify-center overflow-hidden bg-[#fffaf0]/80"
      style={CLIP[s.shape]}
    >
      <Friend kind={s.fallback} size={118} className="mb-1" />
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
      <section>
        {/* 시안의 한옥 그림(글자 제거본) 위에 제목·족자 글자·캐릭터를 얹는다 */}
        <div
          className="relative overflow-hidden"
          style={{ containerType: "inline-size" }}
        >
          <img
            src="/restore/hero.jpg"
            alt=""
            className="block w-full"
            draggable={false}
          />
          <div
            className="absolute left-0 top-0 px-5 pt-5"
            style={{ fontSize: "min(100%, 16px)" }}
          >
            <p className="flex items-center gap-2 text-[15px]">
              조선시대 감성 사주풀이
              <span className="rounded-[4px] bg-[var(--stamp)] px-1 text-[11px] text-white">
                福
              </span>
            </p>
            <h1 className="font-display mt-1 text-[40px] leading-none">
              오행 친구들
            </h1>
            <p className="mt-3 text-[15px] leading-snug">
              나무, 불, 흙, 쇠, 물 다섯 친구가
              <br />
              당신의 길을 안내해요.
            </p>
          </div>
          <div
            className="absolute flex flex-row-reverse whitespace-nowrap font-bold"
            style={{
              left: "79.5%",
              width: "12.5%",
              top: "54%",
              height: "34%",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: "2.2cqw",
              fontSize: "3.6cqw",
              lineHeight: 1.25,
            }}
          >
            {["복많이", "받으세요"].map((l) => (
              <span key={l} className="flex flex-col items-center">
                {[...l].map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div className="relative bg-[#efe0bf] pb-3 pt-1">
          <div className="relative z-10 flex items-end justify-center px-2">
            {(
              ["seonbi", "ssi", "tiger", "rabbit", "turtle"] as FriendKind[]
            ).map((k) => (
              <div
                key={k}
                className="flex flex-1 items-end justify-center"
                style={{ height: 104 }}
              >
                <img
                  src={FRIEND_IMG[k]}
                  alt={FRIEND_INFO[k].name}
                  className="max-h-full w-[19vw] max-w-[84px] object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 pt-4 text-center">
          <p className="font-display text-[22px] leading-snug">
            태어난 순간의 이야기,
            <br />
            귀엽게 풀어드려요
          </p>
          <Link
            to="/input"
            className="font-display mt-4 block w-full rounded-[24px] border-2 border-[var(--line)] py-3.5 text-lg text-white shadow-[0_3px_0_rgba(43,35,32,0.55)] active:translate-y-0.5"
            style={{ background: "linear-gradient(180deg,#c4452f,#a93421)" }}
          >
            무료로 내 사주 보기 ›
          </Link>
          <Link
            to="/sample"
            className="mt-3 block text-sm text-[var(--ink-soft)] underline"
          >
            샘플 결과 먼저 구경하기
          </Link>
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="font-display text-xl">오늘의 메뉴</h2>
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
