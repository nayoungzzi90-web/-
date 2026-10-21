import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChargeView } from "@/components/ChargeView";
import { LedgerView } from "@/components/LedgerView";
import {
  PACKS,
  chargeErrorKo,
  ledgerText,
  newSandboxPaymentKey,
  runCharge,
  type ChargeDeps,
} from "@/lib/charge";
import { routeTree } from "@/routeTree.gen";

// @testing-library/dom 이 설치돼 있지 않아(의존성 추가를 피하려고) react-dom 으로 직접 그린다.
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
const q = (sel: string) => Array.from((host ?? document.body).querySelectorAll<HTMLElement>(sel));
const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
const byText = (t: string | RegExp) =>
  q("*").filter(
    (e) => e.children.length === 0 && (typeof t === "string" ? textOf(e) === t : t.test(textOf(e))),
  );
const screen = {
  getByText: (t: string | RegExp) => {
    const r = byText(t);
    if (r.length !== 1) throw new Error(`getByText(${t}) → ${r.length}개`);
    return r[0]!;
  },
  queryByText: (t: string | RegExp) => byText(t)[0] ?? null,
  getAllByRole: (role: string, o: { name: string }) =>
    q(role === "button" ? "button" : "a").filter((e) => textOf(e) === o.name),
  queryAllByRole: (role: string, o: { name: string }) =>
    q(role === "button" ? "button" : "a").filter((e) => textOf(e) === o.name),
  getByRole: (role: string, o?: { name?: string }) => {
    const sel = role === "alert" ? '[role="alert"]' : role === "link" ? "a" : role;
    const r = q(sel).filter((e) => !o?.name || textOf(e) === o.name);
    if (r.length !== 1) throw new Error(`getByRole(${role}) → ${r.length}개`);
    return r[0]!;
  },
};
const fireEvent = { click: (el: HTMLElement) => act(() => void el.click()) };

describe("충전 팩과 문구", () => {
  it("팩은 1~4닢 = 900/1,800/2,700/3,600원", () => {
    expect(PACKS.map((p) => [p.coins, p.amountKrw, p.price])).toEqual([
      [1, 900, "900원"],
      [2, 1800, "1,800원"],
      [3, 2700, "2,700원"],
      [4, 3600, "3,600원"],
    ]);
  });
  it("오류 코드를 사용자 문구로, 모르는 오류는 일반 문구", () => {
    expect(chargeErrorKo("PAYMENTS_DISABLED")).toContain("준비 중");
    expect(chargeErrorKo("AMOUNT_MISMATCH")).toContain("금액");
    expect(chargeErrorKo("PROVIDER_REJECTED")).toContain("승인");
    expect(chargeErrorKo("boom at line 3")).toContain("문제가 생겼어요");
    expect(chargeErrorKo(undefined)).toContain("문제가 생겼어요");
  });
  it("sandbox 결제 키는 서버가 승인하는 모양(sandbox_ + 영숫자)", () => {
    expect(newSandboxPaymentKey()).toMatch(/^sandbox_[A-Za-z0-9_-]{4,64}$/);
    expect(newSandboxPaymentKey()).not.toBe(newSandboxPaymentKey());
  });
  it("원장 문구", () => {
    expect(
      ledgerText({
        id: 1,
        delta: 1,
        reason: "purchase",
        ref: null,
        balanceAfter: 3,
        createdAt: "2026-10-21T00:00:00Z",
      }),
    ).toBe("엽전 충전 +1닢 (잔액 3닢)");
    expect(
      ledgerText({
        id: 2,
        delta: -2,
        reason: "spend",
        ref: "love",
        balanceAfter: 1,
        createdAt: "2026-10-21T00:00:00Z",
      }),
    ).toBe("풀이 열람 -2닢 (잔액 1닢)");
    expect(
      ledgerText({
        id: 3,
        delta: 1,
        reason: "weird",
        ref: null,
        balanceAfter: 1,
        createdAt: "2026-10-21T00:00:00Z",
      }),
    ).toContain("기타");
  });
});

