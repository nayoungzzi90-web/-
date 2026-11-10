import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthForm } from "@/components/BirthForm";
import { Friend } from "@/components/Friends";
import { Page } from "@/components/Shell";
import { getState, setStore, useStore } from "@/lib/store";

export const Route = createFileRoute("/input")({ component: InputPage });

function InputPage() {
  const nav = useNavigate();
  const { me, invite } = useStore();
  return (
    <Page>
      <section className="px-4 pt-5">
        <div className="flex items-end gap-3">
          <Friend
            kind="seonbi"
            accessory="sunglasses"
            size={92}
            className="bob shrink-0"
          />
          <div className="hj-card relative flex-1 bg-[#fffaf0] px-3.5 py-3">
            <p className="font-display text-lg leading-snug">
              {invite
                ? "내 정보를 넣으면 바로 궁합을 볼 수 있어요꽥!"
                : "생년월일을 알려주면 내 오행 친구를 찾아줄게꽥!"}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <BirthForm
            initial={me}
            submitLabel={
              invite ? "다음: 우리 궁합 보기" : "다음: 요즘 고민 적기"
            }
            onSubmit={(b) => {
              setStore({ me: b });
              // 궁합 초대로 들어왔다면 고민 단계를 건너뛰고 바로 궁합으로 간다.
              void nav({ to: getState().invite ? "/compat" : "/concern" });
            }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          입력한 정보는 이 기기 안에만 저장돼요. 서버로 보내지 않아요.
        </p>
      </section>
    </Page>
  );
}
