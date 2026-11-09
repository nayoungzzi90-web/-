import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { BirthForm } from "@/components/BirthForm";
import { PeekRow } from "@/components/Friends";
import { setStore, useStore } from "@/lib/store";
import { saveBirth } from "@/lib/user-fns";
import type { BirthInput } from "@/lib/saju";

export const Route = createFileRoute("/input")({
  head: () => ({
    meta: [
      { title: "출생정보 입력 — 오행 친구들" },
      { name: "description", content: "양력·음력, 출생 시간으로 나의 오행 캐릭터를 찾아요." },
      { property: "og:title", content: "출생정보 입력 — 오행 친구들" },
      { property: "og:description", content: "나의 오행 캐릭터 찾기" },
    ],
  }),
  component: InputPage,
});

function InputPage() {
  const { me, signedIn } = useStore();
  const nav = useNavigate();
  return (
    <Shell title="출생정보">
      <h1 className="mb-2 font-serif text-2xl font-bold leading-snug">
        태어난 순간의 이야기,
        <br />
        귀엽게 풀어드려요
      </h1>
      <p className="mb-3 text-sm text-muted-foreground">
        생년월일만 넣으면 무료로 나를 닮은 친구를 바로 볼 수 있어요.
      </p>
      <PeekRow />
      <BirthForm
        initial={me}
        submitLabel="다음: 요즘 고민 적기"
        onSubmit={async (b: BirthInput) => {
          if (signedIn) {
            try {
              await saveBirth({ data: b });
            } catch (e) {
              toast("출생정보를 저장하지 못했어요.", {
                description: `${e instanceof Error ? e.message : "다시 시도해 주세요."} 입력 내용은 그대로 남아 있으니 확인 후 다시 눌러 주세요.`,
                duration: 8000,
              });
              return;
            }
            toast("출생정보를 회원정보에 저장했어요.");
          }
          setStore({ me: b });
          nav({ to: "/concern" });
        }}
      />
      {!signedIn && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          지금은 임시 미리보기예요. 로그인하면 입력 정보가 저장돼요.{" "}
          <a href="/auth" className="underline text-primary">
            로그인하기
          </a>
        </p>
      )}
    </Shell>
  );
}
