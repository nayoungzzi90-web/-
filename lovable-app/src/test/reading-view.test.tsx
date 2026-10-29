import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ReadingView } from "@/components/ReadingView";
import type { OutSection } from "@/lib/reading.server";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let host: HTMLElement | null = null;
function render(el: ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const free: OutSection = {
  id: "s1",
  title: "원국 핵심",
  tag: "한마디로",
  headline: "푸른 호랑이",
  locked: false,
  body: "첫 문단이에요.\n둘째 문단이에요.\n\n▶ 지금",
};
const locked: OutSection = {
  id: "s2",
  title: "타고난 성격·기질",
  tag: "성격",
  locked: true,
  teaser: "물려받은 기질은 이렇게 드러나서…",
};

describe("ReadingView", () => {
  it("무료 섹션은 본문을 펼쳐 보이고(문단 나눔), 잠긴 섹션은 제목과 미리보기만", () => {
    const h = render(<ReadingView sections={[free, locked]} chars={3456} needsReview={false} />);
    const details = h.querySelectorAll("details");
    expect(details).toHaveLength(1);
    expect(details[0]!.hasAttribute("open")).toBe(true);
    expect(Array.from(details[0]!.querySelectorAll("p")).map((p) => p.textContent)).toEqual([
      "푸른 호랑이",
      "첫 문단이에요.",
      "둘째 문단이에요.",
      "▶ 지금",
    ]);
    const lockedCard = h.querySelector('[aria-label="타고난 성격·기질 (잠김)"]')!;
    expect(lockedCard.textContent).toContain("🔒");
    expect(lockedCard.textContent).toContain("물려받은 기질은 이렇게 드러나서…");
    expect(h.textContent).toContain("3,456자");
    expect(h.textContent).not.toContain("절입 시각에 가까운");
  });
  it("전부 열람하면 모든 섹션이 접이식 본문으로 나오고 잠금 표시가 없다", () => {
    const second: OutSection = {
      id: "s2",
      title: "타고난 성격·기질",
      locked: false,
      body: "둘째 섹션 본문",
    };
    const h = render(<ReadingView sections={[free, second]} chars={100} needsReview={false} />);
    expect(h.querySelectorAll("details")).toHaveLength(2);
    expect(h.textContent).not.toContain("🔒");
    expect(h.querySelectorAll("details")[1]!.hasAttribute("open")).toBe(false);
  });
  it("절입 시각 가까이의 출생이면 안내를 보여 준다", () => {
    const h = render(<ReadingView sections={[free]} chars={10} needsReview />);
    expect(h.querySelector('[role="status"]')!.textContent).toContain("절입 시각에 가까운");
  });
  it("본문에 HTML 이 있어도 문자로만 보인다", () => {
    const evil: OutSection = {
      id: "x",
      title: "t",
      locked: false,
      body: '<img src=x onerror="alert(1)">',
    };
    const h = render(<ReadingView sections={[evil]} chars={1} needsReview={false} />);
    expect(h.querySelector("img")).toBeNull();
    expect(h.textContent).toContain("<img");
  });
});
