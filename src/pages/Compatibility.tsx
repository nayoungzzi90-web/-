import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BirthForm } from '../components/BirthForm';
import { MockNotice } from '../components/Common';
import { PurchasePanel } from '../components/PurchasePanel';
import { COMPAT_RETENTION_DAYS, CATALOG } from '../lib/catalog';
import { flags } from '../lib/flags';
import { uid } from '../lib/hash';
import { mutate } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { BirthInput } from '../lib/saju/types';

export default function Compatibility() {
  const p = CATALOG.compatibility;
  const { chart, user } = useSession();
  const [other, setOther] = useState<BirthInput | null>(null);

  if (!flags.compatEnabled) {
    return (
      <div>
        <h1>{p.name}</h1>
        <div className="card center">
          <span className="badge soon">준비 중</span>
          <p style={{ marginTop: 12 }}>궁합은 상대방의 출생 정보를 함께 입력하는 서비스라, 개인정보 처리 근거에 대한 법률 검토가 끝난 뒤에 열려요.</p>
          <Link className="btn secondary" to="/">홈으로</Link>
        </div>
        <p className="muted small">운영 메모: 제3자 출생정보 입력 적법성 검토 완료 전 `VITE_FLAG_COMPAT_ENABLED`는 false 로 유지합니다 (PRD AC-13).</p>
      </div>
    );
  }
  const expiry = new Date(Date.now() + COMPAT_RETENTION_DAYS * 86400000);
  return (
    <div>
      <MockNotice>궁합 화면은 개발(샌드박스) 플래그로만 열려 있어요. 제3자 정보 처리 적법성 검토 전에는 실제 서비스에 공개하지 않습니다.</MockNotice>
      <h1>{p.name}</h1>
      <p>{p.tagline}</p>
      <div className="notice info">
        <b>보관 안내</b> · 두 사람의 입력 정보와 궁합 결과는 <b>결과 생성 후 {COMPAT_RETENTION_DAYS}일</b>(오늘 생성 시 {expiry.getFullYear()}.{expiry.getMonth() + 1}.{expiry.getDate()}까지) 재열람할 수 있고, 이후 자동 삭제돼요. 상대방의 실명은 받지 않아요.
      </div>
      {!user ? (
        <div className="card center">
          <h2>로그인하고 시작해요</h2>
          <p className="muted">궁합은 결과를 {COMPAT_RETENTION_DAYS}일 동안 안전하게 보관해야 해서 로그인이 필요해요. 상대방 정보는 로그인한 뒤에 입력하게 돼요.</p>
          <Link className="btn go" to="/login?next=/products/compatibility">로그인하고 이어서 하기</Link>
        </div>
      ) : !chart ? (
        <div className="card center"><p>먼저 내 출생 정보가 필요해요.</p><Link className="btn" to="/birth">내 정보 입력하기</Link></div>
      ) : (
        <>
          <section className="card">
            <h2>1. 나</h2>
            <p className="muted">{chart.input.alias || '나'} · {chart.facts.pillars.day} 일주{chart.facts.pillars.hour ? '' : ' (시간 미상)'}</p>
          </section>
          <section className="card">
            <h2>2. 상대</h2>
            {other ? (
              <>
                <p>상대 정보를 입력했어요. 구매 전까지는 이 화면에만 있고 저장되지 않아요.</p>
                <button className="btn ghost sm" onClick={() => setOther(null)}>다시 입력하기</button>
              </>
            ) : (
              <BirthForm idPrefix="other" submitLabel="상대 정보 입력 완료" aliasDefault="상대" aliasLabel="상대 별칭 (실명 말고 별칭)" showGender={false}
                requireConsent="상대방의 출생 정보를 입력하는 것과 위 보관 안내를 확인했어요. (법적 처리 근거 검토는 별도로 진행 중이에요)" onSubmit={setOther} />
            )}
          </section>
          {other && (
            <PurchasePanel
              productId="compatibility"
              nextPath="/products/compatibility"
              resumable={false}
              getSubjectId={() => {
                const sid = uid('cmp_');
                mutate((db) => { db.compat[sid] = { id: sid, buyerUserId: db.sessionUserId!, inputA: chart.input, inputB: other }; });
                return sid;
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
