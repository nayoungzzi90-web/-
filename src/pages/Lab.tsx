import { useMemo, useState } from 'react';
import { CATALOG } from '../lib/catalog';
import { kstParts } from '../lib/kst';
import { buildCompatInterpretation, buildInterpretation } from '../lib/report/interpretation';
import { buildPlan } from '../lib/report/plan';
import { buildFactsBlock, buildManualPrompt, buildSystemPrompt, SECTION_SCHEMA } from '../lib/report/prompt';
import { checkReport, checkSection, countChars } from '../lib/report/qa';
import type { InterpretationFacts, ProductKey, QaIssue } from '../lib/report/types';
import { calculator } from '../lib/saju/sampleCalculator';
import { BirthInput } from '../lib/saju/types';
import { BirthForm } from '../components/BirthForm';

/**
 * AI 리포트 실험실 (개발 전용): API 키 없이 프롬프트 품질을 평가한다.
 * ① 사주를 입력하면 실제 서비스와 같은 시스템/섹션 프롬프트를 만들어 주고
 * ② 아무 AI 에서 돌린 결과(섹션별 본문)를 붙여넣으면 서비스와 같은 자동 QA 로 채점한다.
 */
const PRODUCTS: ProductKey[] = ['basic', 'love_deep', 'compatibility'];
const SAMPLE_B: BirthInput = { calendar: 'solar', leapMonth: false, year: 1993, month: 3, day: 9, hour: 9, minute: 0, timeUnknown: false, country: 'KR' };

/** "## 제목" 으로 나뉜 텍스트를 섹션별 본문으로 */
export function parsePasted(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let cur: string | null = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^#{1,3}\s*(?:\d+\.\s*)?(.+?)\s*$/);
    if (m) { cur = m[1]; out[cur] = ''; } else if (cur) out[cur] += line + '\n';
  }
  return out;
}

