import { useState } from "react";
import { DELETE_CONFIRM_TEXT } from "@/lib/account-text";

/** 회원 탈퇴 화면(표시 전용). 무엇이 지워지고 무엇이 남는지, 남은 엽전은 어떻게 되는지 먼저 보여 주고 확인 문구를 받는다. */
export function AccountDeleteView({
  signedIn,
  coins,
  enabled,
  busy,
  message,
  onDelete,
}: {
  signedIn: boolean;
  coins: number;
  enabled: boolean | null;
  busy: boolean;
  message: string;
  onDelete: (input: { confirm: string; forfeit: boolean }) => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [forfeit, setForfeit] = useState(false);
  if (!signedIn)
    return (
      <div className="card-hanji p-5 text-center">
        <p className="font-serif font-bold">로그인한 뒤에 탈퇴할 수 있어요</p>
        <a
          href="/auth?next=/account-delete"
          className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground"
        >
          로그인
        </a>
      </div>
    );
  const ready =
    enabled === true && confirm === DELETE_CONFIRM_TEXT && (coins === 0 || forfeit) && !busy;
  return (
    <div className="space-y-4">
      <div className="card-hanji p-5 text-sm leading-relaxed">
        <p className="font-serif font-bold">탈퇴하면 이렇게 돼요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>바로 삭제돼요</b>: 출생정보(이름·생년월일·출생 시간·성별), 열어본 풀이 기록, 초대
            코드, 엽전 지갑, 로그인 계정
          </li>
          <li>
            <b>일정 기간 남아요</b>: 엽전 충전·결제 기록(이름이나 생년월일 없이 결제 번호 중심).
            관련 법령에 따른 보관 의무 때문이며, 기간이 지나면 삭제돼요.
          </li>
          <li>
            삭제한 정보는 되돌릴 수 없어요. 같은 이메일로 다시 가입해도 이전 기록은 돌아오지 않아요.
          </li>
        </ul>
      </div>
      {coins > 0 && (
        <div className="card-hanji p-5 text-sm">
          <p className="font-bold">남은 엽전 {coins}닢이 있어요</p>
          <p className="mt-1 text-muted-foreground">
            탈퇴하면 남은 엽전은 사라지고 돌려받을 수 없어요.
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={forfeit}
              onChange={(e) => setForfeit(e.target.checked)}
            />
            남은 엽전이 사라지는 것에 동의해요
          </label>
        </div>
      )}
      <div className="card-hanji p-5 text-sm">
        <label className="block">
          확인을 위해 <b>{DELETE_CONFIRM_TEXT}</b> 라고 입력해 주세요
          <input
            className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="탈퇴 확인 문구"
            autoComplete="off"
          />
        </label>
        <button
          className="mt-4 w-full rounded-full bg-destructive py-3 font-bold text-destructive-foreground disabled:bg-muted disabled:text-muted-foreground"
          disabled={!ready}
          onClick={() => onDelete({ confirm, forfeit })}
        >
          {busy ? "처리 중…" : "회원 탈퇴"}
        </button>
        {enabled === false && (
          <p role="status" className="mt-2 text-center text-xs text-muted-foreground">
            회원 탈퇴는 아직 준비 중이에요. 급하면 문의로 요청해 주세요.
          </p>
        )}
        {message && (
          <p role="alert" className="mt-2 text-center text-sm">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
