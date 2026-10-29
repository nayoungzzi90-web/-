import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingWaiting } from "@/components/ReadingWaiting";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.useRealTimers());

describe("ReadingWaiting", () => {
  it("한 줄 문구와 오행 상식이 시간이 지나면 바뀌고, 한자·가짜 진행률(%)이 없다", () => {
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
    for (const t of seen) {
      expect(t).not.toMatch(/\p{Script=Han}/u);
      expect(t).not.toMatch(/\d+\s*%/);
    }
    act(() => root.unmount());
    host.remove();
  });
});
