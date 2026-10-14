const on = (v: unknown) => String(v).toLowerCase() === 'true';

/** 모든 플래그 기본 OFF. 외부 검증(법률·PG·라이선스)이 끝나기 전 켜지 말 것. */
export const flags = {
  /** 제3자 출생정보 입력 적법성 검토 전에는 OFF (PRD AC-13) */
  compatEnabled: on(import.meta.env.VITE_FLAG_COMPAT_ENABLED),
  /** 실제 PG 결제. 관리자 승인 + PG 계약 검증 전 OFF */
  livePayment: on(import.meta.env.VITE_FLAG_LIVE_PAYMENT),
  /** 실제 LLM 호출. 서버 비밀값 구성 전 OFF */
  llmReports: on(import.meta.env.VITE_FLAG_LLM_REPORTS),
};
