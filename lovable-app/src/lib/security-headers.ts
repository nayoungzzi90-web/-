// 모든 응답에 붙이는 보안 헤더. CSP·X-Frame-Options 는 일부러 넣지 않았다:
//   · SSR 이 인라인 스크립트를 쓰고, Lovable 편집기가 미리보기를 iframe 으로 열기 때문 — 배포 환경에서 시험하며 따로 도입한다.
const HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "strict-transport-security": "max-age=15552000",
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers); // 원본 헤더가 읽기 전용일 수 있어 복사한다
  for (const [k, v] of Object.entries(HEADERS)) if (!headers.has(k)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
