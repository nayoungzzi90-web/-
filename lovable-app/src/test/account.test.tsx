import http from "node:http";
import type { AddressInfo } from "node:net";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AccountDeleteView } from "@/components/AccountDeleteView";
import {
  AccountError,
  accountService,
  readAccountDeletionEnabled,
  supabaseAccountApi,
  type AccountApi,
  type AdminAuthLike,
} from "@/lib/account.server";
import { accountErrorKo } from "@/lib/account-messages";
import { DELETE_CONFIRM_TEXT } from "@/lib/account-text";
import { routeTree } from "@/routeTree.gen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let host: HTMLElement | null = null;
function render(el: ReactElement) {
  if (!root) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => root!.render(el));
  return { rerender: (e: ReactElement) => act(() => root!.render(e)) };
}
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});
const q = (sel: string) => Array.from(host!.querySelectorAll<HTMLElement>(sel));
const btn = () => q("button").find((b) => /회원 탈퇴|처리 중/.test(b.textContent ?? ""))!;
const type = (el: HTMLInputElement, v: string) =>
  act(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const click = (el: HTMLElement) => act(() => void el.click());

function fakeApi(over: Partial<AccountApi> = {}) {
  const calls: string[] = [];
  const api: AccountApi = {
    async deleteMemberData(u, f) {
      calls.push(`data:${u}:${f}`);
      return { deleted: true, alreadyDeleted: false, forfeitedCoins: f ? 2 : 0 };
    },
    async deleteAuthUser(u) {
      calls.push(`auth:${u}`);
    },
    ...over,
  };
  return { api, calls };
}

describe("회원 탈퇴 서비스", () => {
  it("기본은 꺼짐(환경변수가 정확히 'true' 일 때만 켜짐), 꺼져 있으면 DB·계정에 아무것도 하지 않는다", async () => {
    expect(readAccountDeletionEnabled({})).toBe(false);
    expect(readAccountDeletionEnabled({ ACCOUNT_DELETION_ENABLED: "1" })).toBe(false);
    expect(readAccountDeletionEnabled({ ACCOUNT_DELETION_ENABLED: "true" })).toBe(true);
    const f = fakeApi();
    await expect(
      accountService({ enabled: false, api: f.api }).deleteAccount("u1", {
        confirm: DELETE_CONFIRM_TEXT,
        forfeit: true,
      }),
    ).rejects.toMatchObject({ code: "ACCOUNT_DELETION_DISABLED" });
    expect(f.calls).toEqual([]);
  });

  it("확인 문구가 틀리면 아무것도 하지 않는다", async () => {
    const f = fakeApi();
    const svc = accountService({ enabled: true, api: f.api });
    for (const bad of ["", "탈퇴 ", "탈 퇴", "delete"])
      await expect(svc.deleteAccount("u1", { confirm: bad, forfeit: true })).rejects.toMatchObject({
        code: "CONFIRM_REQUIRED",
      });
    expect(f.calls).toEqual([]);
  });

  it("DB 삭제 → 계정 삭제 순서, 엽전 소멸 동의 값을 그대로 전달", async () => {
    const f = fakeApi();
    const r = await accountService({ enabled: true, api: f.api }).deleteAccount("u1", {
      confirm: DELETE_CONFIRM_TEXT,
      forfeit: true,
    });
    expect(f.calls).toEqual(["data:u1:true", "auth:u1"]);
    expect(r).toEqual({ deleted: true, forfeitedCoins: 2, alreadyDeleted: false });
  });

  it("엽전이 남았는데 동의가 없으면 DB 단계에서 중단 — 계정은 지우지 않는다", async () => {
    const f = fakeApi({
      deleteMemberData: async () => {
        throw new AccountError("COINS_REMAIN");
      },
    });
    await expect(
      accountService({ enabled: true, api: f.api }).deleteAccount("u1", {
        confirm: DELETE_CONFIRM_TEXT,
        forfeit: false,
      }),
    ).rejects.toMatchObject({ code: "COINS_REMAIN" });
    expect(f.calls).toEqual([]);
  });

  it("계정 삭제가 실패하면 오류를 올리고, 같은 요청을 다시 보내면(데이터는 이미 삭제) 계정 삭제만 이어서 처리", async () => {
    let authFails = true;
    const calls: string[] = [];
    let deleted = false;
    const api: AccountApi = {
      async deleteMemberData() {
        const already = deleted;
        deleted = true;
        calls.push("data");
        return { deleted: !already, alreadyDeleted: already, forfeitedCoins: 0 };
      },
      async deleteAuthUser() {
        calls.push("auth");
        if (authFails) throw new AccountError("DELETE_FAILED");
      },
    };
    const svc = accountService({ enabled: true, api });
    await expect(
      svc.deleteAccount("u1", { confirm: DELETE_CONFIRM_TEXT, forfeit: false }),
    ).rejects.toMatchObject({ code: "DELETE_FAILED" });
    authFails = false;
    const r = await svc.deleteAccount("u1", { confirm: DELETE_CONFIRM_TEXT, forfeit: false });
    expect(r.alreadyDeleted).toBe(true);
    expect(calls).toEqual(["data", "auth", "data", "auth"]);
  });

  it("오류 문구", () => {
    expect(accountErrorKo("ACCOUNT_DELETION_DISABLED")).toContain("준비 중");
    expect(accountErrorKo("CONFIRM_REQUIRED")).toContain("확인 문구");
    expect(accountErrorKo("COINS_REMAIN")).toContain("동의");
    expect(accountErrorKo("x")).toContain("문제가 생겼어요");
  });
});

// 실제 supabase-js 클라이언트가 PostgREST·Auth admin 으로 올바르게 요청하는지 가짜 서버로 확인한다(연결 버그 방지).
describe("supabaseAccountApi (실제 supabase-js → 가짜 서버)", () => {
  let srv: http.Server;
  const seen: { method: string | undefined; url: string | undefined; body: string }[] = [];
  let rpcReply: { status: number; body: unknown } = {
    status: 200,
    body: { deleted: true, forfeited_coins: 1 },
  };
  let authStatus = 200;
  let admin: AdminAuthLike;
  beforeAll(async () => {
    srv = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        seen.push({ method: req.method, url: req.url, body });
        res.setHeader("content-type", "application/json");
        if ((req.url ?? "").startsWith("/rest/v1/rpc/")) {
          res.statusCode = rpcReply.status;
          res.end(JSON.stringify(rpcReply.body));
        } else {
          res.statusCode = authStatus;
          res.end(authStatus === 200 ? "{}" : JSON.stringify({ msg: "err", code: authStatus }));
        }
      });
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    admin = createClient(
      `http://127.0.0.1:${(srv.address() as AddressInfo).port}`,
      "x".repeat(40),
      { auth: { persistSession: false, autoRefreshToken: false } },
    ) as unknown as AdminAuthLike;
  });
  afterAll(() => srv.close());

  it("delete_member_data 를 올바른 경로·본문으로 호출하고 결과를 직렬화 가능한 모양으로 돌려준다", async () => {
    const api = supabaseAccountApi(admin);
    expect(await api.deleteMemberData("00000000-0000-4000-8000-000000000001", true)).toEqual({
      deleted: true,
      alreadyDeleted: false,
      forfeitedCoins: 1,
    });
    const last = seen.at(-1)!;
    expect(last.url).toBe("/rest/v1/rpc/delete_member_data");
    expect(JSON.parse(last.body)).toEqual({
      p_user: "00000000-0000-4000-8000-000000000001",
      p_forfeit: true,
    });
  });

  it("DB 가 COINS_REMAIN 으로 거부하면 AccountError(COINS_REMAIN), 다른 오류는 DELETE_FAILED", async () => {
    const api = supabaseAccountApi(admin);
    rpcReply = { status: 400, body: { message: "COINS_REMAIN", code: "P0001" } };
    await expect(api.deleteMemberData("u", false)).rejects.toMatchObject({ code: "COINS_REMAIN" });
    rpcReply = { status: 400, body: { message: "boom", code: "XX000" } };
    await expect(api.deleteMemberData("u", false)).rejects.toMatchObject({ code: "DELETE_FAILED" });
  });

  it("계정 삭제는 Auth admin DELETE 로 보내고, 이미 없는 계정(404)은 성공으로 본다", async () => {
    const api = supabaseAccountApi(admin);
    authStatus = 200;
    await api.deleteAuthUser("00000000-0000-4000-8000-000000000001");
    const last = seen.at(-1)!;
    expect(last.method).toBe("DELETE");
    expect(last.url).toContain("/auth/v1/admin/users/00000000-0000-4000-8000-000000000001");
    authStatus = 404;
    await expect(
      api.deleteAuthUser("00000000-0000-4000-8000-000000000002"),
    ).resolves.toBeUndefined();
    authStatus = 500;
    await expect(api.deleteAuthUser("00000000-0000-4000-8000-000000000003")).rejects.toMatchObject({
      code: "DELETE_FAILED",
    });
  });
});

