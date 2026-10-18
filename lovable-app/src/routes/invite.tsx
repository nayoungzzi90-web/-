import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell, Section } from "@/components/Shell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "친구 초대 · 엽전 — 오행 친구들" },
      { name: "description", content: "친구를 초대하고 엽전을 모아 풀이를 무료로 열어보세요." },
      { property: "og:title", content: "친구 초대 · 엽전" },
      { property: "og:description", content: "친구 초대하고 엽전 받기" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { coins, inviteCode, signedIn } = useStore();
  return (
    <Shell title="엽전">
      <div className="card-hanji p-6 text-center">
        <p className="text-5xl">🪙</p>
        <p className="mt-2 text-sm text-muted-foreground">보유 엽전</p>
        <p className="font-serif text-3xl font-bold">{coins}닢</p>
      </div>
      {!signedIn ? (
        <div className="card-hanji mt-4 p-5 text-center">
          <p className="font-serif font-bold">로그인하고 초대 링크를 받아보세요</p>
          <Link
            to="/auth"
            className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
          >
            로그인
          </Link>
        </div>
      ) : (
        <Section title="친구 초대하면 2닢">
          초대 링크로 들어온 친구가 가입하면 2닢을 드려요. (하루 5명·한 달 30명까지)
          <button
            className="mt-3 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground"
            onClick={async () => {
              if (!inviteCode) {
                toast("초대 코드를 준비 중이에요. 잠시 후 다시 시도해 주세요.");
                return;
              }
              try {
                await navigator.clipboard.writeText(`${location.origin}/?ref=${inviteCode}`);
                toast("초대 링크를 복사했어요");
              } catch {
                toast("복사하지 못했어요");
              }
            }}
          >
            초대 링크 복사
          </button>
          {inviteCode && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              내 초대 코드: {inviteCode}
            </p>
          )}
        </Section>
      )}
      <Section title="엽전 교환표">
        <ul className="space-y-1">
          <li>기본 사주 · 4닢</li>
          <li>궁합 · 4닢</li>
          <li>심층 연애운 · 12닢</li>
          <li className="text-muted-foreground">택일 · 15닢 (준비 중)</li>
          <li className="text-muted-foreground">심층 사주 · 18닢 (준비 중)</li>
        </ul>
      </Section>
    </Shell>
  );
}
