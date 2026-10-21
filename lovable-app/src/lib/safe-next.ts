/** 로그인 후 이동할 경로(`?next=`)를 같은 사이트 안의 경로로만 제한한다. `//evil.com`, `/\evil.com`, 개행 등은 홈으로. */
export function safeNext(next: string | undefined | null): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    /[\r\n\t\\]/.test(next)
  )
    return "/";
  return next;
}