export default function Lab() {
  const [input, setInput] = useState<BirthInput | null>(null);
  const [product, setProduct] = useState<ProductKey>('basic');
  const [pasted, setPasted] = useState('');
  const [copied, setCopied] = useState('');

  const built = useMemo(() => {
    if (!input) return null;
    const facts = calculator.calculate(input);
    const years = [0, 1, 2, 3, 4].map((i) => kstParts().year + i);
    let interp: InterpretationFacts;
    if (product === 'compatibility') interp = buildCompatInterpretation(facts, calculator.calculate(SAMPLE_B));
    else interp = buildInterpretation(product, facts, product === 'love_deep' ? { years, yearPillar: (y) => calculator.yearPillar(y) } : {});
    return { interp, plan: buildPlan(product, interp) };
  }, [input, product]);

  const result = useMemo(() => {
    if (!built || !pasted.trim()) return null;
    const parsed = parsePasted(pasted);
    const rows = built.plan.sections.map((s) => {
      const key = Object.keys(parsed).find((k) => k.includes(s.title) || s.title.includes(k));
      const raw = key ? parsed[key] : '';
      const claimIds = [...raw.matchAll(/\[claims?:\s*([^\]]*)\]/gi)].flatMap((m) => m[1].split(/[,\s]+/).filter(Boolean));
      const body = raw.replace(/\[claims?:[^\]]*\]/gi, '').trim();
      const issues: QaIssue[] = body ? checkSection(body, [...new Set(claimIds)], s, { facts: built.interp, plan: built.plan, allowDraft: true }) : [{ code: 'MISSING', severity: 'fail', message: `"## ${s.title}" 섹션을 찾지 못했어요.`, sectionId: s.id }];
      return { s, body, n: countChars(body), issues };
    });
    const global = checkReport(rows.map((r) => ({ id: r.s.id, title: r.s.title, body: r.body })), built.plan);
    return { rows, global };
  }, [built, pasted]);

  const copy = async (label: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(label); } catch { setCopied('복사 실패 — 직접 선택해 복사해 주세요'); } };
  const fullPrompt = built ? buildManualPrompt(built.plan, built.interp) : '';

  return (
    <div>
      <h1 className="title">AI 리포트 실험실</h1>
      <div className="notice info">개발 전용 화면이에요. 실제 서비스와 <b>같은 프롬프트·같은 자동 검수</b>를 사용하니, 여러 AI 모델의 결과를 붙여넣어 비교해 보세요. 입력한 정보는 이 브라우저 밖으로 나가지 않아요.</div>

      <section className="card">
        <h2>1. 사주와 상품 고르기</h2>
        {!input ? <BirthForm submitLabel="프롬프트 만들기" showAlias={false} idPrefix="lab" onSubmit={setInput} /> : <button className="btn ghost sm" onClick={() => setInput(null)}>다시 입력</button>}
        <div className="seg" style={{ marginTop: 12 }} role="radiogroup" aria-label="상품">
          {PRODUCTS.map((p) => <label key={p}><input type="radio" name="lab-product" checked={product === p} onChange={() => setProduct(p)} />{CATALOG[p].name}</label>)}
        </div>
        {product === 'compatibility' && <p className="muted small">상대는 샘플 사주(1993-03-09 09:00)로 가정해요.</p>}
      </section>

      {built && (
        <>
          <section className="card">
            <h2>2. 규칙 엔진이 만든 사실 {built.interp.lines.length}줄</h2>
            <p className="muted small">AI는 이 줄만 근거로 써야 해요. 목차 {built.plan.sections.length}개 · 전체 {built.plan.totalRange[0].toLocaleString()}~{built.plan.totalRange[1].toLocaleString()}자.</p>
            <details className="acc"><summary>해석 명제 {built.interp.claims.length}개 (승인 전 초안) · 충돌 {built.interp.conflicts.length}건</summary><div className="acc-body"><table className="tbl"><thead><tr><th>ID</th><th>입장</th><th>내용</th></tr></thead><tbody>{built.interp.claims.map((c) => <tr key={c.id}><td className="small">{c.id}<br /><span className="muted">{c.status}</span></td><td>{c.stance}</td><td className="small">{c.thesis}</td></tr>)}</tbody></table></div></details>
            <details className="acc"><summary>사실 줄 보기</summary><div className="acc-body"><ul className="list-plain">{built.interp.lines.map((l) => <li key={l.id}><b>{l.id}</b> {l.text}</li>)}</ul></div></details>
          </section>

          <section className="card">
            <h2>3. 프롬프트 복사해서 AI에 붙여넣기</h2>
            <div className="grid2">
              <button className="btn sm" onClick={() => copy('전체 프롬프트', fullPrompt)}>전체 프롬프트 복사</button>
              <button className="btn secondary sm" onClick={() => copy('시스템 프롬프트', buildSystemPrompt(built.plan) + '\n\n' + buildFactsBlock(built.interp, built.plan, true))}>시스템+사실만 복사</button>
            </div>
            <p role="status" className="muted small">{copied && `${copied}를 복사했어요.`}</p>
            <details className="acc"><summary>프롬프트 미리보기 ({fullPrompt.length.toLocaleString()}자)</summary><div className="acc-body"><pre style={{ whiteSpace: 'pre-wrap', fontSize: '.78rem' }}>{fullPrompt}</pre></div></details>
            <details className="acc"><summary>출력 JSON 스키마(실서비스 API 호출용)</summary><div className="acc-body"><pre style={{ whiteSpace: 'pre-wrap', fontSize: '.78rem' }}>{JSON.stringify(SECTION_SCHEMA, null, 2)}</pre></div></details>
          </section>

          <section className="card">
            <h2>4. AI 결과 붙여넣고 자동 검수</h2>
            <label htmlFor="lab-paste" className="muted small">"## 섹션 제목" 아래에 "[claims: 명제ID, …]" 줄과 본문 형식으로 붙여넣어 주세요.</label>
            <textarea id="lab-paste" className="input" style={{ minHeight: 180, padding: 12 }} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={'## ' + built.plan.sections[0].title + '\n[claims: C-core, C-season]\n본문…\n\n## ' + built.plan.sections[1].title + '\n본문…'} />
            {result && (
              <div style={{ marginTop: 12 }}>
                <table className="tbl"><thead><tr><th>섹션</th><th>글자</th><th>결과</th></tr></thead><tbody>
                  {result.rows.map(({ s, n, issues }) => {
                    const fails = issues.filter((i) => i.severity === 'fail');
                    return (<tr key={s.id}><td>{s.title}</td><td>{n}<br /><span className="muted small">{s.minChars}~{s.maxChars}</span></td>
                      <td>{fails.length ? <span className="badge fail">FAIL {fails.length}</span> : <span className="badge ok">PASS</span>}{issues.map((i, k) => <div key={k} className="small muted">• {i.message}</div>)}</td></tr>);
                  })}
                </tbody></table>
                <h3 style={{ marginTop: 12 }}>전체 검수</h3>
                {result.global.length ? result.global.map((i, k) => <div key={k} className="notice error">{i.code}: {i.message}</div>) : <div className="notice ok">분량·목차·중복 검사를 통과했어요.</div>}
                <p className="muted small">자동 검수는 사실 정합성·금지 표현·분량·중복 같은 "코드로 확인 가능한 것"만 검사해요. 읽기 편함과 공감은 사람이 평가해야 해요.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
