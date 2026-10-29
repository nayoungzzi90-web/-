import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell, Section } from "@/components/Shell";
import { shareUrl } from "@/lib/share";
import { useStore } from "@/lib/store";
import {
  INVITE_DAILY_CAP,
  INVITE_HOLD_DAYS,
  INVITE_MONTHLY_CAP,
  INVITE_REWARD,
  INVITER_MIN_PAID_COINS,
  PRODUCTS,
  won,
} from "@/lib/coins";

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
        <Section title={`친구 초대하면 ${INVITE_REWARD}닢`}>
          초대 링크로 들어온 친구가 <b>처음 엽전을 결제</b>하고 {INVITE_HOLD_DAYS}일 안에 환불하지
          않으면 {INVITE_REWARD}닢을 드려요. (가입만으로는 지급되지 않아요.) 한국 시간 기준 하루{" "}
          {INVITE_DAILY_CAP}명·한 달 {INVITE_MONTHLY_CAP}명까지, 초대하는 분이 엽전을{" "}
          {INVITER_MIN_PAID_COINS}닢 이상 결제한 적이 있어야 해요.
          <button
            className="mt-3 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground"
            onClick={async () => {
              if (!inviteCode) {
                toast("초대 코드를 준비 중이에요. 잠시 후 다시 시도해 주세요.");
                return;
              }
              try {
                await navigator.clipboard.writeText(shareUrl(location.origin, inviteCode));
                toast("초대 링크를 복사했어요");
              } catch {
                toast("복사하지 못했어요");
              }
            }}
          >
            초대 링크 복사
          </button>
          {inviteCode && (
            <button
              className="mt-2 w-full rounded-full border border-primary py-3 font-bold text-primary"
              onClick={async () => {
                const url = shareUrl(location.origin, inviteCode);
                try {
                  if (navigator.share)
                    await navigator.share({ text: "나의 오행 친구를 만나봐요!", url });
                  else {
                    await navigator.clipboard.writeText(url);
                    toast("초대 링크를 복사했어요");
                  }
                } catch {
                  /* 공유 창을 닫은 경우 */
                }
              }}
            >
              카카오톡 등으로 공유하기
            </button>
          )}
          {inviteCode && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              내 초대 코드: {inviteCode}
            </p>
          )}
        </Section>
      )}
      <div className="mt-4 flex gap-2">
        <Link
          to="/charge"
          className="flex-1 rounded-full bg-primary py-3 text-center font-bold text-primary-foreground"
        >
          엽전 충전
        </Link>
        <Link
          to="/ledger"
          className="flex-1 rounded-full border border-primary py-3 text-center font-bold text-primary"
        >
          엽전 내역
        </Link>
      </div>
      <Section title="엽전 교환표">
        <ul className="space-y-1">
          <li>
            기본 사주 · {PRODUCTS.basic.coins}닢 ({won(PRODUCTS.basic.coins)})
          </li>
          <li>
            궁합 · {PRODUCTS.compat.coins}닢 ({won(PRODUCTS.compat.coins)})
          </li>
          <li>
            심층 연애운 · {PRODUCTS.love.coins}닢 ({won(PRODUCTS.love.coins)})
          </li>
          <li className="text-muted-foreground">
            택일 · {PRODUCTS.taekil.coins}닢 ({won(PRODUCTS.taekil.coins)}) (준비 중)
          </li>
          <li className="text-muted-foreground">
            심층 사주 · {PRODUCTS.deep.coins}닢 ({won(PRODUCTS.deep.coins)}) (준비 중)
          </li>
        </ul>
      </Section>
    </Shell>
  );
}
