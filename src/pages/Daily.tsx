import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, MockNotice } from '../components/Common';
import { buildDaily, DAILY_RULE_VERSION, DailyFortune } from '../lib/content/daily';
import { kstDate } from '../lib/kst';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { CHARACTERS } from '../lib/content/characters';
import { CharacterArt } from '../components/Character';
import { streak } from '../lib/metrics';

export default function Daily() {
  const { db, chart } = useSession();
  const date = kstDate();
  const key = chart ? `${chart.facts.chartId}|${date}|${DAILY_RULE_VERSION}` : '';
  const cached = key ? (db.daily[key] as DailyFortune | undefined) : undefined;

  useEffect(() => {
    if (!chart) return;
    mutate((d) => {
      if (!d.daily[key]) d.daily[key] = buildDaily(chart.facts, date); // 날짜·차트·버전 키로 캐시, 같은 날 재조회는 동일 결과
      if (!d.dailyDays.includes(date)) d.dailyDays = [...d.dailyDays, date].slice(-90);
      track(d, 'daily_view', { status: d.daily[key] ? 'cache' : 'new' });
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chart) {
    return (
      <div>
        <h1>오늘의 운세</h1>
        <ErrorState title="먼저 내 캐릭터를 만나 볼까요?" message="오늘의 운세는 내 사주를 기준으로 보여 드려요. 생년월일을 입력하면 바로 확인할 수 있어요." action={<Link className="btn" to="/birth">출생 정보 입력하기</Link>} />
      </div>
    );
  }
  const f = cached ?? buildDaily(chart.facts, date);
  const run = Math.max(1, streak(db.dailyDays, date));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.parse(date) - (6 - i) * 86400000).toISOString().slice(0, 10); return { d, on: db.dailyDays.includes(d) || (d === date) }; });
  const base = CHARACTERS[chart.facts.dayMaster];
  return (
    <div>
      <MockNotice>오늘의 운세는 규칙 기반 문구예요 (AI 호출 없음).</MockNotice>
      <p className="muted" style={{ marginBottom: 4 }}>{date.replace(/-/g, '.')} (한국 시간) · 오늘의 일진 {f.dayPillar}</p>
      <div className="row" style={{ flexWrap: 'nowrap' }}><CharacterArt base={base} size={72} className="mini-art" /><h1 style={{ margin: 0 }}>{f.oneLine}</h1></div>
      <section className="card stamp-card" aria-label="출석 도장">
        <div className="row between"><b>🔥 연속 {run}일째 만났어요</b><span className="muted small">내일도 운세가 새로 바뀌어요</span></div>
        <div className="stamps">{week.map((w) => <span key={w.d} className={`stamp${w.on ? ' on' : ''}`} title={w.d} aria-label={`${w.d} ${w.on ? '출석' : '결석'}`}>{w.on ? '印' : '·'}</span>)}</div>
        <p className="muted small" style={{ margin: 0 }}>{run >= 7 ? `${base.name}와 아주 친해졌어요! 일주일을 채웠어요 🎉` : run >= 3 ? `${base.name}가 "또 왔네?" 하며 반가워해요.` : `${base.name}가 내일도 기다릴게요!`} (도장은 보상 없이 재미로만 쌓여요)</p>
      </section>
      <section className="card"><h2>하루 흐름</h2><p>{f.flow}</p></section>
      <section className="card">
        <h2>참고 조언</h2>
        <ul className="list-plain">
          <li><b>💼 일</b> — {f.work}</li>
          <li><b>💰 돈</b> — {f.money}</li>
          <li><b>🤝 관계</b> — {f.relationAdvice}</li>
        </ul>
      </section>
      <section className="card" style={{ borderColor: 'var(--teal)' }}><h2>🌱 작은 행동 제안</h2><p style={{ marginBottom: 0 }}>{f.action}</p></section>
      {f.timeUnknownNote && <div className="notice" role="note">{f.timeUnknownNote}</div>}
      <p className="muted small">오늘의 일진이 내 일간({chart.facts.dayMaster})에게 어떤 관계({f.relation})인지를 기준으로 한 참고용 문구이며, 결과를 확정적인 예언으로 받아들이지 마세요. 같은 날 다시 열어도 같은 내용이 나와요.</p>
      <Link to="/chat" className="btn block go">🗨️ {base.name}와 오늘 이야기하기</Link>
      <Link to="/products/love" className="btn secondary block" style={{ marginTop: 8 }}>앞으로 5년 연애운이 궁금하다면</Link>
    </div>
  );
}
