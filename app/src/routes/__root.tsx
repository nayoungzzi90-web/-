import { useEffect } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { hydrateStore } from "@/lib/store";
import { useAuthSync } from "@/lib/auth-sync";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "또또사주" },
      { name: "description", content: SITE_DESC },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "또또사주 — 나의 사주, 또또가 알려줄게" },
      { property: "og:description", content: SITE_DESC },
      { property: "og:image", content: `${SITE_URL}/restore/hero.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: Root,
});

function Root() {
  // 이 기기에 저장해 둔 입력(생년월일·고민)을 한 번 불러온다.
  useEffect(() => {
    hydrateStore();
  }, []);
  // 로그인 상태(연결 정보가 있을 때만)와 내 닢 잔액을 맞춘다.
  useAuthSync();
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
