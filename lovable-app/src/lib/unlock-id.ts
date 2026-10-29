// 열람 id = 상품 + ':' + 출생정보 해시. 한 번 결제로 다른 사람의 풀이까지 열리지 않게 풀이를 "그 출생정보"에 묶는다.
// 비밀 값이 아니다(같은 입력이면 같은 id). 화면과 서버가 같은 값을 만들어야 하므로 의존성 없는 순수 함수로 둔다.
// SQL spend_coins 의 허용 형식: ^(basic|love|deep|compat|taekil):[0-9a-f]{14}$

type Birth = {
  calendar?: unknown;
  leap?: unknown;
  date?: unknown;
  time?: unknown;
  gender?: unknown;
};
export type UnlockProduct = "basic" | "love" | "compat";

const norm = (b: Birth): string | null => {
  if (typeof b !== "object" || b === null) return null;
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return null;
  const time = typeof b.time === "string" ? b.time : "";
  return [
    b.calendar === "lunar" ? "L" : "S",
    b.leap === true ? "1" : "0",
    b.date,
    time,
    b.gender === "m" ? "m" : "f",
  ].join("|");
};

/** cyrb53 두 번(서로 다른 시드) → 14자리 16진수(56비트). 이름은 포함하지 않는다. */
function hash14(str: string): string {
  const one = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return [h1 >>> 0, h2 >>> 0];
  };
  const [a, b] = one(0);
  const [c] = one(7);
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return (hex(a!) + hex(b!) + hex(c!)).slice(0, 14);
}

/** 상품·출생정보로 열람 id 를 만든다. 입력이 올바르지 않으면 null (궁합은 상대 정보가 필요). */
export function unlockId(product: UnlockProduct, me: unknown, partner?: unknown): string | null {
  const m = norm(me as Birth);
  if (!m) return null;
  if (product === "compat") {
    const p = norm(partner as Birth);
    return p ? `compat:${hash14(`${m}#${p}`)}` : null;
  }
  return `${product}:${hash14(m)}`;
}
