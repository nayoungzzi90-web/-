import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChartTable } from '../components/ChartTable';
import { CharacterCard, ShareCard, saveSvgAsPng, useSvgRef } from '../components/Character';
import { ErrorState, ProductCard } from '../components/Common';
import { classifyConcern } from '../lib/content/concern';
import { recommendNext } from '../lib/content/upsell';
import { entitlementFor } from '../lib/mock/service';
import { CATALOG, won } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { Element, ELEMENT_KO } from '../lib/saju/types';
import { useSession } from '../lib/mock/hooks';
import { mutate, track } from '../lib/mock/db';

const EL_COLOR: Record<Element, string> = { wood: '#2F7068', fire: '#B83A26', earth: '#E4A04A', metal: '#B9B6AE', water: '#203E73' };
const WARN_TEXT: Record<string, string> = {
  engine_unverified: '자체 만세력 엔진으로 계산했어요. 독립 계산과는 여러 번 대조했지만 한국천문연구원 공식 절입 시각과의 확인은 아직 끝나지 않았어요.',
  pillar_policy_dependent: '시간 보정(진태양시)·자시 기준을 어떻게 잡느냐에 따라 일주나 시주가 달라질 수 있어요. 아래 안내를 확인해 주세요.',
  needs_review: '절입 시각 바로 앞뒤 등 확정할 수 없는 부분이 있어요. 아래 안내를 확인해 주세요.',
  hour_pillar_unavailable: '출생 시간을 몰라 시주는 계산하지 않았어요. 시간이 필요한 해석은 생략돼요.',
  term_boundary_unverified: '절기(입춘 등) 경계일 근처라 연주·월주가 다를 수 있어요. 정식 만세력 검증 후 확정돼요.',
  zi_hour_boundary_rule_applied: '자시(23시~1시)에는 채택한 날짜 경계 규칙이 적용됐어요.',
  luck_cycles_unavailable: '대운 계산은 아직 제공되지 않아요.',
};

