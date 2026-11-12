import { Link, createFileRoute } from "@tanstack/react-router";
import { FriendImg, MhButton, MhTabBar, CoinBadge } from "@/components/minhwa/ui";
import { ORDER } from "@/components/minhwa/data";

// 홈 화면 개선안 미리보기(비교용 주소). 운영 홈(/)은 그대로 두고, 같은 한지·오방색·캐릭터로 정보 구조만 바꾼 안을 보여 준다.
export const Route = createFileRoute("/home-proposal")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "홈 개선안 미리보기" },
    ],
  }),
  component: HomeProposal,
});

function HomeProposal() {
  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-center justify-between">
          <p className="mh-title text-[18px] text-[var(--mh-red)]">오행 친구들</p>
          <CoinBadge count={0} />
        </div>

        {/* 1. 핵심 메시지 1개 + 캐릭터 + 대표 버튼 1개 */}
        <section
          className="mt-4 rounded-[26px] border-2 px-5 pb-6 pt-6 text-center shadow-[0_3px_0_rgba(160,120,70,0.25)]"
          style={{ borderColor: "#c9a76e", background: "#f2e4c8" }}
        >
          <p className="text-[13px] font-bold text-[var(--mh-ink-soft)]">나를 알아가는 작은 사주 세계</p>
          <h1 className="mh-title mt-2 text-[30px] leading-[1.22]">
            태어난 날에 숨겨진
            <br />
            나만의 이야기를 만나봐요
          </h1>
          <p className="mt-2 text-[14px] text-[var(--mh-ink-soft)]">다섯 오행 친구가 들려주는 나의 성향, 연애, 일 이야기</p>
          <div className="mt-4 flex items-end justify-center">
            {ORDER.map((k) => (
              <div key={k} className="-mx-1 flex-1">
                <FriendImg kind={k} height={84} />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link to="/input" className="block">
              <MhButton>무료로 내 사주 친구 만나기</MhButton>
            </Link>
          </div>
          <p className="mt-2 text-[12px] text-[var(--mh-ink-soft)]">회원가입 없이 먼저 체험할 수 있어요</p>
        </section>

        {/* 2. 친구랑 같이 */}
        <h2 className="mh-title mt-7 text-[19px]">친구랑 같이 하면 더 재미있어요</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            to="/quiz"
            className="rounded-[20px] border-2 bg-[var(--mh-card)] px-4 py-4"
            style={{ borderColor: "#c9a76e" }}
          >
            <p className="text-[22px]" aria-hidden>
              ✦
            </p>
            <p className="mh-title mt-1 text-[17px] leading-tight">30초 성향 테스트</p>
            <p className="mt-1 text-[12px] text-[var(--mh-ink-soft)]">생년월일 없이 나와 닮은 오행 친구 찾기</p>
          </Link>
          <Link
            to="/compat"
            className="rounded-[20px] border-2 bg-[var(--mh-card)] px-4 py-4"
            style={{ borderColor: "#c9a76e" }}
          >
            <p className="text-[22px] text-[var(--mh-red)]" aria-hidden>
              ♡
            </p>
            <p className="mh-title mt-1 text-[17px] leading-tight">우리 둘의 케미</p>
            <p className="mt-1 text-[12px] text-[var(--mh-ink-soft)]">친구·연인과 함께 보는 무료 궁합</p>
          </Link>
        </div>

        {/* 3. 더 깊이 보기: 무료·유료·준비 중 구분 */}
        <h2 className="mh-title mt-7 text-[19px]">더 깊이 보기</h2>
        <ul className="mt-3 space-y-2.5">
          {[
            { t: "오늘의 운세", d: "오늘 하루 나의 흐름", tag: "무료", tone: "#3b8f7b" },
            { t: "심층 연애운", d: "나의 연애 방식과 인연의 결", tag: "2닢", tone: "#a93421" },
            { t: "택일", d: "중요한 날을 고르는 풀이", tag: "준비 중", tone: "#8a7f72" },
            { t: "심층사주", d: "인생 흐름 전체를 자세히", tag: "준비 중", tone: "#8a7f72" },
          ].map((x) => (
            <li
              key={x.t}
              className="flex items-center justify-between rounded-[18px] border-2 bg-[var(--mh-card)] px-4 py-3"
              style={{ borderColor: "#d8c39b" }}
            >
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

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--mh-ink-soft)]">
          개선안 미리보기 화면이에요. 운영 홈은 그대로 두었어요.
        </p>
      </div>
      <MhTabBar active="home" />
    </div>
  );
}
