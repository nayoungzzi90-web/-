import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthForm } from "@/components/BirthForm";
import { FRIEND_IMG, FRIEND_INFO, type FriendKind } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { getState, setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

// 홈 v5(2026-11-12): 입력이 곧 홈이다. 사주아이처럼 "소개 → 버튼 → 입력"의 단계를 줄여, 첫 화면에서 바로 생년월일을 넣게 한다
// (화면 흐름만 참고, 그림·글은 우리 것). 가로 스크롤 없음. v4 홈은 /home-classic 의 이전 홈과 함께 git 이력에 있다.
const KINDS: FriendKind[] = ["seonbi", "ssi", "tiger", "rabbit", "turtle"];

function Home() {
  const nav = useNavigate();
  const { me } = useStore();
  return (
    <Page>
      <div className="overflow-x-hidden">
        {/* 1. 짧은 히어로: 한 줄 약속 */}
        <div className="relative h-[210px] overflow-hidden">
          <img
            src="/restore/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "72% 50%" }}
            draggable={false}
          />
          <div className="absolute left-5 top-5 w-[62%]">
            <p className="text-[13px] font-bold text-[var(--ink-soft)]">조선시대 감성 사주풀이</p>
            <h1 className="font-display mt-1 text-[28px] leading-[1.15]">
              내 사주 속<br />
              <span className="text-[var(--stamp)]">오행 친구</span>는
              <br />
              누구일까?
            </h1>
          </div>
        </div>
        <div className="relative z-10 -mt-12 flex items-end justify-center px-2">
          {KINDS.map((k) => (
            <div key={k} className="flex min-w-0 flex-1 items-end justify-center" style={{ height: 84 }}>
              <img src={FRIEND_IMG[k]} alt={FRIEND_INFO[k].name} className="max-h-full max-w-[17vw] object-contain" draggable={false} />
            </div>
          ))}
        </div>

        {/* 2. 바로 입력 */}
        <section className="px-4 pt-3">
          <BirthForm
            initial={me}
            submitLabel="무료로 내 오행 친구 만나기"
            onSubmit={(b) => {
              setStore({ me: b });
              void nav({ to: getState().invite ? "/compat" : "/concern" });
            }}
          />
          <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
            회원가입 없이 볼 수 있어요. 입력한 정보는 이 기기 안에만 저장돼요.
          </p>
        </section>

        {/* 3. 다른 길은 두 개만 */}
        <section className="mt-6 grid grid-cols-2 gap-3 px-4">
          <Link to="/quiz" className="hj-card block min-w-0 bg-[#e3efe6] p-3.5">
            <p className="font-display text-[16px] leading-tight">생년월일 없이 30초</p>
            <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)]">나의 오행 친구 찾기 테스트</p>
          </Link>
          <Link to="/compat" className="hj-card block min-w-0 bg-[#f7dfd8] p-3.5">
            <p className="font-display text-[16px] leading-tight">우리 둘의 케미</p>
            <p className="mt-1 text-[12px] leading-snug text-[var(--ink-soft)]">친구·연인과 함께 보는 궁합</p>
          </Link>
        </section>
        <p className="mt-2 text-center">
          <Link to="/sample" className="text-sm text-[var(--ink-soft)] underline">
            샘플 결과 먼저 구경하기
          </Link>
        </p>

        <p className="mt-5 px-4 pb-2 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          풀이는 참고용 재미예요. 계산 근거와 한계는 결과 화면에 함께 적어 둬요.
        </p>
      </div>
    </Page>
  );
}