describe("AccountDeleteView", () => {
  const base = { busy: false, message: "", onDelete: () => {} };
  it("로그인 전에는 로그인 링크만", () => {
    render(<AccountDeleteView {...base} signedIn={false} coins={0} enabled />);
    expect(q("a")[0]).toHaveAttribute("href", "/auth?next=/account-delete");
    expect(q("button")).toHaveLength(0);
  });
  it("꺼져 있으면(enabled=false) 안내 문구가 나오고 확인 문구를 써도 버튼은 잠겨 있다", () => {
    render(<AccountDeleteView {...base} signedIn coins={0} enabled={false} />);
    expect(host!.textContent).toContain("아직 준비 중");
    type(q("input")[0] as HTMLInputElement, DELETE_CONFIRM_TEXT);
    expect(btn()).toBeDisabled();
  });
  it("삭제·보관 항목을 먼저 보여 준다", () => {
    render(<AccountDeleteView {...base} signedIn coins={0} enabled />);
    const t = host!.textContent ?? "";
    expect(t).toContain("바로 삭제돼요");
    expect(t).toContain("출생정보");
    expect(t).toContain("일정 기간 남아요");
    expect(t).toContain("되돌릴 수 없어요");
  });
  it("엽전이 0 이면 확인 문구만 맞으면 활성, 클릭 시 forfeit=false 로 전달", () => {
    const onDelete = vi.fn();
    render(<AccountDeleteView {...base} onDelete={onDelete} signedIn coins={0} enabled />);
    expect(btn()).toBeDisabled();
    type(q("input")[0] as HTMLInputElement, "탈퇴 ");
    expect(btn()).toBeDisabled();
    type(q("input")[0] as HTMLInputElement, DELETE_CONFIRM_TEXT);
    expect(btn()).toBeEnabled();
    click(btn());
    expect(onDelete).toHaveBeenCalledWith({ confirm: DELETE_CONFIRM_TEXT, forfeit: false });
  });
  it("엽전이 남아 있으면 소멸 동의 체크 전에는 잠김, 체크하면 활성 + forfeit=true", () => {
    const onDelete = vi.fn();
    render(<AccountDeleteView {...base} onDelete={onDelete} signedIn coins={3} enabled />);
    expect(host!.textContent).toContain("남은 엽전 3닢");
    type(q("input[type=text], input:not([type])")[0] as HTMLInputElement, DELETE_CONFIRM_TEXT);
    expect(btn()).toBeDisabled();
    click(q("input[type=checkbox]")[0]!);
    expect(btn()).toBeEnabled();
    click(btn());
    expect(onDelete).toHaveBeenCalledWith({ confirm: DELETE_CONFIRM_TEXT, forfeit: true });
  });
  it("처리 중에는 잠기고, 메시지를 보여 준다", () => {
    render(
      <AccountDeleteView
        {...base}
        busy
        message="탈퇴 처리 중 문제가 생겼어요."
        signedIn
        coins={0}
        enabled
      />,
    );
    expect(btn()).toBeDisabled();
    expect(q('[role="alert"]')[0]!.textContent).toContain("문제가 생겼어요");
  });
});

describe("라우트", () => {
  it("/account-delete 가 페이지로 매칭된다(404 아님)", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/account-delete").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
