import { createFileRoute } from "@tanstack/react-router";
import { Cloud } from "@/components/minhwa/Scene";
import {
  CoinIcon,
  FriendImg,
  MhButton,
  MhHeader,
  MhTabBar,
  RecoBadge,
} from "@/components/minhwa/ui";
import { useState } from "react";

// 시안 ④ 엽전 충전 화면 복원. 가격은 현행 정책(1닢=900원, 충전 팩 1~4닢)을 따르고, 시안의 990원·절약 문구는 쓰지 않는다.
// 결제는 꺼져 있어서(PAYMENTS_MODE=off) 버튼은 비활성이다.
export const Route = createFileRoute("/restore/charge")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "시안 복원 · 충전" },
    ],
  }),
  component: RestoreCharge,
});

const PACKS = [
  { n: 1, name: "한 닢", price: 900 },
  { n: 2, name: "두 닢", price: 1800, reco: true },
  { n: 3, name: "세 닢", price: 2700 },
  { n: 4, name: "네 닢", price: 3600 },
] as const;

function Coins({ n }: { n: number }) {
  return (
    <span className="flex w-[104px] shrink-0 items-center" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ marginLeft: i ? -13 : 0 }}>
          <CoinIcon size={34} />
        </span>
      ))}
    </span>
  );
}

function RestoreCharge() {
  const [sel, setSel] = useState<number>(2);
  const pack = PACKS.find((p) => p.n === sel)!;
  return (
    <div className="skin-minhwa mh-paper min-h-screen pb-28">
      <div className="mx-auto max-w-md">
        <MhHeader title="엽전 충전" />
        {/* 남색 보유 카드 */}
        <section
          className="relative mx-3 mt-2 overflow-hidden rounded-[22px] border-2 px-4 py-4 text-white"
          style={{
            background: "var(--mh-indigo)",
            borderColor: "var(--mh-ink)",
          }}
        >
          <svg
            className="pointer-events-none absolute right-0 top-0 opacity-60"
            width="170"
            height="80"
            viewBox="0 0 170 80"
            aria-hidden
          >
            <Cloud x={30} y={14} s={1.3} />
          </svg>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CoinIcon size={56} />
              <div>
                <p className="text-[14px] text-[#cdd6ee]">내 엽전</p>
                <p className="mh-title text-[40px] leading-none">
                  0 <span className="text-[20px]">닢</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="whitespace-nowrap rounded-full border-2 bg-[#fffaf0] px-3 py-1 text-[12px] font-bold text-[var(--mh-ink)]"
                style={{ borderColor: "var(--mh-ink)" }}
              >
                좋은 운이 함께하길!
              </span>
              <FriendImg kind="hodongi" height={76} />
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-baseline justify-between px-4">
          <h2 className="mh-title text-[22px]">엽전 꾸러미 고르기</h2>
          <span className="text-[12px] text-[var(--mh-ink-soft)]">
            1닢 = 900원
          </span>
        </div>
        <ul className="mt-3 space-y-3 px-3">
          {PACKS.map((p) => {
            const on = p.n === sel;
            return (
              <li key={p.n} className="relative">
                {"reco" in p && p.reco && <RecoBadge />}
                <button
                  type="button"
                  onClick={() => setSel(p.n)}
                  aria-pressed={on}
                  className="mh-card flex w-full items-center gap-3 px-4 py-4 text-left"
                  style={{
                    borderColor: on ? "var(--mh-red)" : "var(--mh-line)",
                    borderWidth: on ? 2.5 : 1.5,
                  }}
                >
                  <Coins n={p.n} />
                  <span className="flex-1">
                    <span className="mh-title block text-[22px]">{p.name}</span>
                    <span className="text-[13px] text-[var(--mh-ink-soft)]">
                      엽전 {p.n}닢
                    </span>
                  </span>
                  <span className="mh-title text-[22px]">
                    {p.price.toLocaleString()}원
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mx-3 mt-5">
          <MhButton disabled>
            {pack.name} {pack.price.toLocaleString()}원 결제하기
          </MhButton>
          <p className="mt-2 text-center text-[12px] text-[var(--mh-ink-soft)]">
            결제는 아직 준비 중이에요. 열리면 이 화면에서 바로 충전할 수 있어요.
          </p>
        </div>
      </div>
      <MhTabBar active="coin" />
    </div>
  );
}