export default function CharacterResult() {
  const { id = '' } = useParams();
  const { db, user } = useSession();
  const nav = useNavigate();
  const chart = db.charts[id];
  const svgRef = useSvgRef();
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'me' | 'chart' | 'share'>('me');
  useEffect(() => { if (chart) mutate((d) => { d.activeChartId = chart.id; track(d, 'character_view'); }); }, [chart?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 본인 게스트 세션/계정의 결과만 열람 (URL 의 ID 만으로 타인 결과를 볼 수 없음)
  const allowed = chart && (chart.guestId === db.guestId || (user && chart.ownerUserId === user.id));
  if (!chart || !allowed) {
    return <ErrorState title="결과를 찾을 수 없어요" message="만료되었거나 다른 기기에서 만든 결과예요. 새로 만들어 볼까요?" action={<Link className="btn" to="/birth">다시 입력하기</Link>} />;
  }
  const base = CHARACTERS[chart.facts.dayMaster];
  const { facts, character } = chart;
  const owned = (['basic', 'love_deep', 'compatibility'] as const).filter((p) => user && entitlementFor(db, user.id, p, chart.id));
  const next = recommendNext(chart.concern ? classifyConcern(chart.concern) : null, [...owned]);
  const total = Object.values(facts.fiveElements).reduce((a, b) => a + b, 0) || 1;
  const code = user?.referralCode;
  const inviteUrl = `${location.origin}/share/${base.id}${code ? `?ref=${code}` : ''}`;

  async function copy(counted = false) {
    if (!counted) mutate((d) => track(d, 'share_intent'));
    try { await navigator.clipboard.writeText(inviteUrl); setMsg('링크를 복사했어요. 친구가 가입하고 체험을 마치면 엽전이 적립돼요.'); mutate((d) => track(d, 'share_copy')); }
    catch { setMsg(`복사에 실패했어요. 직접 복사해 주세요: ${inviteUrl}`); }
  }
  async function save() {
    mutate((d) => track(d, 'share_intent'));
    try { await saveSvgAsPng(svgRef.current!, `ohaeng-${base.id}.png`); setMsg('이미지를 저장했어요.'); } catch { setMsg('이미지 저장에 실패했어요. 화면을 캡처해 주세요.'); }
  }
  async function share() {
    mutate((d) => track(d, 'share_intent'));
    if (navigator.share) { try { await navigator.share({ title: '오행 친구들', text: base.shareLine, url: inviteUrl }); } catch { /* 사용자가 취소 */ } }
    else copy(true);
  }

  const tabs = [['me', '내 친구'], ['chart', '사주 원국'], ['share', '공유하기']] as const;
  return (
    <div>
      <CharacterCard base={base} result={character} alias={chart.input.alias} />
      {facts.warnings.filter((w) => WARN_TEXT[w] && w !== 'luck_cycles_unavailable').map((w) => <div key={w} className="notice" role="note">{WARN_TEXT[w]}</div>)}

      {facts.review?.uncertainties.filter((u) => u.severity === 'REVIEW' || u.code === 'PILLAR_POLICY_DEPENDENT').map((u, i) => <div key={i} className="notice" role="note">{u.message}</div>)}

      <div className="share-row" role="group" aria-label="공유하기">
        <button className="btn block go" onClick={share}>친구에게 내 캐릭터 자랑하기</button>
        <button className="btn secondary" onClick={() => { setTab('share'); void save(); }}>이미지 저장</button>
      </div>
      {msg && tab !== 'share' && <p role="status" className="muted small center">{msg}</p>}

      <div className="tabs" role="tablist" aria-label="결과 보기">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'me' && (
        <section className="card" id="panel-me" role="tabpanel" aria-labelledby="tab-me">
          <h2>내 기질</h2>
          <p>{base.temperament}</p>
          <div className="grid2">
            <div><h3>강점</h3><ul className="list-plain">{base.strengths.map((s) => <li key={s}>✔ {s}</li>)}</ul></div>
            <div><h3>약점</h3><ul className="list-plain">{base.weaknesses.map((s) => <li key={s}>△ {s}</li>)}</ul></div>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>{character.basis.grounded} {character.basis.creative}</p>
        </section>
      )}

      {tab === 'chart' && (
        <section className="card" id="panel-chart" role="tabpanel" aria-labelledby="tab-chart">
          <div className="row between"><h2 style={{ margin: 0 }}>내 사주 원국</h2><span className="badge mock">공식 확인 전</span></div>
          <div style={{ marginTop: 10 }}><ChartTable facts={facts} /></div>
          <p className="muted small" style={{ margin: '4px 0 12px' }}>지지의 십성은 본기(대표 천간) 기준의 단순 표시예요. 일간(나)은 붉은 테두리로 표시했어요.</p>
          {(Object.keys(EL_COLOR) as Element[]).map((e) => (
            <div key={e} className="el-row"><span>{ELEMENT_KO[e]}</span>
              <div className="bar" aria-hidden><i style={{ width: `${(facts.fiveElements[e] / total) * 100}%`, background: EL_COLOR[e] }} /></div>
              <span>{facts.fiveElements[e]}</span></div>
          ))}
        </section>
      )}

      {tab === 'share' && (
        <section className="card" id="panel-share" role="tabpanel" aria-labelledby="tab-share">
          <h2>친구에게 공유하기</h2>
          <p className="muted small">공유 카드에는 생년월일·시간·성별·사주 원국·이메일이 들어가지 않아요. 미리보기를 확인하고 공유하세요.</p>
          <div style={{ maxWidth: 300, margin: '0 auto 12px' }}><ShareCard base={base} result={character} alias={chart.input.alias} inviteUrl={inviteUrl.split('?')[0]} svgRef={svgRef} /></div>
          <div className="grid2">
            <button className="btn secondary" onClick={save}>이미지 저장</button>
            <button className="btn secondary" onClick={() => copy()}>링크 복사</button>
          </div>
          <button className="btn block" style={{ marginTop: 10 }} onClick={share}>공유하기</button>
          <p role="status" className="muted small" style={{ marginTop: 8 }}>{msg}</p>
          {!user && <p className="muted small">로그인하면 내 초대 코드가 링크에 포함되고, 친구가 가입·체험을 마칠 때 엽전이 적립돼요. 링크 복사·공유 버튼만으로는 엽전이 지급되지 않아요.</p>}
        </section>
      )}

      {/* 다음 행동: 무료 운세 → 추천 상품 → 저장 */}
      <section className="card next-step" aria-labelledby="next-h">
        <h2 id="next-h">다음으로 이렇게 해 보세요</h2>
        <div className="stack">
          <Link className="btn block go" to="/chat">🗨️ {base.name}와 대화하며 더 알아보기</Link>
          <Link className="btn secondary block" to="/daily">오늘의 운세 보기 · 무료</Link>
          <Link className="btn secondary block" to={next.to}>{next.productId ? `${CATALOG[next.productId].name} · ${won(CATALOG[next.productId].priceKrw)} 또는 엽전 ${CATALOG[next.productId].coinCost}닢` : next.cta}</Link>
          <p className="muted small" style={{ margin: 0 }}>{next.title} — {next.reason}</p>
        </div>
        {!user && (
          <p className="muted small" style={{ margin: '12px 0 0' }}>
            결과를 저장하려면 <button className="linklike" onClick={() => nav(`/login?next=${encodeURIComponent(`/character/result/${chart.id}`)}`)}>로그인</button>하세요. 무료 체험 결과는 그대로 이어져요.
          </p>
        )}
      </section>

      <h2>더 알아보기</h2>
      <ProductCard product={CATALOG.love_deep} />
      <ProductCard product={CATALOG.compatibility} />
      <p className="center"><Link to="/birth">다른 생년월일로 다시 보기</Link></p>
    </div>
  );
}
