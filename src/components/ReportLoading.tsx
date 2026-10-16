import { useEffect, useState } from 'react';
import { ArtSvg } from './art';

const MSGS = ['오늘 들어올 귀인이 몇 명인지 세는 중…', '오행 친구들이 네 사주를 둘러보는 중…', '고민에 맞는 이야기를 고르는 중…', '해설을 예쁘게 다듬는 중…'];

/** 생성 대기 화면: 시도 횟수와 경과 시간으로 진행률·예상 시간을 보여 준다. (샌드박스는 몇 초면 끝나요) */
export function ReportLoading({ attempts, max }: { attempts: number; max: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  const pct = Math.min(95, Math.round(((Math.max(attempts, 1) - 1) / max) * 60 + Math.min(sec, 20) * 1.75));
  const remain = Math.max(2, 12 - sec);
  return (
    <div className="card center loading-card" role="status" aria-live="polite">
      <div className="bob"><ArtSvg stem="戊" size={96} label="호동이" /></div>
      <h2 style={{ marginTop: 8 }}>{MSGS[Math.floor(sec / 2) % MSGS.length]}</h2>
      <div className="meter big" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <p><b>{pct}%</b> · 예상 남은 시간 약 {remain}초</p>
      <p className="muted small">화면을 나가도 계속 진행돼요. 끝나면 ‘MY’에서 다시 볼 수 있어요. (시도 {Math.max(attempts, 1)}/{max})</p>
      <div className="notice info" style={{ textAlign: 'left' }}>1분이 지나도 안 끝나면 먼저 새로고침을 해 주세요. 결제는 다시 하지 않아도 돼요.</div>
    </div>
  );
}
