import { ReactNode, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CATALOG, Product, won } from '../lib/catalog';
import { Coin } from './Scene';
import type { Evidence, ReportSection as Sec } from '../lib/content/report';

export const MockNotice = ({ children }: { children?: ReactNode }) => (
  <div className="notice" role="note">
    <b>샌드박스 모드</b> · {children ?? '결제·AI 리포트는 Mock이에요. 입력 정보는 이 브라우저에만 저장돼요.'}
  </div>
);

export const CoinBalance = ({ amount }: { amount: number }) => (
  <Link to="/rewards" className="coin" aria-label={`엽전 ${amount}냥 보유`}><Coin size={24} />{amount}</Link>
);

export const LoadingState = ({ label = '불러오는 중이에요' }: { label?: string }) => (
  <div role="status" aria-live="polite" className="card">
    <p className="muted">{label}…</p>
    <div className="skeleton" /><div className="skeleton" style={{ width: '80%' }} /><div className="skeleton" style={{ width: '60%' }} />
  </div>
);

export const ErrorState = ({ title = '문제가 생겼어요', message, action }: { title?: string; message: string; action?: ReactNode }) => (
  <div role="alert" className="card">
    <h2>{title}</h2>
    <p className="muted">{message}</p>
    {action}
  </div>
);

export function ConfirmationDialog({ open, title, children, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel }: { open: boolean; title: string; children: ReactNode; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <div>{children}</div>
        <div className="row">
          <button className="btn ghost sm" onClick={onCancel}>{cancelLabel}</button>
          <button ref={ref} className="btn sm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const soon = product.status === 'coming_soon';
  const body = (
    <>
      <div>
        <h3>{product.name} {soon && <span className="badge soon">준비 중</span>}</h3>
        <p className="muted small" style={{ margin: 0 }}>{product.tagline}</p>
      </div>
      <div className="price">
        {soon ? <span className="badge soon">출시 예정</span> : product.priceKrw === 0 ? <span className="badge ok">무료</span> : (<>{won(product.priceKrw)}<small>또는 {product.coinCost}냥</small></>)}
      </div>
    </>
  );
  return <Link to={product.path} className="card product">{body}</Link>;
}

export function EvidenceAccordion({ items }: { items: Evidence[] }) {
  if (!items.length) return null;
  return (
    <details className="acc">
      <summary>해석 근거 보기</summary>
      <div className="acc-body">
        <ul className="list-plain">
          {items.map((e) => (
            <li key={e.id}><b>{e.label}</b> — {e.detail} <span className="badge" title="규칙 ID">{e.ruleId}</span></li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function ReportSection({ section, evidence, index }: { section: Sec; evidence: Evidence[]; index: number }) {
  return (
    <section id={`sec-${section.id}`} className="card report-sec" aria-labelledby={`h-${section.id}`}>
      <h2 id={`h-${section.id}`}>{index + 1}. {section.title}</h2>
      <p className="body">{section.body}</p>
      <EvidenceAccordion items={evidence.filter((e) => section.evidenceIds.includes(e.id))} />
    </section>
  );
}

export const productName = (id: keyof typeof CATALOG) => CATALOG[id].name;
