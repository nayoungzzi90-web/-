import { PACKS, type PaymentsStatus } from "@/lib/charge";

/** 엽전 충전 화면(표시 전용). 라우터·서버에 의존하지 않아 단독으로 시험할 수 있다. */
export function ChargeView({
  signedIn,
  coins,
  status,
  busyCoins,
  message,
  consented,
  onConsentChange,
  onBuy,
}: {
  signedIn: boolean;
  coins: number;
  status: PaymentsStatus | null;
  busyCoins: number | null;
  message: string;
  consented: boolean;
  onConsentChange: (v: boolean) => void;
  onBuy: (coins: number) => void;
}) {
  const available = !!status?.available;
  const sandbox = status?.mode === "sandbox";
  return (
    <div>
      <div className="card-hanji p-6 text-center">
        <p className="text-5xl">🪙</p>
        <p className="mt-2 text-sm text-muted-foreground">보유 엽전</p>
        <p className="font-serif text-3xl font-bold">{coins}닢</p>
        <p className="mt-1 text-xs text-muted-foreground">1닢 = 900원</p>
      </div>

      {sandbox && (
        <p role="status" className="mt-3 rounded-xl bg-gold/25 p-3 text-center text-sm font-bold">
          테스트 결제예요. 실제 돈은 나가지 않아요.
        </p>
      )}
      {status && !available && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground"
        >
          결제는 아직 준비 중이에요. 준비가 끝나면 여기서 충전할 수 있어요.
        </p>
      )}

      {!signedIn ? (
        <div className="card-hanji mt-4 p-5 text-center">
          <p className="font-serif font-bold">로그인하고 충전해 보세요</p>
          <a
            href="/auth?next=/charge"
            className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
          >
            로그인
          </a>
        </div>
      ) : (
        <>
          <label className="card-hanji mt-4 flex items-start gap-2 p-4 text-sm leading-relaxed">
            <input
              type="checkbox"
              className="mt-1"
              checked={consented}
              onChange={(e) => onConsentChange(e.target.checked)}
            />
            <span>
              <a href="/terms" className="underline">
                이용약관
              </a>
              과{" "}
              <a href="/refund" className="underline">
                환불정책
              </a>
              을 확인했고, <b>엽전을 사용(풀이 열람)한 뒤에는 환불이 어려울 수 있음</b>에 동의해요.
            </span>
          </label>
          <ul className="mt-4 space-y-2" aria-label="충전 팩">
            {PACKS.map((p) => (
              <li key={p.coins} className="card-hanji flex items-center justify-between p-4">
                <div>
                  <p className="font-serif font-bold">{p.label}</p>
                  <p className="text-sm text-muted-foreground">{p.price}</p>
                </div>
                <button
                  className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                  disabled={!available || !consented || busyCoins !== null}
                  onClick={() => onBuy(p.coins)}
                >
                  {busyCoins === p.coins ? "처리 중…" : "충전하기"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {message && (
        <p role="alert" className="mt-3 text-center text-sm">
          {message}
        </p>
      )}
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        충전한 엽전의 환불·유효기간 등은 이용약관에 따라요(준비 중).
      </p>
    </div>
  );
}
