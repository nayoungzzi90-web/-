import { useEffect, useState } from 'react';
import { setConcern } from '../lib/mock/service';

const MAX = 300;
const IDEAS = ['이직을 해야 할지 고민이에요', '올해 연애운이 궁금해요', '돈이 잘 모이지 않아요', '사람 관계가 힘들어요'];
const cheer = (n: number) => (n === 0 ? '한 줄만 적어도 괜찮아요' : n < 30 ? '조금만 더 구체적으로 적어 볼까요?' : n < 120 ? '오, 이야기가 살아 있어요' : '충분해요! 그 마음을 잘 담았어요');

/** 해석 전에 고민을 적는 카드. 입력은 이 기기에 저장되고, 지금은 키워드로 고민 유형을 분류해 맞춤 풀이를 붙인다(AI가 읽지 않음). */
export function ConcernCard({ chartId, initial }: { chartId: string; initial?: string }) {
  const [text, setText] = useState(initial ?? '');
  useEffect(() => { setText(initial ?? ''); }, [chartId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (v: string) => { setText(v.slice(0, MAX)); setConcern(chartId, v); };
  return (
    <section className="card concern" aria-labelledby="concern-h">
      <h2 id="concern-h">요즘 어떤 점이 가장 궁금하세요? <small className="muted">(선택)</small></h2>
      <p className="muted small">구체적으로 적을수록 그 고민에 맞춰 풀어 드려요. 적은 내용은 이 기기에만 저장돼요. 지금은 키워드로 고민 유형을 나눠 맞춤 해설을 덧붙이는 샌드박스 단계예요.</p>
      <label htmlFor="concern-text" className="sr-only">고민 입력</label>
      <textarea id="concern-text" className="input" style={{ minHeight: 120, padding: 12 }} maxLength={MAX} value={text} placeholder="예: 요즘 이직할지 말지 고민이에요. 지금 회사는…" onChange={(e) => save(e.target.value)} />
      <div className="meter" aria-hidden><i style={{ width: `${(text.length / MAX) * 100}%` }} /></div>
      <div className="row between"><span className="small" style={{ color: 'var(--red)' }}>{cheer(text.length)}</span><span className="muted small">{text.length}/{MAX}</span></div>
      <div className="quick" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        {IDEAS.map((i) => <button key={i} type="button" className="chip" onClick={() => save(i)}>{i}</button>)}
      </div>
    </section>
  );
}
