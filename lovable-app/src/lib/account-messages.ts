/** 탈퇴 오류(서버가 던진 코드 메시지) → 사용자 문구. 화면에서 쓴다. */
export function accountErrorKo(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("ACCOUNT_DELETION_DISABLED"))
    return "회원 탈퇴는 아직 준비 중이에요. 문의로 요청해 주세요.";
  if (m.includes("CONFIRM_REQUIRED")) return "확인 문구를 정확히 입력해 주세요.";
  if (m.includes("COINS_REMAIN")) return "남은 엽전이 사라지는 것에 동의해 주세요.";
  return "탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
