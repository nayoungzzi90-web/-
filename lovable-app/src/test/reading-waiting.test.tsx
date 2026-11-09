import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingWaiting } from "@/components/ReadingWaiting";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.useRealTimers());

describe("ReadingWaiting", () => {
  it("한 줄 문구와 오행 상식이 시간이 지나면 바뀌고, 진행률은 '예상'이며 95%를 넘지 않는다", () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<ReadingWaiting intervalMs={1000} />));
    const first = host.textContent;
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1100));
    expect(host.textContent).not.toBe(first);
    const seen = new Set<string>();
    for (let n = 0; n < 8; n++) {
      seen.add(host.textContent ?? "");
      act(() => void vi.advanceTimersByTime(1000));
    }
    expect(seen.size).toBeGreaterThan(3);
    // 사주아이식 예상 진행률(2026-11-09 결정): 숫자 %는 보여 주되 "예상"이라고 밝히고 95%를 넘기지 않는다.
    for (const t of seen) {
      const m = /(\d+)\s*%/.exec(t);
      expect(m).not.toBeNull();
      expect(Number(m![1])).toBeLessThanOrEqual(95);
      expect(t).toMatch(/예상|어림|조금 더/);
    }
    expect(host.querySelector('[role="progressbar"]')).not.toBeNull();
    act(() => root.unmount());
    host.remove();
  });
});
