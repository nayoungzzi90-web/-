/** FNV-1a 32bit. 암호학적 용도가 아닌 결정론적 캐시 키/선택용. */
export function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
export const hex = (n: number) => n.toString(16).padStart(8, '0');
export const pick = <T,>(arr: readonly T[], seed: string): T => arr[fnv(seed) % arr.length];
export const uid = (prefix = '') =>
  prefix + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : hex(fnv(String(Math.random()) + Date.now())) + hex(fnv(String(Math.random()))));
