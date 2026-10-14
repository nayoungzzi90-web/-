import { Link, useParams } from 'react-router-dom';

export function Admin() {
  return (
    <div>
      <h1>관리자</h1>
      <div className="card center">
        <span className="badge fail">접근 차단</span>
        <p style={{ marginTop: 12 }}>관리자 화면은 서버에서 관리자 권한과 MFA 가 확인된 계정에게만 열려요. 이 샌드박스 앱에는 관리자 로그인이 없어요.</p>
        <p className="muted small">브라우저의 `isAdmin` 같은 값으로는 권한을 인정하지 않아요. 구현 시 Supabase Edge Function 에서 서버 검증 + <code>admin_audit_logs</code> 기록이 필요해요.</p>
        <Link className="btn secondary" to="/">홈으로</Link>
      </div>
    </div>
  );
}

const LEGAL: Record<string, { title: string; body: string }> = {
  terms: { title: '이용약관', body: '이용약관은 최종 법률 검토를 마친 뒤 이곳에 게시돼요. 현재는 개발용 자리표시자이며 법적 효력이 있는 문서가 아니에요.' },
  privacy: { title: '개인정보처리방침', body: '수집 항목·이용 목적·보유 기간(궁합 결과 30일 등)·위탁/해외 이전·삭제 요청 절차는 법률 검토 후 확정돼요. 현재는 자리표시자이며 승인된 문서가 아니에요.' },
  refund: { title: '환불 안내', body: '디지털 콘텐츠 청약철회와 환불 기준은 전자상거래 관련 법령 검토 후 확정돼요. 결제 후 생성 실패 시 재시도 → 복구 → 환불 요청 순서로 안내하며, 환불 완료는 실제 처리 후에만 표시해요.' },
};
export function Legal() {
  const { kind = 'terms' } = useParams();
  const d = LEGAL[kind] ?? LEGAL.terms;
  return (
    <div>
      <h1>{d.title}</h1>
      <div className="notice">법률 검토 대기 · 승인되지 않은 자리표시자 문서예요.</div>
      <div className="card"><p>{d.body}</p></div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="card center"><h1>페이지를 찾을 수 없어요</h1><Link className="btn" to="/">홈으로</Link></div>
  );
}
