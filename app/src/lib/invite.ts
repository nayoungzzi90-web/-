import type { Element } from "./saju";
import { ELEMENTS } from "./reading";
import type { Person } from "./compat";

// 초대 링크: 이름·일간·일지·오행 개수만 담는다. 생년월일·성별·시간은 담지 않는다.
export const INVITE_VERSION = 1;

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeInvite(p: Person): string {
  return b64(
    JSON.stringify([
      INVITE_VERSION,
      p.name,
      p.stem,
      p.branch,
      ELEMENTS.map((e) => p.counts[e]),
    ]),
  );
}

// 알 수 없는 입력은 모두 거부한다(링크는 누구나 만들 수 있다).
export function decodeInvite(code: string): Person | null {
  if (
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > 200 ||
    !/^[A-Za-z0-9_-]+$/.test(code)
  )
    return null;
  try {
    const v: unknown = JSON.parse(unb64(code));
    if (!Array.isArray(v) || v.length !== 5 || v[0] !== INVITE_VERSION)
      return null;
    const [, name, stem, branch, counts] = v as [
      number,
      unknown,
      unknown,
      unknown,
      unknown,
    ];
    if (typeof name !== "string" || name.trim().length < 1 || name.length > 10)
      return null;
    if (!Number.isInteger(stem) || (stem as number) < 0 || (stem as number) > 9)
      return null;
    if (
      !Number.isInteger(branch) ||
      (branch as number) < 0 ||
      (branch as number) > 11
    )
      return null;
    if (!Array.isArray(counts) || counts.length !== 5) return null;
    if (
      !counts.every(
        (n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 8,
      )
    )
      return null;
    const sum = (counts as number[]).reduce((a, b) => a + b, 0);
    if (sum !== 6 && sum !== 8) return null;
    const rec = {} as Record<Element, number>;
    ELEMENTS.forEach((e, i) => (rec[e] = (counts as number[])[i]!));
    return {
      name: name.trim(),
      stem: stem as number,
      branch: branch as number,
      counts: rec,
    };
  } catch {
    return null;
  }
}
