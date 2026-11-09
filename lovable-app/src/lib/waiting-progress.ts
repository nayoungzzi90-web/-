// 풀이를 기다리는 화면의 "예상" 진행률. 서버는 진행 정도를 알려주지 않으므로 지난 시간으로만 어림한다.
// 거짓말이 되지 않게: 끝나기 전에는 95%를 넘기지 않고, 시간은 "예상"이라고 표시한다.
export const WAIT_CAP_PERCENT = 95;

export interface WaitEstimate {
  /** 0~95. 풀이가 실제로 끝나면 화면이 바뀌므로 100%는 보여주지 않는다. */
  percent: number;
  /** 예상 남은 초(5초 단위). 예상 시간을 넘기면 null — "조금만 더"로 안내한다. */
  remainingSec: number | null;
}

export function estimateWait(elapsedSec: number, expectedSec: number): WaitEstimate {
  const e = Math.max(0, elapsedSec);
  const x = Math.max(10, expectedSec);
  if (e < x) {
    const percent = Math.min(90, Math.floor((e / x) * 90));
    const left = Math.ceil((x - e) / 5) * 5;
    return { percent, remainingSec: left };
  }
  // 예상 시간을 넘기면 천천히만 올린다(95%에서 멈춤)
  const extra = Math.min(WAIT_CAP_PERCENT - 90, Math.floor((e - x) / 10));
  return { percent: 90 + extra, remainingSec: null };
}
