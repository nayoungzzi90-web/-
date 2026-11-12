import { Link, createFileRoute } from "@tanstack/react-router";
import { FRIEND_IMG, FRIEND_INFO, Friend, type FriendKind } from "@/components/Friends";
import { Page } from "@/components/Shell";

export const Route = createFileRoute("/")({ component: Home });

// 홈 v4(2026-11-12): 한옥 일러스트 히어로 + 캐릭터 5명 + 대표 버튼 1개. 가로 스크롤 없음(가로로 넘기는 영역을 두지 않고 모든 줄이 화면 폭 안에 들어간다).
// 이전 홈은 /home-classic 에 그대로 남겨 둔다.
const FRIENDS: { kind: FriendKind; el: string; bg: string }[] = [
  { kind: "seonbi", el: "목", bg: "#3b8f7b" },
  { kind: "ssi", el: "화", bg: "#d6463a" },
  { kind: "tiger", el: "토", bg: "#e8b23a" },
  { kind: "rabbit", el: "금", bg: "#ece8df" },
  { kind: "turtle", el: "수", bg: "#4a4d78" },
];

const MORE = [
  { title: "오늘의 복주머니", desc: "하루 한 번 공짜 운세", tag: "무료", tone: "#2f7068", to: "/today" as const },
  { title: "연애운", desc: "썸·결혼운·재회운까지", tag: "준비 중", tone: "#8a7f72" },
  { title: "택일", desc: "좋은 날 골라드려요", tag: "준비 중", tone: "#8a7f72" },
  { title: "심층 사주", desc: "평생 흐름까지 깊게", tag: "준비 중", tone: "#8a7f72" },
];

function Home() {
  return (
    <Page>
      <div className="overflow-x-hidden">
        {/* 1. 일러스트 히어로 */}
        <div className="relative h-[300px] overflow-hidden">
          <img
            src="/restore/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "70% 50%" }}
            draggable={false}
          />
          <div className="absolute left-5 top-6 w-[60%]">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--ink-soft)]">
              조선시대 감성 사주풀이
              <span className="rounded-[4px] bg-[var(--stamp)] px-1 text-[11px] text-white">福</span>
            </p>
            <h1 className="font-display mt-1.5 text-[32px] leading-[1.15]">
              태어난 날에
              <br />
              숨겨진
              <br />
              <span className="text-[var(--stamp)]">나만의 이야기</span>
            </h1>
          </div>
        </div>

        {/* 2. 캐릭터 5명(히어로 아래쪽에 걸쳐 선다) */}
        <div className="relative z-10 -mt-14 flex items-end justify-center px-2">
          {FRIENDS.map((f) => (
            <div key={f.kind} className="flex min-w-0 flex-1 items-end justify-center" style={{ height: 108 }}>
              <img src={FRIEND_IMG[f.kind]} alt={FRIEND_INFO[f.kind].name} className="max-h-full max-w-[19vw] object-contain" draggable={false} />
            </div>
          ))}
        </div>

        {/* 3. 대표 버튼 */}
        <section className="px-4 pt-3 text-center">
          <p className="text-[15px] font-bold leading-snug">
            다섯 오행 친구가 들려주는
            <br />
            나의 성향, 연애, 일 이야기
          </p>
          <Link
            to="/input"
            className="font-display mt-4 block w-full rounded-[24px] border-2 border-[var(--line)] py-3.5 text-lg text-white shadow-[0_3px_0_rgba(43,35,32,0.35)]"
            style={{ background: "linear-gradient(180deg,#c4452f,#a93421)" }}
          >
            무료로 내 사주 친구 만나기 ›
          </Link>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">회원가입 없이 먼저 체험할 수 있어요</p>
          <Link to="/sample" className="mt-2 inline-block text-sm text-[var(--ink-soft)] underline">
            샘플 결과 먼저 구경하기
          </Link>
        </section>

        {/* 4. 오행 친구 소개(한 줄에 5칸, 가로로 넘기지 않는다) */}
        <section className="mt-8 px-4">
          <h2 className="font-display text-xl">나는 어떤 오행 친구일까?</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {FRIENDS.map((f) => (
              <Link key={f.kind} to="/quiz" className="min-w-0 text-center">
                <div className="rounded-2xl p-1" style={{ background: f.bg }}>
                  <Friend kind={f.kind} size={52} />
                </div>
                <p className="mt-1 truncate text-[12px] font-extrabold">{FRIEND_INFO[f.kind].name}</p>
                <p className="text-[11px] text-[var(--ink-soft)]">{f.el}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. 친구랑 같이 */}
        <section className="mt-7 px-4">
          <h2 className="font-display text-xl">친구랑 같이 하면 더 재미있어요</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link to="/quiz" className="hj-card relative block min-w-0 overflow-hidden bg-[#e3efe6] p-3.5">
              <span className="rounded-full bg-[var(--stamp)] px-2 py-0.5 text-[10.5px] font-bold text-white">생년월일 없이 30초</span>
              <p className="font-display mt-1.5 text-[17px] leading-tight">나의 오행 친구 찾기</p>
              <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)]">단톡방에 도전장도 보내요</p>
            </Link>
            <Link to="/compat" className="hj-card relative block min-w-0 overflow-hidden bg-[#f7dfd8] p-3.5">
              <span className="rounded-full bg-[#8a3a30] px-2 py-0.5 text-[10.5px] font-bold text-white">무료</span>
              <p className="font-display mt-1.5 text-[17px] leading-tight">우리 둘의 케미</p>
              <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)]">친구·연인과 함께 보는 궁합</p>
            </Link>
          </div>
        </section>

        {/* 6. 더 깊이 보기 */}
        <section className="mt-7 px-4">
          <h2 className="font-display text-xl">더 깊이 보기</h2>
          <ul className="mt-3 space-y-2.5">
            {MORE.map((m) => {
              const body = (
                <>
                  <div className="min-w-0">
                    <p className="font-display truncate text-[16px]">{m.title}</p>
                    <p className="truncate text-[12px] text-[var(--ink-soft)]">{m.desc}</p>
                  </div>
                  <span className="ml-2 shrink-0 rounded-full px-3 py-1 text-[12px] font-extrabold text-white" style={{ background: m.tone }}>
                    {m.tag}
                  </span>
                </>
              );
              const cls = "hj-card flex items-center justify-between px-4 py-3";
              return (
                <li key={m.title}>
                  {m.to ? (
                    <Link to={m.to} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <div className={`${cls} opacity-70`} aria-disabled="true">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-6 px-4 pb-2 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          풀이는 참고용 재미예요. 계산 근거와 한계는 결과 화면에 함께 적어 둬요.
        </p>
      </div>
    </Page>
  );
}
