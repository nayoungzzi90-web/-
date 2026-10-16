import { Link } from 'react-router-dom';
import { ConcernCard } from '../components/ConcernCard';
import { PurchasePanel } from '../components/PurchasePanel';
import { MockNotice } from '../components/Common';
import { CATALOG, ProductId } from '../lib/catalog';
import { kstParts } from '../lib/kst';
import { useSession } from '../lib/mock/hooks';
import { entitlementFor } from '../lib/mock/service';
import { useEffect } from 'react';
import { mutate, track } from '../lib/mock/db';

const WHAT: Record<string, string> = {
  basic: '원국과 십성, 오행 분포를 바탕으로 성격·재능·직업·재물·관계 경향을 쉬운 말로 풀어 드려요.',
  love_deep: '연애 기질과 반복되는 관계 패턴, 그리고 생성한 해를 포함한 5개 연도의 세운 흐름까지 살펴봐요.',
};

export default function Product({ productId }: { productId: 'basic' | 'love_deep' }) {
  const p = CATALOG[productId];
  const { db, user, chart } = useSession();
  useEffect(() => { mutate((d) => track(d, 'product_view', { product_id: productId })); }, [productId]);
  const ent = user && chart ? entitlementFor(db, user.id, productId, chart.id) : undefined;
  const y = kstParts().year;
  return (
    <div>
      <MockNotice>리포트 본문은 템플릿 기반 샘플이에요. 정식 AI 리포트는 모델·원가·품질 검증 후 판매돼요.</MockNotice>
      <h1>{p.name}</h1>
      <p>{p.tagline}</p>
      <p className="muted">{WHAT[productId]}</p>
      {productId === 'love_deep' && (
        <div className="notice info">구매 시점 기준으로 <b>{y}~{y + 4}년</b> 5개 연도를 분석해요. 이후 새해가 되어도 구매한 리포트의 범위는 바뀌지 않아요.</div>
      )}
      <section className="card">
        <h2>목차 미리보기</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>{p.toc.map((t) => <li key={t}>{t}</li>)}</ol>
        {p.length && <p className="muted small" style={{ marginTop: 10 }}>목표 분량 약 {p.length[0].toLocaleString()}~{p.length[1].toLocaleString()}자 · 각 문단마다 ‘해석 근거 보기’ 제공</p>}
      </section>
      {chart ? (
        <>
          <p className="muted">분석 대상: <b>{chart.input.alias || '내 사주'}</b> ({chart.facts.pillars.day} 일주{chart.facts.pillars.hour ? '' : ' · 시간 미상'})</p>
          {!ent?.reportId && <ConcernCard chartId={chart.id} initial={chart.concern} />}
          <PurchasePanel productId={productId as ProductId} getSubjectId={() => chart.id} existingReportId={ent?.reportId} nextPath={p.path} />
        </>
      ) : (
        <div className="card center"><p>먼저 무료로 내 캐릭터를 만나 볼까요?</p><Link className="btn" to="/birth">출생 정보 입력하기</Link></div>
      )}
      <p className="muted small">생성이 끝난 리포트는 저장되어 다시 열어도 같은 내용이에요. 결과는 참고용이며 확정적인 예언이 아니에요.</p>
    </div>
  );
}

export function ComingSoon({ productId }: { productId: 'date_selection' | 'saju_deep' }) {
  const p = CATALOG[productId];
  return (
    <div>
      <h1>{p.name}</h1>
      <div className="card center">
        <span className="badge soon">준비 중</span>
        <p style={{ marginTop: 12 }}>{p.tagline}</p>
        <p className="muted">아직 판매하지 않는 상품이에요. 출시되면 안내해 드릴게요.</p>
        <Link className="btn secondary" to="/">홈으로</Link>
      </div>
    </div>
  );
}
