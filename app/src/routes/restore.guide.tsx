import { createFileRoute, Link } from "@tanstack/react-router";
import { Cloud, Scene, Scroll } from "@/components/minhwa/Scene";
import { FriendCard, FriendImg, MhTabBar } from "@/components/minhwa/ui";
import { ORDER } from "@/components/minhwa/data";

// 시안 ① 캐릭터·컬러·스타일 가이드(+홈 히어로) 복원
export const Route = createFileRoute("/restore/guide")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "시안 복원 · 가이드" },
    ],
  }),
  component: RestoreGuide,
});

const SWATCHES = [
  ["한지", "#F7F0E3"],
  ["먹", "#2B2320"],
  ["단청 홍", "#B83A26"],
  ["청록", "#2F7068"],
  ["쪽빛", "#2D3E73"],
  ["황토 노랑", "#E2B04A"],
  ["엽전 황동", "#C99A4B"],
] as const;

function RestoreGuide() {
  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md">
        <div className="relative h-[400px] overflow-hidden">
          <Scene />
          <div className="relative px-5 pt-6">
            <p className="flex items-center gap-2 text-[15px]">
              조선시대 감성 사주풀이
              <span className="rounded-[4px] bg-[var(--mh-red)] px-1 text-[11px] text-white">
                福
              </span>
            </p>
            <h1 className="mh-title mt-1 text-[48px] leading-none">
              오행 친구들
            </h1>
            <p className="mt-3 text-[15px] leading-snug">
              나무, 불, 흙, 쇠, 물 다섯 친구가
              <br />
              당신의 길을 안내해요.
            </p>
          </div>
          <Scroll
            style={{ right: 34, top: 108, height: 160, paddingBottom: 22 }}
            lines={["오늘도", "좋은 운이", "가득해요"]}
          />
          <div className="absolute inset-x-2 bottom-1 z-10 flex items-end justify-center">
            {ORDER.map((k) => (
              <div key={k} className="-mx-1 flex-1">
                <FriendImg kind={k} height={86} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5 px-2">
          {ORDER.map((k) => (
            <FriendCard key={k} kind={k} />
          ))}
        </div>

        <section className="mh-card mx-3 mt-4 p-4">
          <h2 className="mh-title text-[18px]">색상 · 오방색을 한지 위에</h2>
          <ul className="mt-3 grid grid-cols-7 gap-1.5">
            {SWATCHES.map(([name, hex]) => (
              <li key={hex} className="text-center">
                <span
                  className="block h-9 rounded-[10px] border-2"
                  style={{ background: hex, borderColor: "var(--mh-ink)" }}
                />
                <span className="mt-1 block text-[10px] font-bold leading-tight">
                  {name}
                </span>
                <span className="block text-[9px] text-[var(--mh-ink-soft)]">
                  {hex}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mh-card relative mx-3 mt-3 overflow-hidden p-4">
          <svg
            className="pointer-events-none absolute right-0 top-0"
            width="120"
            height="70"
            viewBox="0 0 120 70"
            aria-hidden
          >
            <Cloud x={40} y={14} s={1.1} />
          </svg>
          <h2 className="mh-title text-[18px]">글꼴</h2>
          <p className="mh-title mt-1 text-[16px]">주아 · 제목과 버튼</p>
          <p className="mt-1 text-[13px] text-[var(--mh-ink-soft)]">
            고운돋움 · 본문과 안내문
          </p>
          <p className="mt-1 text-[13px] text-[var(--mh-ink-soft)]">
            한자 원국표와 운세 한 줄은 주아로 크게
          </p>
        </section>

        <nav
          className="mx-3 mt-4 flex flex-wrap gap-2 text-[13px]"
          aria-label="시안 화면 목록"
        >
          {[
            ["홈(입력)", "/restore/home"],
            ["결과", "/restore/result"],
            ["충전", "/restore/charge"],
          ].map(([t, to]) => (
            <Link
              key={to}
              to={to!}
              className="rounded-full border-2 bg-[var(--mh-card)] px-3 py-1 font-bold"
              style={{ borderColor: "var(--mh-ink)" }}
            >
              {t}
            </Link>
          ))}
        </nav>
      </div>
      <MhTabBar active="today" />
    </div>
  );
}
