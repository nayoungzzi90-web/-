import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 풀이 본문을 만드는 문장·엔진 데이터는 서버에만 있어야 한다. 클라이언트 번들(.output/public)에 들어가면
// 유료 풀이 전체가 브라우저로 새어 나가므로, 실제 운영 빌드를 만들어 검사한다(대조군: 서버 번들에는 있어야 함).
const SENTINELS = [
  "출생 시간을 모르면 시간의 기둥인 시주를 빼고", // reading.ts (기본사주 시간 미상 안내)
  "마지막으로 올해 안에 해 볼 연애 계획을 세 가지로", // reading.ts (연애운 마무리)
];
function containing(dir: string, needles: string[]): string[] {
  const hit = new Set<string>();
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|mjs|css|html|json|txt)$/.test(n)) {
        const t = readFileSync(p, "utf8");
        for (const needle of needles) if (t.includes(needle)) hit.add(needle);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return [...hit];
}

describe("풀이 본문이 클라이언트 번들에 들어가지 않는다", () => {
  it("서버 번들에는 있고 클라이언트 번들(public)에는 없다", () => {
    rmSync(".output", { recursive: true, force: true });
    execSync("npx vite build", {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production", VITE_LEGAL_APPROVED: "" },
    });
    const server = containing(join(".output", "server"), SENTINELS);
    const client = containing(join(".output", "public"), SENTINELS);
    rmSync(".output", { recursive: true, force: true });
    rmSync(".wrangler", { recursive: true, force: true });
    expect(server.length, "대조군: 서버 번들에서 문장을 찾지 못함 — 검사 자체가 무의미").toBe(
      SENTINELS.length,
    );
    expect(client).toEqual([]);
  }, 240_000);
});
