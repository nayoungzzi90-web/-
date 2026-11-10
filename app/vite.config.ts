import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Worker 이름은 Cloudflare 대시보드의 Worker 이름과 같아야 빌드가 통과한다(바꾸면 대시보드도 같이 바꿀 것).
// 배포 때 대시보드의 변수(주소·키)를 지우지 않도록 keep_vars 를 켠다.
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    nitro({
      preset: "cloudflare-module",
      cloudflare: { wrangler: { name: "ohaeng-friends", keep_vars: true } },
      // 모든 응답에 붙이는 보안 헤더(옛 앱과 같은 4개 + 다른 사이트가 화면을 iframe 에 끼우는 것 차단).
      // 스크립트 출처를 제한하는 CSP 는 SSR 인라인 스크립트 때문에 아직 넣지 않았다(nonce 방식으로 따로 도입).
      routeRules: {
        "/**": {
          headers: {
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy":
              "camera=(), microphone=(), geolocation=(), payment=(self)",
            "strict-transport-security": "max-age=15552000",
            "x-frame-options": "DENY",
            "content-security-policy":
              "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        },
      },
    } as never),
  ],
});
