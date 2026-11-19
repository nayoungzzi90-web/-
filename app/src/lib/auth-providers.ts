// 소셜 로그인 제공자 목록. 어떤 제공자가 켜져 있는지는 공개 설정 값(VITE_AUTH_PROVIDERS, 예: "google,kakao,naver")으로 정한다.
// 이 값은 비밀이 아니다(버튼을 보일지 말지만 정한다). 실제 사용 가능 여부는 Supabase 대시보드 설정이 정한다.
export type SocialProvider = "google" | "kakao" | "naver";

export const PROVIDER_INFO: Record<SocialProvider, { label: string; supabaseId: string }> = {
  google: { label: "Google로 계속하기", supabaseId: "google" },
  kakao: { label: "카카오로 계속하기", supabaseId: "kakao" },
  // 네이버는 Supabase 기본 목록에 없어 커스텀 OAuth 제공자(`custom:` 접두)로 등록해야 한다.
  naver: { label: "네이버로 계속하기", supabaseId: "custom:naver" },
};
const ORDER: SocialProvider[] = ["kakao", "naver", "google"];

/** 쉼표로 적은 설정 값에서 알려진 제공자만, 고정 순서로 돌려준다. 모르는 값·중복은 버린다. */
export function parseProviders(raw: string | undefined | null): SocialProvider[] {
  const set = new Set((raw ?? "").split(",").map((s) => s.trim().toLowerCase()));
  return ORDER.filter((p) => set.has(p));
}

export function enabledProviders(): SocialProvider[] {
  return parseProviders(import.meta.env["VITE_AUTH_PROVIDERS"] as string | undefined);
}

export function oauthErrorKo(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "이 로그인은 아직 준비 중이에요. 다른 방법으로 로그인해 주세요.";
  return "로그인에 문제가 생겼어요. 다시 시도해 주세요.";
}
