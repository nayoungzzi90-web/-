/** 가입 시 비밀번호 최소 기준(화면에서 먼저 확인). 서버(인증) 설정의 최소 길이도 같은 값 이상으로 올려야 한다 — 이 검사는 화면 보조일 뿐이다. */
export const MIN_PASSWORD_LENGTH = 8;

const COMMON = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwerty123",
  "11111111",
  "00000000",
  "iloveyou",
  "abc12345",
  "asdf1234",
]);

/** 문제가 있으면 사용자 문구, 없으면 null. 로그인(기존 계정)에는 쓰지 않는다. */
export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH)
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 만들어 주세요.`;
  if (pw.length > 72) return "비밀번호는 72자 이하로 만들어 주세요.";
  if (COMMON.has(pw.toLowerCase())) return "너무 흔한 비밀번호예요. 다른 비밀번호를 써 주세요.";
  if (/^(.)\1+$/.test(pw)) return "같은 글자만 반복한 비밀번호는 쓸 수 없어요.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && pw.toLowerCase().includes(local))
    return "이메일 주소가 들어간 비밀번호는 쓸 수 없어요.";
  return null;
}
