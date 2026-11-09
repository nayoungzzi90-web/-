import { useEffect } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { hydrateStore } from "@/lib/store";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "오행 친구들" },
    ],
    links: [
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
