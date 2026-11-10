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
    } as never),
  ],
});
