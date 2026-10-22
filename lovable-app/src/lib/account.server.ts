// 회원 탈퇴(서버 전용). 기본 꺼짐: ACCOUNT_DELETION_ENABLED 가 'true' 일 때만 동작한다(보관 기간·잔여 엽전 정책 승인 전까지 꺼 둔다).
// 순서: (1) DB 함수 delete_member_data 가 출생정보·열람기록·초대코드·지갑을 지우고 결제·원장 기록은 남긴다 → (2) 로그인 계정(auth.users) 삭제.
// 2단계가 실패해도 1단계는 멱등이므로 같은 요청을 다시 보내면 계정 삭제만 이어서 처리된다.
import { DELETE_CONFIRM_TEXT } from "./account-text";
export type AccountErrorCode =
  "ACCOUNT_DELETION_DISABLED" | "CONFIRM_REQUIRED" | "COINS_REMAIN" | "DELETE_FAILED";
export class AccountError extends Error {
  constructor(
    public code: AccountErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const readAccountDeletionEnabled = (env: Record<string, string | undefined> = process.env) =>
  env["ACCOUNT_DELETION_ENABLED"] === "true";

export interface AccountApi {
  deleteMemberData(
    userId: string,
    forfeit: boolean,
  ): Promise<{ deleted: boolean; alreadyDeleted: boolean; forfeitedCoins: number }>;
  deleteAuthUser(userId: string): Promise<void>;
}

export function accountService(opts: { enabled: boolean; api: AccountApi }) {
  return {
    async deleteAccount(userId: string, input: { confirm: string; forfeit: boolean }) {
      if (!opts.enabled) throw new AccountError("ACCOUNT_DELETION_DISABLED");
      if (input.confirm !== DELETE_CONFIRM_TEXT) throw new AccountError("CONFIRM_REQUIRED");
      const r = await opts.api.deleteMemberData(userId, input.forfeit); // 엽전이 남았는데 동의 없으면 COINS_REMAIN 으로 중단(아무것도 지우지 않음)
      await opts.api.deleteAuthUser(userId); // 이미 지워진 계정에 다시 불러도 무해해야 한다
      return { deleted: true, forfeitedCoins: r.forfeitedCoins, alreadyDeleted: r.alreadyDeleted };
    },
  };
}

/** supabase-js 클라이언트 중 우리가 쓰는 부분(테스트에서 실제 클라이언트를 그대로 넣는다) */
export interface AdminAuthLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  auth: { admin: { deleteUser(id: string): PromiseLike<{ error: unknown }> } };
}

/** service_role 클라이언트 구현. admin.rpc(...) 메서드 호출 형태를 지킨다(this 소실 방지). */
export function supabaseAccountApi(admin: AdminAuthLike): AccountApi {
  return {
    async deleteMemberData(userId, forfeit) {
      const { data, error } = await admin.rpc("delete_member_data", {
        p_user: userId,
        p_forfeit: forfeit,
      });
      if (error) {
        const msg = (error as { message?: string }).message ?? "";
        if (msg.includes("COINS_REMAIN")) throw new AccountError("COINS_REMAIN");
        throw new AccountError("DELETE_FAILED");
      }
      const d = (data ?? {}) as {
        deleted?: boolean;
        already_deleted?: boolean;
        forfeited_coins?: number;
      };
      return {
        deleted: d.deleted === true,
        alreadyDeleted: d.already_deleted === true,
        forfeitedCoins: typeof d.forfeited_coins === "number" ? d.forfeited_coins : 0,
      };
    },
    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) return; // 이미 삭제됨
        throw new AccountError("DELETE_FAILED");
      }
    },
  };
}

export async function buildAccountService() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return accountService({
    enabled: readAccountDeletionEnabled(),
    api: supabaseAccountApi(supabaseAdmin as unknown as AdminAuthLike),
  });
}
