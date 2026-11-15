import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthForm } from "@/components/BirthForm";
import { ASSETS } from "@/components/ttotto/Art";
import { TtShell } from "@/components/ttotto/TtShell";
import { getState, setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/input")({ component: InputPage });

function InputPage() {
  const nav = useNavigate();
  const { me, invite } = useStore();
  return (
    <TtShell title="내 사주">
      <section className="flex items-end gap-2 rounded-[20px] border-[2.5px] border-[var(--tt-ink)] bg-[var(--tt-green)] px-3 pb-0 pt-3 shadow-[0_4px_0_var(--tt-ink)]">
        <img src={ASSETS.heroBook} alt="" aria-hidden className="block w-[36%] shrink-0" draggable={false} />
        <div className="mb-4 flex-1 rounded-[18px] border-[2.5px] border-[var(--tt-ink)] bg-white px-3 py-2.5">
          <p className="text-[18px] font-extrabold leading-snug [word-break:keep-all]">
            {invite ? "내 정보를 넣으면 바로 궁합을 볼 수 있어요!" : "생년월일을 알려주면 또또가 내 사주를 풀어줄게!"}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-[20px] border-[2.5px] border-[var(--tt-ink)] bg-white p-4">
        <BirthForm
          tone="tt"
          initial={me}
          submitLabel={invite ? "다음: 우리 궁합 보기" : "다음: 요즘 고민 적기"}
          onSubmit={(b) => {
            setStore({ me: b });
            // 궁합 초대로 들어왔다면 고민 단계를 건너뛰고 바로 궁합으로 간다.
            void nav({ to: getState().invite ? "/compat" : "/concern" });
          }}
        />
      </section>
      <p className="mt-3 text-center text-[13px] leading-relaxed text-[var(--tt-muted)]">
        입력한 정보는 이 기기 안에만 저장돼요. 서버로 보내지 않아요.
      </p>
    </TtShell>
  );
}
