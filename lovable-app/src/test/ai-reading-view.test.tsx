import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { AiReading } from "@/components/AiReading";
import type { AiReadingResponse } from "@/lib/ai-reading.server";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const me = {
  name: "나영",
  calendar: "solar",
  leap: false,
  date: "1995-05-17",
  time: "14:00",
  gender: "f",
} as never;
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

function mount(fetcher: () => Promise<AiReadingResponse>, pollMs = 5) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<AiReading me={me} fetcher={fetcher} pollMs={pollMs} />));
  const click = () => act(() => void host.querySelector("button")!.click());
  return { host, click };
}

describe("AI 풀이 화면", () => {
  it("누르기 전에는 서버를 부르지 않는다", () => {
    const fetcher = vi.fn();
    const { host } = mount(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(host.textContent).toContain("AI 풀이 보기");
  });

  it("누르면 기다리는 화면 → 시범 표시와 함께 본문을 보여 준다", async () => {
    let resolve!: (r: AiReadingResponse) => void;
    const fetcher = vi.fn(() => new Promise<AiReadingResponse>((r) => (resolve = r)));
    const { host, click } = mount(fetcher);
    click();
    // 기다리는 화면: 예상 진행률 막대와 예상 남은 시간이 보인다
    expect(host.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(host.textContent).toContain("예상 남은 시간");
    resolve({
      ok: true,
      state: "ready",
      trial: true,
      reviewed: false,
      sections: [
        {
          id: "s1",
          title: "나의 큰 그림",
          headline: "흙 기운이 중심",
          body: "나영님은 흙 기운이 중심이에요.",
        },
      ],
    });
    await flush();
    expect(host.textContent).toContain("시범 풀이예요");
    expect(host.textContent).toContain("나영님은 흙 기운이 중심이에요.");
    expect(host.textContent).not.toMatch(/\p{Script=Han}/u);
  });

  it("다른 요청이 만드는 중이면 잠시 뒤 다시 물어본다", async () => {
    const answers: AiReadingResponse[] = [
      { ok: true, state: "running" },
      {
        ok: true,
        state: "ready",
        trial: false,
        reviewed: true,
        sections: [{ id: "s1", title: "t", headline: "", body: "본문" }],
      },
    ];
    const fetcher = vi.fn(async () => answers.shift()!);
    const { host, click } = mount(fetcher);
    click();
    await flush();
    await act(async () => void (await new Promise((r) => setTimeout(r, 20))));
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain("본문");
    expect(host.textContent).toContain("다른 AI가 한 번 더");
    expect(host.textContent).not.toContain("시범 풀이예요");
  });

  it("준비 중·오류 안내를 그대로 보여 준다", async () => {
    const { host, click } = mount(async () => ({
      ok: true,
      state: "unavailable",
      message: "AI 풀이는 아직 준비 중이에요.",
    }));
    click();
    await flush();
    expect(host.textContent).toContain("아직 준비 중");
  });
});