describe("runCharge (주문 → 확정)", () => {
  const ok = (): ChargeDeps => ({
    createOrder: vi.fn(async () => ({
      orderId: "o1",
      coins: 2,
      amountKrw: 1800,
      orderName: "엽전 2닢",
    })),
    confirmOrder: vi.fn(async () => ({
      credited: true,
      alreadyCredited: false,
      balance: 2,
      referral: "none",
    })),
    paymentKey: () => "sandbox_testkey123",
  });
  it("팩 크기만 서버로 보내고(금액 안 보냄), 승인 키로 확정한다", async () => {
    const d = ok();
    const r = await runCharge(2, d);
    expect(r).toEqual({ ok: true, balance: 2, coins: 2 });
    expect(d.createOrder).toHaveBeenCalledWith({ data: { coins: 2 } });
    expect(d.confirmOrder).toHaveBeenCalledWith({
      data: { orderId: "o1", paymentKey: "sandbox_testkey123" },
    });
  });
  it("결제가 꺼져 있으면 문구로 실패하고 확정을 부르지 않는다", async () => {
    const d = ok();
    d.createOrder = vi.fn(async () => {
      throw new Error("PAYMENTS_DISABLED");
    });
    const r = await runCharge(1, d);
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("준비 중");
    expect(d.confirmOrder).not.toHaveBeenCalled();
  });
  it("확정 단계 오류(금액 불일치)도 문구로", async () => {
    const d = ok();
    d.confirmOrder = vi.fn(async () => {
      throw new Error("AMOUNT_MISMATCH");
    });
    const r = await runCharge(3, d);
    expect((r as { message: string }).message).toContain("금액");
  });
});

describe("ChargeView", () => {
  const base = { coins: 2, busyCoins: null, message: "", onBuy: () => {} };
  it("결제 준비 전(disabled): 안내 문구, 충전 버튼은 모두 비활성", () => {
    render(<ChargeView {...base} signedIn status={{ mode: "disabled", available: false }} />);
    expect(screen.getByText(/결제는 아직 준비 중/)).toBeInTheDocument();
    const btns = screen.getAllByRole("button", { name: "충전하기" });
    expect(btns).toHaveLength(4);
    btns.forEach((b) => expect(b).toBeDisabled());
    expect(screen.queryByText(/테스트 결제/)).toBeNull();
  });
  it("sandbox: '실제 돈은 나가지 않아요' 배너, 버튼 활성, 클릭하면 해당 팩 크기로 호출", () => {
    const onBuy = vi.fn();
    render(
      <ChargeView {...base} onBuy={onBuy} signedIn status={{ mode: "sandbox", available: true }} />,
    );
    expect(screen.getByText(/실제 돈은 나가지 않아요/)).toBeInTheDocument();
    const btns = screen.getAllByRole("button", { name: "충전하기" });
    btns.forEach((b) => expect(b).toBeEnabled());
    fireEvent.click(btns[2]!);
    expect(onBuy).toHaveBeenCalledWith(3);
  });
  it("처리 중에는 다른 팩 버튼도 잠근다", () => {
    render(
      <ChargeView {...base} busyCoins={2} signedIn status={{ mode: "sandbox", available: true }} />,
    );
    expect(screen.getByRole("button", { name: "처리 중…" })).toBeDisabled();
    screen.getAllByRole("button", { name: "충전하기" }).forEach((b) => expect(b).toBeDisabled());
  });
  it("로그인 전에는 팩 대신 로그인 링크", () => {
    render(<ChargeView {...base} signedIn={false} status={{ mode: "sandbox", available: true }} />);
    expect(screen.queryAllByRole("button", { name: "충전하기" })).toHaveLength(0);
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth?next=/charge",
    );
  });
  it("보유 엽전·900원 안내·메시지 표시", () => {
    render(
      <ChargeView
        {...base}
        message="엽전 2닢이 충전됐어요."
        signedIn
        status={{ mode: "sandbox", available: true }}
      />,
    );
    expect(screen.getByText("2닢")).toBeInTheDocument();
    expect(screen.getByText("1닢 = 900원")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("충전됐어요");
  });
});

describe("LedgerView", () => {
  it("불러오는 중 / 준비 중(SQL 미적용) / 비어 있음 / 목록", () => {
    const { rerender } = render(<LedgerView rows={[]} unavailable={false} loading />);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    rerender(<LedgerView rows={[]} unavailable loading={false} />);
    expect(screen.getByText(/아직 준비 중/)).toBeInTheDocument();
    rerender(<LedgerView rows={[]} unavailable={false} loading={false} />);
    expect(screen.getByText(/내역이 없어요/)).toBeInTheDocument();
    rerender(
      <LedgerView
        rows={[
          {
            id: 1,
            delta: 2,
            reason: "purchase",
            ref: null,
            balanceAfter: 2,
            createdAt: "2026-10-21T03:00:00Z",
          },
        ]}
        unavailable={false}
        loading={false}
      />,
    );
    expect(screen.getByText("엽전 충전 +2닢 (잔액 2닢)")).toBeInTheDocument();
  });
});

describe("라우트", () => {
  it("/charge, /ledger 가 페이지로 매칭된다(404 아님)", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of ["/charge", "/ledger"])
      expect(router.matchRoutes(path).at(-1)?.routeId, path).not.toBe(rootRouteId);
  });
});
