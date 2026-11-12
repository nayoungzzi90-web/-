import { Link, createFileRoute } from "@tanstack/react-router";
import { FriendImg, MhButton, MhTabBar, CoinBadge } from "@/components/minhwa/ui";
import { FRIENDS, ORDER } from "@/components/minhwa/data";

// 홈 화면 개선안 미리보기 v2(비교용 주소). 운영 홈(/)은 그대로 두고, 복원한 조선 민화 일러스트(한옥·소나무·산)를 크게 쓴 구성이다.
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

function HomeProposal() {
  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md">
        {/* 1. 일러스트 히어로: 한옥 처마·소나무·산 위에 제목 */}
        <div className="relative h-[310px] overflow-hidden">
          <img
            src="/restore/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "68% 50%" }}
            draggable={false}
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4">
            <span className="rounded-full border-2 bg-[var(--mh-card)]/90 px-3 py-1 text-[13px] font-extrabold" style={{ borderColor: "var(--mh-ink)" }}>
              오행 친구들 <span className="ml-1 rounded-[4px] bg-[var(--mh-red)] px-1 text-[11px] text-white">福</span>
            </span>
            <CoinBadge count={0} />
          </div>
          <div className="absolute left-5 top-[72px] w-[62%]">
            <p className="text-[13px] font-bold text-[var(--mh-ink-soft)]">조선시대 감성 사주풀이</p>
            <h1 className="mh-title mt-1 text-[34px] leading-[1.12]">
              태어난 날에
              <br />
              숨겨진
              <br />
              <span className="text-[var(--mh-red)]">나만의 이야기</span>
            </h1>
          </div>
        </div>

        {/* 2. 캐릭터 5명이 히어로 위에 걸쳐 서 있다 */}
        <div className="relative z-10 -mt-14 flex items-end justify-center px-2">
          {ORDER.map((k) => (
            <div key={k} className="-mx-0.5 flex-1 text-center">
              <FriendImg kind={k} height={112} />
            </div>
          ))}
        </div>

        {/* 3. 대표 버튼 */}
        <section className="mx-3 mt-3 rounded-[24px] border-2 bg-[var(--mh-card)] px-5 pb-5 pt-5 text-center shadow-[0_3px_0_rgba(160,120,70,0.25)]" style={{ borderColor: LINE }}>
          <p className="text-[15px] font-bold">다섯 오행 친구가 들려주는 나의 성향, 연애, 일 이야기</p>
          <div className="mt-4">
            <Link to="/input" className="block">
              <MhButton>무료로 내 사주 친구 만나기</MhButton>
            </Link>
          </div>
          <p className="mt-2 text-[12px] text-[var(--mh-ink-soft)]">회원가입 없이 먼저 체험할 수 있어요</p>
        </section>

        {/* 4. 오행 친구 소개: 가로로 넘겨 보는 카드 */}
        <div className="mt-7 flex items-end justify-between px-4">
          <h2 className="mh-title text-[20px]">나는 어떤 오행 친구일까?</h2>
          <Link to="/quiz" className="text-[13px] font-bold text-[var(--mh-red)]">
            30초 테스트 ›
          </Link>
        </div>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {ORDER.map((k) => {
            const f = FRIENDS[k];
            return (
              <Link
                key={k}
                to="/quiz"
                className="relative w-[150px] shrink-0 snap-start overflow-hidden rounded-[22px] border-2 px-3 pb-3 pt-3 text-center"
                style={{ borderColor: LINE, background: "var(--mh-card)" }}
              >
                <span className="absolute right-2 top-1 text-[34px] font-black opacity-15" aria-hidden>
                  {f.hanja}
                </span>
                <FriendImg kind={k} height={104} />
                <p className="mh-title mt-1 text-[18px]">{f.name}</p>
                <p className="text-[12px] font-bold" style={{ color: f.color }}>
                  {f.element} · {f.role}
                </p>
              </Link>
            );
          })}
        </div>

        {/* 5. 친구랑 같이 */}
        <h2 className="mh-title mt-7 px-4 text-[20px]">친구랑 같이 하면 더 재미있어요</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          <Link to="/quiz" className="relative overflow-hidden rounded-[22px] border-2 px-4 py-4" style={{ borderColor: LINE, background: "#e3efe6" }}>
            <img src="/restore/deco/cloud.svg" alt="" className="absolute -right-4 -top-2 w-20 opacity-70" draggable={false} />
            <p className="mh-title relative text-[17px] leading-tight">우리 모임 오행 지도</p>
            <p className="relative mt-1 text-[12px] text-[var(--mh-ink-soft)]">친구 5명이 모이면 우리 모임의 오행이 완성돼요</p>
          </Link>
          <Link to="/compat" className="relative overflow-hidden rounded-[22px] border-2 px-4 py-4" style={{ borderColor: LINE, background: "#f7dfd8" }}>
            <img src="/restore/deco/blossom-corner.svg" alt="" className="absolute -right-3 -top-3 w-20 opacity-80" draggable={false} />
            <p className="mh-title relative text-[17px] leading-tight">우리 둘의 케미</p>
            <p className="relative mt-1 text-[12px] text-[var(--mh-ink-soft)]">친구·연인과 함께 보는 무료 궁합</p>
          </Link>
        </div>

        {/* 6. 더 깊이 보기 */}
        <h2 className="mh-title mt-7 px-4 text-[20px]">더 깊이 보기</h2>
        <ul className="mt-3 space-y-2.5 px-4">
          {[
            { t: "오늘의 운세", d: "오늘 하루 나의 흐름", tag: "무료", tone: "#2f7068" },
            { t: "심층 연애운", d: "나의 연애 방식과 인연의 결", tag: "2닢", tone: "#b83a26" },
            { t: "택일 · 심층사주", d: "중요한 날, 인생 흐름 전체", tag: "준비 중", tone: "#8a7f72" },
          ].map((x) => (
            <li key={x.t} className="flex items-center justify-between rounded-[18px] border-2 bg-[var(--mh-card)] px-4 py-3" style={{ borderColor: "#d8c39b" }}>
              <div>
                <p className="mh-title text-[16px]">{x.t}</p>
                <p className="text-[12px] text-[var(--mh-ink-soft)]">{x.d}</p>
              </div>
              <span className="rounded-full px-3 py-1 text-[12px] font-extrabold text-white" style={{ background: x.tone }}>
                {x.tag}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 px-4 text-center text-[11px] leading-relaxed text-[var(--mh-ink-soft)]">
          개선안 미리보기(v2)예요. 운영 홈은 그대로 두었어요.
        </p>
      </div>
      <MhTabBar active="home" />
    </div>
  );
}
