import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CharacterCard, ShareCard, saveSvgAsPng, useSvgRef } from '../components/Character';
import { ErrorState, ProductCard } from '../components/Common';
import { CATALOG } from '../lib/catalog';
import { CHARACTERS } from '../lib/content/characters';
import { Branch, Element, ELEMENT_KO, STEM_KO, BRANCH_KO, STEMS, BRANCHES, Stem } from '../lib/saju/types';
import { BRANCH_ELEMENT, STEM_ELEMENT, branchGod, tenGod } from '../lib/saju/rules';
import { useSession } from '../lib/mock/hooks';
import { mutate, track } from '../lib/mock/db';

const EL_COLOR: Record<Element, string> = { wood: '#2F7068', fire: '#B83A26', earth: '#E4A04A', metal: '#B9B6AE', water: '#203E73' };
const ELEMENT_CLASS: Record<Element, string> = { wood: 'wood', fire: 'fire', earth: 'earth', metal: 'metal', water: 'water' };
const WARN_TEXT: Record<string, string> = {
  engine_unverified: '샘플 계산기로 계산한 결과예요. 검증된 만세력 라이브러리 연동 전이라 실제 사주와 다를 수 있어요.',
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
  useEffect(() => { if (chart) mutate((d) => { d.activeChartId = chart.id; track(d, 'character_view'); }); }, [chart?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 본인 게스트 세션/계정의 결과만 열람 (URL 의 ID 만으로 타인 결과를 볼 수 없음)
  const allowed = chart && (chart.guestId === db.guestId || (user && chart.ownerUserId === user.id));
  if (!chart || !allowed) {
    return <ErrorState title="결과를 찾을 수 없어요" message="만료되었거나 다른 기기에서 만든 결과예요. 새로 만들어 볼까요?" action={<Link className="btn" to="/birth">다시 입력하기</Link>} />;
  }
  const base = CHARACTERS[chart.facts.dayMaster];
  const { facts, character } = chart;
  const total = Object.values(facts.fiveElements).reduce((a, b) => a + b, 0) || 1;
  const code = user?.referralCode;
  const inviteUrl = `${location.origin}/share/${base.id}${code ? `?ref=${code}` : ''}`;
  const cols = [facts.pillars.hour, facts.pillars.day, facts.pillars.month, facts.pillars.year];
  const pk = (p: string | null) => (p ? STEM_KO[STEMS.indexOf(p[0] as never)] + BRANCH_KO[BRANCHES.indexOf(p[1] as never)] : '');

  async function copy() {
    mutate((d) => track(d, 'share_intent'));
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
    else copy();
  }

  return (
    <div>
      <CharacterCard base={base} result={character} alias={chart.input.alias} />
      {facts.warnings.filter((w) => WARN_TEXT[w] && w !== 'luck_cycles_unavailable').map((w) => <div key={w} className="notice" role="note">{WARN_TEXT[w]}</div>)}

      <section className="card">
        <h2>내 기질</h2>
        <p>{base.temperament}</p>
        <div className="grid2">
          <div><h3>강점</h3><ul className="list-plain">{base.strengths.map((s) => <li key={s}>✔ {s}</li>)}</ul></div>
          <div><h3>약점</h3><ul className="list-plain">{base.weaknesses.map((s) => <li key={s}>△ {s}</li>)}</ul></div>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>{character.basis.grounded} {character.basis.creative}</p>
      </section>

      <section className="card" aria-labelledby="pill-h">
        <div className="row between"><h2 id="pill-h" style={{ margin: 0 }}>내 사주 원국</h2><span className="badge mock">샘플 계산</span></div>
        <div className="chart-head" style={{ marginTop: 10 }}>{['시주', '일주', '월주', '연주'].map((l) => <span key={l}>{l}</span>)}</div>
        <div className="chart-grid" role="table" aria-label="사주 원국표">
          {cols.map((p, i) => (
            <div key={i} className="chart-god-wrap">
              <div className={`chart-god${i === 1 ? ' me' : ''}`}>{p ? (i === 1 ? '일간(나)' : tenGod(facts.dayMaster, p[0] as Stem)) : ''}</div>
              <div className={`tile-el ${p ? ELEMENT_CLASS[STEM_ELEMENT[p[0] as Stem]] : 'none'}${i === 1 ? ' me' : ''}`}>{p ? p[0] : '—'}</div>
              <div style={{ height: 8 }} />
              <div className={`tile-el ${p ? ELEMENT_CLASS[BRANCH_ELEMENT[p[1] as Branch]] : 'none'}`}>{p ? p[1] : '—'}</div>
              <div className="chart-god">{p ? branchGod(facts.dayMaster, p[1] as Branch) : '시간 미상'}</div>
              <div className="muted small">{p ? pk(p) : ''}</div>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ margin: '4px 0 12px' }}>지지의 십성은 본기(대표 천간) 기준의 단순 표시예요. 일간(나)은 붉은 테두리로 표시했어요.</p>
        <div>
          {(Object.keys(EL_COLOR) as Element[]).map((e) => (
            <div key={e} className="el-row"><span>{ELEMENT_KO[e]}</span>
              <div className="bar" aria-hidden><i style={{ width: `${(facts.fiveElements[e] / total) * 100}%`, background: EL_COLOR[e] }} /></div>
              <span>{facts.fiveElements[e]}</span></div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="share-h">
        <h2 id="share-h">친구에게 공유하기</h2>
        <p className="muted small">공유 카드에는 생년월일·시간·성별·사주 원국·이메일이 들어가지 않아요. 미리보기를 확인하고 공유하세요.</p>
        <div style={{ maxWidth: 300, margin: '0 auto 12px' }}><ShareCard base={base} result={character} alias={chart.input.alias} inviteUrl={inviteUrl.split('?')[0]} svgRef={svgRef} /></div>
        <div className="grid2">
          <button className="btn secondary" onClick={save}>이미지 저장</button>
          <button className="btn secondary" onClick={copy}>링크 복사</button>
        </div>
        <button className="btn block" style={{ marginTop: 10 }} onClick={share}>공유하기</button>
        <p role="status" className="muted small" style={{ marginTop: 8 }}>{msg}</p>
        {!user && <p className="muted small">로그인하면 내 초대 코드가 링크에 포함되고, 친구가 가입·체험을 마칠 때 엽전이 적립돼요. 링크 복사·공유 버튼만으로는 엽전이 지급되지 않아요.</p>}
      </section>

      {!user && (
        <div className="card flat center">
          <p>결과를 저장하고 싶다면?</p>
          <button className="btn teal" onClick={() => nav(`/login?next=${encodeURIComponent(`/character/result/${chart.id}`)}`)}>로그인하고 저장하기</button>
        </div>
      )}

      <h2>이어서 보기</h2>
      <Link className="card product" to="/daily"><div><h3>오늘의 운세 보러 가기</h3><p className="muted small" style={{ margin: 0 }}>무료 · 한국 날짜 기준</p></div><span className="price">→</span></Link>
      <ProductCard product={CATALOG.basic} />
      <ProductCard product={CATALOG.love_deep} />
      <ProductCard product={CATALOG.compatibility} />
    </div>
  );
}
