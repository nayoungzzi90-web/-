// 공유 문구·링크(순수 함수). 출생일·시각·이름은 공유 내용에 넣지 않는다 — 캐릭터와 한 줄 소개만.
export const REF_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** 초대 코드가 올바르면 `?ref=` 가 붙은 링크, 아니면 첫 화면 주소만 */
export function shareUrl(origin: string, inviteCode?: string | null): string {
  const base = origin.replace(/\/+$/, "");
  return inviteCode && REF_PATTERN.test(inviteCode)
    ? `${base}/?ref=${encodeURIComponent(inviteCode)}`
    : `${base}/`;
}

export function shareText(c: { name: string; epithet?: string | undefined; personality: string }): string {
  const who = c.epithet ? `${c.epithet} ${c.name}` : c.name;
  return `나는 ${who}! ${c.personality}. 너의 오행 친구는?`;
}

/** 링크에서 읽은 초대 코드를 저장해도 되는 값인지 확인한다(그 외는 버린다) */
export function cleanRef(v: unknown): string | null {
  return typeof v === "string" && REF_PATTERN.test(v) ? v : null;
}
