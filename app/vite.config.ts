import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// 배포 때 Cloudflare 대시보드의 변수(주소·키)를 지우지 않도록 keep_vars 를 켠다.
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    nitro({ preset: "cloudflare-module", cloudflare: { wrangler: { keep_vars: true } } } as never),
  ],
});
