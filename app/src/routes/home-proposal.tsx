import { Link, createFileRoute } from "@tanstack/react-router";
import { FriendImg, MhButton, MhTabBar, CoinBadge } from "@/components/minhwa/ui";
import { ORDER } from "@/components/minhwa/data";

// 홈 화면 개선안 v3(비교용 주소): 스크롤 없이 한 화면(100dvh)에 모두 담는다.
// 위에서 아래로 [상단 줄 · 일러스트 히어로(남는 높이를 모두 쓴다) · 캐릭터 5명 · 대표 버튼 · 바로가기 3개 · 하단 메뉴].
// 화면 높이가 작아도 잘리지 않게 히어로가 줄어들고, 캐릭터·글자 크기는 dvh 기준으로 함께 줄어든다.
export const Route = createFileRoute("/home-proposal")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "홈 개선안 미리보기" },
    ],
  }),
  component: HomeProposal,
});

const LINE = "#c9a76e";
const QUICK = [
  { to: "/quiz", t: "30초 테스트", d: "나와 닮은 친구", bg: "#e3efe6" },
  { to: "/compat", t: "우리 둘의 케미", d: "무료 궁합", bg: "#f7dfd8" },
  { to: "/today", t: "오늘의 운세", d: "하루 한 줄", bg: "#f6ebc6" },
] as const;

function HomeProposal() {
  return (
    <div className="skin-minhwa mh-paper mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden pb-[76px]">
      {/* 상단 줄 */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <span className="mh-title flex items-center gap-1 text-[17px] text-[var(--mh-red)]">
          오행 친구들
          <span className="rounded-[4px] bg-[var(--mh-red)] px-1 text-[11px] text-white">福</span>
        </span>
        <CoinBadge count={0} />
      </div>

      {/* 일러스트 히어로: 남는 높이를 모두 쓴다(최소 높이는 두지 않아 작은 화면에서도 잘리지 않는다) */}
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
        <img
          src="/restore/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "70% 55%" }}
          draggable={false}
        />
        <div className="absolute left-5 top-[8%] w-[60%]">
          <p className="text-[clamp(11px,1.7dvh,13px)] font-bold text-[var(--mh-ink-soft)]">조선시대 감성 사주풀이</p>
          <h1 className="mh-title mt-1 leading-[1.12]" style={{ fontSize: "clamp(24px, 4.8dvh, 36px)" }}>
            태어난 날에
            <br />
            숨겨진
            <br />
            <span className="text-[var(--mh-red)]">나만의 이야기</span>
          </h1>
        </div>
      </div>

      {/* 캐릭터 5명: 히어로 아래쪽에 걸쳐 선다 */}
      <div className="relative z-10 -mt-[clamp(26px,5dvh,44px)] flex shrink-0 items-end justify-center px-2">
        {ORDER.map((k) => (
          <div key={k} className="-mx-0.5 flex flex-1 justify-center">
            <span className="block" style={{ height: "clamp(70px, 13dvh, 112px)" }}>
              <FriendImg kind={k} height={112} />
            </span>
          </div>
        ))}
      </div>

      {/* 대표 버튼 + 바로가기 */}
      <section
        className="mx-3 mt-2 shrink-0 rounded-[22px] border-2 bg-[var(--mh-card)] px-4 pb-3 pt-3 text-center shadow-[0_3px_0_rgba(160,120,70,0.25)]"
        style={{ borderColor: LINE }}
      >
        <p className="text-[clamp(12px,1.9dvh,14px)] font-bold">다섯 오행 친구가 들려주는 나의 성향·연애·일 이야기</p>
        <div className="mt-2">
          <Link to="/input" className="block">
            <MhButton>무료로 내 사주 친구 만나기</MhButton>
          </Link>
        </div>
        <p className="mt-1 text-[11px] text-[var(--mh-ink-soft)]">회원가입 없이 먼저 체험할 수 있어요</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} className="rounded-[14px] border-2 px-1 py-1.5" style={{ borderColor: LINE, background: q.bg }}>
              <p className="mh-title text-[13px] leading-tight">{q.t}</p>
              <p className="text-[10.5px] text-[var(--mh-ink-soft)]">{q.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <MhTabBar active="home" />
    </div>
  );
}
