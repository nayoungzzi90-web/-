import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MiniMarkdown } from "@/components/MiniMarkdown";
import { LEGAL_VERSION, decideLegal, hasPlaceholders, stripInternalNotes } from "@/lib/legal";

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

describe("법적 문서 게시 규칙", () => {
  const withBlank = "# 약관\n\n상호 {{상호}}\n";
  const clean = "# 약관\n\n상호 오행주식회사\n";
  it("빈칸({{ }})을 감지", () => {
    expect(hasPlaceholders(withBlank)).toBe(true);
    expect(hasPlaceholders(clean)).toBe(false);
    expect(hasPlaceholders("{{ }}")).toBe(true);
  });
  it("개발 화면에서는 초안으로 보이고, 운영에서는 '승인 + 빈칸 없음'일 때만 보인다", () => {
    expect(decideLegal(withBlank, { prod: false, approved: false })).toMatchObject({
      status: "draft",
    });
    expect(decideLegal(withBlank, { prod: true, approved: false })).toBeNull(); // 미승인
    expect(decideLegal(clean, { prod: true, approved: false })).toBeNull(); // 빈칸 없어도 미승인이면 숨김
    expect(decideLegal(withBlank, { prod: true, approved: true })).toBeNull(); // 승인했어도 빈칸이 남았으면 숨김
    expect(decideLegal(clean, { prod: true, approved: true })).toMatchObject({
      status: "approved",
    });
  });
  it("내부 메모 구간은 잘라낸다", () => {
    const raw =
      "# 정책\n\n본문\n\n## 6. 서비스 구현상 유의(내부 메모 — 게시용 아님)\n\n비밀 메모\n";
    expect(stripInternalNotes(raw)).toBe("# 정책\n\n본문");
    expect(decideLegal(raw, { prod: false, approved: false })!.text).not.toContain("비밀 메모");
    expect(stripInternalNotes("# 정책\n본문")).toBe("# 정책\n본문");
  });
  it("버전 문자열은 서버가 받는 형식(영숫자 . _ -, 40자 이하)", () => {
    expect(LEGAL_VERSION).toMatch(/^[A-Za-z0-9._-]{1,40}$/);
    expect(LEGAL_VERSION.startsWith("draft-")).toBe(true); // 승인 전
  });
});

describe("MiniMarkdown", () => {
  it("제목·목록·표·인용·굵게를 그린다", () => {
    const h = render(
      <MiniMarkdown
        source={
          "# 제목\n\n> 안내 **중요**\n\n## 소제목\n\n- 하나\n- 둘\n\n1. 첫째\n2. 둘째\n\n| 구분 | 값 |\n|---|---|\n| 가 | **나** |\n\n문단 `코드` 끝"
        }
      />,
    );
    expect(h.querySelector("h1")!.textContent).toBe("제목");
    expect(h.querySelector("h2")!.textContent).toBe("소제목");
    expect(h.querySelector("blockquote strong")!.textContent).toBe("중요");
    expect(Array.from(h.querySelectorAll("ul li")).map((l) => l.textContent)).toEqual([
      "하나",
      "둘",
    ]);
    expect(Array.from(h.querySelectorAll("ol li")).map((l) => l.textContent)).toEqual([
      "첫째",
      "둘째",
    ]);
    expect(Array.from(h.querySelectorAll("th")).map((c) => c.textContent)).toEqual(["구분", "값"]);
    expect(h.querySelector("td strong")!.textContent).toBe("나");
    expect(h.querySelector("code")!.textContent).toBe("코드");
  });
  it("HTML 을 해석하지 않는다(문자로 보인다)", () => {
    const h = render(
      <MiniMarkdown source={'<img src=x onerror="alert(1)"> <script>alert(1)</script>'} />,
    );
    expect(h.querySelector("img")).toBeNull();
    expect(h.querySelector("script")).toBeNull();
    expect(h.textContent).toContain("<script>");
  });
});

// 운영 빌드에 초안 본문이 들어가지 않는지 실제 빌드로 확인한다(대조군: 개발 모드 빌드에는 들어가야 함).
function scan(dir: string, needles: string[]): string[] {
  const hit = new Set<string>();
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|mjs|css|html|json|txt)$/.test(n)) {
        const t = readFileSync(p, "utf8");
        for (const needle of needles) if (t.includes(needle)) hit.add(needle);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return [...hit];
}
describe("운영 빌드에 초안 본문이 포함되지 않는다", () => {
  const needles = ["이용약관 (초안", "개인정보처리방침 (초안", "엽전 결제·환불 정책 (초안"];
  it("대조군(개발 모드 빌드)에는 들어 있고, 운영 빌드에는 없다", () => {
    // vitest 는 NODE_ENV=test 를 설정하므로 자식 빌드에는 값을 명시해 줘야 운영/개발 빌드가 제대로 구분된다.
    const run = (cmd: string, nodeEnv: string) =>
      execSync(cmd, {
        cwd: process.cwd(),
        stdio: "pipe",
        env: { ...process.env, NODE_ENV: nodeEnv, VITE_LEGAL_APPROVED: "" },
      });
    rmSync(".output", { recursive: true, force: true });
    run("npx vite build --mode development", "development");
    const dev = scan(".output", needles);
    expect(dev.length, "대조군에서 초안 문구를 찾지 못함 — 검사 자체가 무의미").toBeGreaterThan(0);
    rmSync(".output", { recursive: true, force: true });
    run("npx vite build", "production");
    const prod = scan(".output", [...needles, "서비스 구현상 유의", "법무 검토 전, 게시 금지"]);
    rmSync(".output", { recursive: true, force: true });
    rmSync(".wrangler", { recursive: true, force: true });
    expect(prod).toEqual([]);
  }, 240_000);
});
