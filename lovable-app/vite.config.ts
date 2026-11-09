// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// 배포할 때 Cloudflare 대시보드에 넣어 둔 변수(주소·키)를 지우지 않는다(wrangler 의 keep_vars).
// 설정 도우미의 타입에는 wrangler 항목이 없어서 변수에 담아 넘긴다(실행 시에는 그대로 전달됨).
const cloudflare: { nodeCompat?: boolean; deployConfig?: boolean } = {
  wrangler: { keep_vars: true },
} as { nodeCompat?: boolean; deployConfig?: boolean };

export default defineConfig({
  nitro: { cloudflare },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
