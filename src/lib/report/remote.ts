/**
 * 브라우저 → Edge Function 호출 클라이언트 (실서비스용). 비밀값은 없고 로그인 세션 토큰만 보낸다.
 * 샌드박스(Mock) 앱은 서버가 없어 이 경로를 쓰지 않는다: Supabase 연동 시 lib/mock/service.ts 의 runJob 대신 이 함수 + 상태 조회(polling)를 사용한다.
 */
export interface GenerateResponse { status: 'ready' | 'running'; report_id?: string; job_id?: string }
export class RemoteError extends Error { constructor(public code: string, message: string, public retryable: boolean) { super(message); } }

export async function invokeGenerateReport(opts: { baseUrl: string; accessToken: string; anonKey: string; entitlementId: string; fetchImpl?: typeof fetch }): Promise<GenerateResponse> {
  const res = await (opts.fetchImpl ?? fetch)(`${opts.baseUrl.replace(/\/$/, '')}/functions/v1/generate-report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.accessToken}`, apikey: opts.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entitlement_id: opts.entitlementId }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body as GenerateResponse; // 200 ready · 202 running
  throw new RemoteError(body.error_code ?? `HTTP_${res.status}`, body.message ?? '리포트 생성 요청에 실패했어요.', body.retryable ?? res.status >= 500);
}
