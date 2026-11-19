import { createStart, createCsrfMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// 서버 함수를 부를 때 로그인 토큰을 자동으로 붙인다(로그인하지 않았으면 붙이지 않는다).
// src/start.ts 를 만들면 Start 의 기본 CSRF 방어가 꺼지므로 다시 명시한다.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [csrfMiddleware],
}));
