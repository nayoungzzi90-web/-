// "요즘 고민" 입력(선택). 풀이를 개인에게 맞추는 데 쓸 글이라 길이와 모양을 먼저 다듬는다.
// 아직 AI 풀이가 꺼져 있어서 이 글은 어디로도 전송되지 않고, 이 기기의 화면 상태에만 잠시 둔다.
export const CONCERN_MAX = 300;

/** 줄바꿈을 정리하고 앞뒤 공백을 없앤 뒤 최대 길이로 자른다. 제어 문자는 뺀다. */
export function cleanConcern(raw: string): string {
  const noControl = Array.from(raw.replace(/\r\n?/g, "\n"))
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c === 9 || c === 10 || (c >= 32 && c !== 127);
    })
    .join("");
  return noControl
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CONCERN_MAX);
}

/** 글자 수에 맞춰 격려 한마디를 돌려준다. */
export function concernFeedback(len: number): string {
  if (len <= 0) return "한두 줄이라도 적어주면 더 잘 맞아요";
  if (len < 30) return "조금만 더 구체적으로 적어볼까요?";
  if (len < 120) return "오, 디테일이 살아있어요";
  return "충분해요! 깊이 있게 풀어드릴 수 있어요";
}
