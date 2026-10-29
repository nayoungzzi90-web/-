// 약관·환불정책·개인정보처리방침 표시 규칙.
// 안전장치: 이 문서들은 아직 법무 검토 전 "초안"이다. 운영(PROD) 빌드에서는 **승인 전에 본문이 번들에 들어가지도, 화면에 나오지도 않는다.**
//  - 개발 모드에서만 초안을 불러와 보여 준다(초안 배너 표시).
//  - 운영에서 보이려면 ① 빌드 환경변수 VITE_LEGAL_APPROVED=true(소유자 승인) 이고 ② 본문에 {{ }} 빈칸이 남아 있지 않아야 한다.
export type LegalKey = "terms" | "refund" | "privacy";

/** 결제 전 동의 기록에 남는 버전. 문서를 바꿀 때마다 올린다(승인 후에는 "draft-" 접두사를 뗀다). */
export const LEGAL_VERSION = "draft-2026-10-29";

export const LEGAL_TITLES: Record<LegalKey, string> = {
  terms: "이용약관",
  refund: "엽전 결제·환불 정책",
  privacy: "개인정보처리방침",
};

export const hasPlaceholders = (raw: string) => /\{\{[^}]*\}\}/.test(raw);

/** 게시용이 아닌 내부 메모 구간(제목에 "내부 메모" 포함)부터 끝까지 잘라낸다 */
export function stripInternalNotes(raw: string): string {
  const m = /^#{2,3} .*내부 메모.*$/m.exec(raw);
  return m ? raw.slice(0, m.index).trimEnd() : raw;
}

export type LegalDoc = { status: "draft" | "approved"; text: string };

export function decideLegal(
  raw: string,
  ctx: { prod: boolean; approved: boolean },
): LegalDoc | null {
  const text = stripInternalNotes(raw);
  if (!ctx.prod) return { status: "draft", text };
  if (ctx.approved && !hasPlaceholders(text)) return { status: "approved", text };
  return null;
}

const LOADERS: Record<LegalKey, () => Promise<string>> = {
  terms: async () => (await import("../../docs/legal-drafts/TERMS_DRAFT.md?raw")).default,
  refund: async () => (await import("../../docs/legal-drafts/REFUND_POLICY_DRAFT.md?raw")).default,
  privacy: async () =>
    (await import("../../docs/legal-drafts/PRIVACY_POLICY_DRAFT.md?raw")).default,
};

/**
 * 문서를 불러온다. 아래 조건은 빌드 시점에 값으로 치환되는 식(import.meta.env.DEV / VITE_LEGAL_APPROVED)만 쓰므로,
 * 운영 빌드에서 승인 변수가 'true' 가 아니면 이 분기와 LOADERS 전체가 빌드에서 제거되어 초안 본문이 번들에 들어가지 않는다
 * (빌드 결과를 직접 검사하는 시험이 있다: src/test/legal.test.tsx).
 */
export async function loadLegal(key: LegalKey): Promise<LegalDoc | null> {
  if (import.meta.env.DEV || import.meta.env.VITE_LEGAL_APPROVED === "true") {
    return decideLegal(await LOADERS[key](), {
      prod: import.meta.env.PROD,
      approved: import.meta.env.VITE_LEGAL_APPROVED === "true",
    });
  }
  return null;
}
