// 또또 변형 5종(오행별): 같은 얼굴에 새싹 색과 오행 배지만 다르다. React 없이 SVG 문자열로 만들어 <img>·캔버스(공유 카드)에서 모두 쓴다.
// 임시 일러스트(직접 그린 SVG)이며 투명 PNG 원본이 생기면 교체한다.
export type ElementKo = "목" | "화" | "토" | "금" | "수";
const INK = "#28231f";
const LEAF: Record<ElementKo, [string, string]> = {
  목: ["#8fd14f", "#a7de63"],
  화: ["#ff9a5a", "#ffc08a"],
  토: ["#e8c24a", "#f4dd8a"],
  금: ["#d5dae1", "#eef1f4"],
  수: ["#78c2ea", "#a9dbf5"],
};
const BADGE: Record<ElementKo, string> = { 목: "#edf6df", 화: "#fce6e8", 토: "#fff4d4", 금: "#eef0f3", 수: "#e4f1fb" };

export function friendSvg(el: ElementKo, opts: { badge?: boolean } = {}): string {
  const [l1, l2] = LEAF[el];
  const badge = opts.badge === false ? "" : `<circle cx="188" cy="168" r="22" fill="${BADGE[el]}" stroke="${INK}" stroke-width="4"/><text x="188" y="176" font-size="22" font-weight="700" fill="${INK}" font-family="Jua,Apple SD Gothic Neo,sans-serif" style="text-anchor:middle">${el}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="400" viewBox="0 0 220 200"><path d="M112 66 Q114 44 108 28" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M108 32 C80 6 44 16 50 46 C78 52 100 48 108 32Z" fill="${l1}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M112 40 C130 16 164 24 158 46 C142 54 122 52 112 40Z" fill="${l2}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="112" cy="128" rx="84" ry="64" fill="#fffdf4" stroke="${INK}" stroke-width="4"/><path d="M72 100 L98 110 M152 100 L126 110" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><circle cx="90" cy="122" r="5.5" fill="${INK}"/><circle cx="134" cy="122" r="5.5" fill="${INK}"/><path d="M56 134 l10 -7 M60 146 l10 -7 M168 134 l-10 -7 M164 146 l-10 -7" stroke="#ff7049" stroke-width="4" stroke-linecap="round"/><path d="M102 142 Q112 158 124 142Z" fill="#ff7a6b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${badge}</svg>`;
}
export const friendDataUrl = (el: ElementKo, opts?: { badge?: boolean }) => `data:image/svg+xml;utf8,${encodeURIComponent(friendSvg(el, opts))}`;
