import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../components/BirthForm';
import { CharacterArt } from '../components/Character';
import { buildDaily } from '../lib/content/daily';
import { CHARACTERS } from '../lib/content/characters';
import { AFFINITY_MAX, FRIEND, HOST, MOODS, Mood, elementReactions, friendBase, hasPolicyNote, moodReply, secretStory } from '../lib/content/chat';
import { fnv } from '../lib/hash';
import { mutate, track } from '../lib/mock/db';
import { useSession } from '../lib/mock/hooks';
import { createChart } from '../lib/mock/service';
import { calculator } from '../lib/saju/calculator';
import { BirthInput, CalcError, Element, SajuFacts } from '../lib/saju/types';
import { CATALOG, won } from '../lib/catalog';

type Who = 'me' | Element | 'mine';
interface Msg { id: number; who: Who; text: string; stem?: string }
type Ask =
  | { type: 'choices'; options: { value: string; label: string }[] }
  | { type: 'text'; kind: 'date' | 'time'; placeholder: string }
  | null;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 오행 친구들과 채팅하며 사주를 알아가는 대화형 화면. 모든 대사는 규칙 기반(AI 생성 아님)이다. */
export default function Chat() {
  const { chart } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ask, setAsk] = useState<Ask>(null);
  const [typing, setTyping] = useState<Who | null>(null);
  const [affinity, setAffinity] = useState(0);
  const affRef = useRef(0);
  const [mineStem, setMineStem] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [chartId, setChartId] = useState<string | null>(null);
  const resolver = useRef<((v: string) => void) | null>(null);
  const alive = useRef(true);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fast = useRef(typeof window !== 'undefined' && (new URLSearchParams(location.search).has('fast') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const mineRef = useRef<SajuFacts | null>(null);

  const push = useCallback((who: Who, text: string, stem?: string) => setMsgs((m) => [...m, { id: ++idRef.current, who, text, stem }]), []);
  const say = useCallback(async (who: Who, text: string) => {
    if (!alive.current) return;
    if (!fast.current) { setTyping(who); await wait(Math.min(1500, 350 + text.length * 14)); }
    if (!alive.current) return;
    setTyping(null); push(who, text);
  }, [push]);
  const choose = useCallback((options: { value: string; label: string }[]) => new Promise<string>((resolve) => {
    setAsk({ type: 'choices', options });
    resolver.current = (v) => { const o = options.find((x) => x.value === v); setAsk(null); push('me', o?.label ?? v); resolve(v); };
  }), [push]);
  const text = useCallback((kind: 'date' | 'time', placeholder: string) => new Promise<string>((resolve) => {
    setInput(''); setError(''); setAsk({ type: 'text', kind, placeholder });
    resolver.current = (v) => { setAsk(null); push('me', v); resolve(v); };
  }), [push]);
  const bump = useCallback(() => { affRef.current = Math.min(AFFINITY_MAX, affRef.current + 1); setAffinity(affRef.current); }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: fast.current ? 'auto' : 'smooth' }); }, [msgs, typing, ask]);

  useEffect(() => {
    alive.current = true;
    mutate((db) => track(db, 'birth_start', { step: 'chat' }));
    void run();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function collectBirth(): Promise<BirthInput | null> {
    for (;;) {
      const cal = await choose([{ value: 'solar', label: '양력이야' }, { value: 'lunar', label: '음력이야' }]) as 'solar' | 'lunar';
      let leap = false;
      if (cal === 'lunar') leap = (await (async () => { await say(HOST, '혹시 윤달이었어? 몰라도 괜찮아, 아니라고 해도 돼!'); return choose([{ value: 'no', label: '윤달 아니야' }, { value: 'yes', label: '윤달이야' }]); })()) === 'yes';
      await say(HOST, '생년월일을 숫자로 알려줘! 예를 들면 19900419 처럼~');
      const d = (await text('date', '예: 19900419')).replace(/\D/g, '');
      await say(HOST, '태어난 시간도 알아? 시간까지 알면 더 자세히 볼 수 있어.');
      const known = (await choose([{ value: 'yes', label: '알아!' }, { value: 'no', label: '잘 몰라' }])) === 'yes';
      let hour: number | undefined, minute: number | undefined;
      if (known) {
        await say(HOST, '몇 시 몇 분? 24시간으로 적어줘! 예: 0110 (새벽 1시 10분)');
        const t = (await text('time', '예: 0110')).replace(/\D/g, '').padStart(4, '0');
        hour = Number(t.slice(0, 2)); minute = Number(t.slice(2, 4));
      }
      await say(HOST, '마지막! 성별도 알려줄래? 대운 흐름을 볼 때만 써. 말하기 싫으면 비밀로 해도 돼.');
      const g = await choose([{ value: 'F', label: '여자' }, { value: 'M', label: '남자' }, { value: 'X', label: '비밀' }]);
      const input: BirthInput = {
        calendar: cal, leapMonth: leap, year: Number(d.slice(0, 4)), month: Number(d.slice(4, 6)), day: Number(d.slice(6, 8)),
        timeUnknown: !known, hour, minute, gender: g as 'F' | 'M' | 'X', country: 'KR',
      };
      try {
        if (d.length !== 8) throw new CalcError('INVALID_DATE', '생년월일은 숫자 8자리가 필요해요. 예: 19900419');
        calculator.calculate(input);
        return input;
      } catch (e) {
        await say(HOST, `어라, 이 정보로는 계산이 안 돼… ${e instanceof CalcError ? e.message : '입력을 다시 확인해 줘.'} 처음부터 다시 해 볼까?`);
        await say(HOST, '먼저 양력인지 음력인지부터!');
      }
    }
  }

  async function run() {
    await say(HOST, '어서 와! 나는 호동이야. 오행 친구들의 길잡이 맡고 있어 🐯');
    await say(HOST, '지금부터 너의 사주 속 친구들을 불러올 거야. 몇 가지만 물어볼게!');
    await say(HOST, '아, 그리고 내 이야기는 재미와 참고용이야. 중요한 결정은 언제나 네 판단이 먼저!');
    let facts: SajuFacts; let id: string;
    if (chart) {
      await say(HOST, `어, 저번에 만난 ${CHARACTERS[chart.facts.dayMaster].name} 친구가 기다리고 있었어!`);
      const again = await choose([{ value: 'same', label: '저번 그대로 만나자' }, { value: 'new', label: '다른 생일로 해볼래' }]);
      if (again === 'same') { facts = chart.facts; id = chart.id; }
      else { const input = await collectBirth(); if (!input || !alive.current) return; const c = createChart(input); facts = c.facts; id = c.id; }
    } else {
      await say(HOST, '먼저 생일이 양력이야, 음력이야?');
      const input = await collectBirth(); if (!input || !alive.current) return;
      const c = createChart(input); facts = c.facts; id = c.id;
    }
    if (!alive.current) return;
    mineRef.current = facts; setChartId(id);
    const base = CHARACTERS[facts.dayMaster];
    await say(HOST, '좋아, 다 모였어! 사주 속에서 친구를 찾는 중… 🔮');
    await say(HOST, '…찾았다! 이 친구야!');
    setMineStem(facts.dayMaster);
    await say('mine', `안녕! 나는 ${base.name}이야. ${base.summary}!`);
    await say('mine', `${base.temperament}`);
    await say('mine', `내가 잘하는 건 ${base.strengths.join(', ')}. 앞으로 잘 부탁해!`);
    const hit = await choose([{ value: 'yes', label: '오~ 맞는 것 같아!' }, { value: 'meh', label: '글쎄… 반반?' }]);
    await say('mine', hit === 'yes' ? '헤헤 고마워! 우린 벌써 통했네 💛' : '괜찮아, 사람은 여러 얼굴이 있으니까. 천천히 알아가자! 💛');
    bump();

    for (const r of elementReactions(facts.fiveElements)) await say(r.element, r.text);
    if (hasPolicyNote(facts)) {
      await say(HOST, '아, 하나 솔직하게 말할게. 태어난 시간이 경계 근처거나 출생지에 따라 시주(시간 기둥)가 두 가지로 읽힐 수 있어. 정확히 하나로 정해지지 않는 부분은 숨기지 않고 알려줄게!');
    }
    await hub(facts, id, base.name);
  }

  async function hub(facts: SajuFacts, id: string, name: string) {
    const done = new Set<string>();
    const base = CHARACTERS[facts.dayMaster];
    for (;;) {
      if (!alive.current) return;
      await say(HOST, done.size ? '다음엔 뭘 해볼까?' : '자, 이제 뭘 해볼까?');
      const opts = [
        { value: 'daily', label: '☀️ 오늘 운세 들려줘' },
        { value: 'mood', label: '💭 지금 기분 털어놓기' },
        { value: 'banter', label: '🗣️ 친구들 수다 보기' },
        ...(affRef.current >= 3 ? [{ value: 'secret', label: '🤫 비밀 이야기 듣기' }] : []),
        { value: 'more', label: '📜 더 깊이 알아보기' },
        { value: 'bye', label: '👋 오늘은 여기까지' },
      ];
      const pick = await choose(opts);
      if (pick === 'daily') {
        const d = buildDaily(facts);
        await say('mine', `오늘 일진은 ${d.dayPillar}야. ${d.oneLine}`);
        await say('mine', d.flow);
        await say('mine', `오늘의 작은 미션! ${d.action}`);
        const go = await choose([{ value: 'ok', label: '좋아, 해볼게!' }, { value: 'later', label: '생각해 볼게' }]);
        await say('mine', go === 'ok' ? '약속이야! 해내면 나한테도 자랑해줘 ✨' : '그래, 부담 갖지 말고~ 마음 내킬 때 해봐!');
        if (go === 'ok' && !done.has('daily')) bump();
      } else if (pick === 'mood') {
        await say(HOST, '지금 기분이 어때? 가장 가까운 걸 골라줘.');
        const m = (await choose(MOODS.map((x) => ({ value: x.id, label: `${x.emoji} ${x.label}` })))) as Mood;
        const mm = MOODS.find((x) => x.id === m)!;
        await say(mm.friend, `${FRIEND[mm.friend].short}가 대답할게! ${moodReply(m, fnv(facts.inputHash) % 7 + done.size)}`);
        if (!done.has('mood')) bump();
      } else if (pick === 'banter') {
        const rs = elementReactions(facts.fiveElements);
        await say(HOST, '친구들끼리 네 사주를 보고 수다 떠는 중이야, 들어봐 ㅋㅋ');
        for (const r of rs) await say(r.element, r.text);
        await say('mine', `내가 대표로 말할게. ${base.shareLine} 다들 지켜봐 줘서 고마워!`);
        if (!done.has('banter')) bump();
      } else if (pick === 'secret') {
        for (const t of secretStory(base)) await say('mine', t);
        if (!done.has('secret')) bump();
      } else if (pick === 'more') {
        await say(HOST, `더 깊이 보고 싶으면 이런 풀이가 있어. 기본사주는 ${won(CATALOG.basic.priceKrw)} 또는 엽전 ${CATALOG.basic.coinCost}닢이야.`);
        await say(HOST, '연애운 심층은 별도로 열 수 있어. 둘 다 내용을 먼저 안내하고, 결제는 네가 직접 누를 때만 진행돼!');
        setLinks(true);
        const back = await choose([{ value: 'back', label: '좀 더 이야기하자' }, { value: 'bye', label: '이제 갈게' }]);
        if (back === 'bye') { await farewell(name, id); return; }
      } else { await farewell(name, id); return; }
      done.add(pick);
    }
  }

  const [links, setLinks] = useState(false);
  async function farewell(name: string, id: string) {
    await say('mine', `오늘 즐거웠어! 또 놀러 와, 나 ${name}이 여기서 기다릴게 👋`);
    await say(HOST, '결과 화면에서 친구 카드도 저장하고 공유할 수 있어!');
    setAsk(null); setDoneLink(id);
  }
  const [doneLink, setDoneLink] = useState<string | null>(null);

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (ask?.type !== 'text') return;
    const digits = input.replace(/\D/g, '');
    if (ask.kind === 'date' && digits.length !== 8) { setError('숫자 8자리로 적어줘! 예: 19900419'); return; }
    if (ask.kind === 'time') {
      const t = digits.padStart(4, '0');
      if (digits.length < 1 || digits.length > 4 || Number(t.slice(0, 2)) > 23 || Number(t.slice(2, 4)) > 59) { setError('시간은 0000~2359 사이로 적어줘! 예: 0110'); return; }
    }
    resolver.current?.(ask.kind === 'date' ? formatDate(digits) : `${digits.padStart(4, '0').slice(0, 2)}:${digits.padStart(4, '0').slice(2)}`);
  }

  const baseOf = (w: Who) => (w === 'mine' ? (mineStem ? CHARACTERS[mineStem as keyof typeof CHARACTERS] : friendBase(HOST)) : w === 'me' ? null : friendBase(w));
  const nameOf = (w: Who) => (w === 'mine' ? (baseOf(w)?.name ?? '') : w === 'me' ? '' : FRIEND[w].short);

  return (
    <div className="chat">
      <div className="chat-top" role="status" aria-label="호감도">
        <span className="muted small">친구와 대화 중</span>
        <span className="hearts" aria-label={`호감도 ${affinity}/${AFFINITY_MAX}`}>{Array.from({ length: AFFINITY_MAX }, (_, i) => <i key={i} className={i < affinity ? 'on' : ''}>♥</i>)}</span>
      </div>
      <div className="chat-log" role="log" aria-live="polite">
        {msgs.map((m) => {
          const b = baseOf(m.who);
          return m.who === 'me' ? (
            <div key={m.id} className="msg me"><div className="bubble">{m.text}</div></div>
          ) : (
            <div key={m.id} className="msg">
              {b && <CharacterArt base={b} size={44} className="avatar" />}
              <div><small className="who">{nameOf(m.who)}</small><div className="bubble">{m.text}</div></div>
            </div>
          );
        })}
        {typing && typing !== 'me' && (
          <div className="msg"><CharacterArt base={baseOf(typing)!} size={44} className="avatar" /><div><small className="who">{nameOf(typing)}</small><div className="bubble typing" aria-label="입력 중"><i /><i /><i /></div></div></div>
        )}
        {links && (
          <div className="chat-links">
            <Link className="btn secondary" to="/products/basic">기본사주 보기</Link>
            <Link className="btn secondary" to="/products/love">연애운 심층 보기</Link>
          </div>
        )}
        {doneLink && chartId && (
          <div className="chat-links">
            <Link className="btn block go" to={`/character/result/${doneLink}`}>내 친구 카드 보러 가기</Link>
            <Link className="btn secondary block" to="/daily">오늘의 운세 보기</Link>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        {ask?.type === 'choices' && (
          <div className="quick" role="group" aria-label="답변 고르기">
            {ask.options.map((o) => <button key={o.value} className="chip" onClick={() => resolver.current?.(o.value)}>{o.label}</button>)}
          </div>
        )}
        {ask?.type === 'text' && (
          <form onSubmit={submitText} className="chat-form">
            <input className="input" inputMode="numeric" autoFocus aria-label={ask.kind === 'date' ? '생년월일' : '태어난 시간'} placeholder={ask.placeholder} value={input} maxLength={ask.kind === 'date' ? 10 : 5}
              onChange={(e) => { setInput(ask.kind === 'date' ? formatDate(e.target.value) : e.target.value); setError(''); }} />
            <button className="btn" type="submit">보내기</button>
          </form>
        )}
        {error && <p className="err" role="alert">{error}</p>}
        {!ask && !doneLink && <p className="muted small center" style={{ margin: 0 }}>{typing ? '친구가 말하는 중…' : ' '}</p>}
      </div>
    </div>
  );
}
