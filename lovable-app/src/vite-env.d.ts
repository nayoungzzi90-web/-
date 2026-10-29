/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' 일 때만(소유자의 법무 검토 승인 후) 운영 빌드에 약관·정책 본문을 넣는다. 기본은 비어 있음. */
  readonly VITE_LEGAL_APPROVED?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
