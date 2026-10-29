// @ts-nocheck
// 복사본(vendored) — 직접 고치지 마세요. 원본에서 고친 뒤 `node scripts/sync-reading-core.mjs` 로 다시 복사합니다.
import { Term, TermStatus } from './terms';

/** 공식 자료(월력요항 등)에서 옮겨 적은 한 줄. KST(UTC+9 고정) 표기. */
export interface OfficialTerm { year: number; name: string; kst: string; precisionSeconds: 1 | 60; source: string }
export interface OfficialComparison { year: number; name: string; status: TermStatus; deltaSeconds: number; ourKst: string; officialKst: string }

const parseKst = (s: string): number => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`공식 시각 형식 오류: ${s}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)) - 9 * 3_600_000;
};
const kstStr = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 19).replace('T', ' ');

/**
 * 공식 표기와 계산값을 비교한다 (supabase/migrations/0005 의 refresh_solar_term_status 와 같은 규칙).
 *  - 분 단위 공식값과 같은 분이고 계산값 초가 경계에서 boundarySeconds 이상 떨어져 있으면 official_confirmed
 *  - 같은 분이지만 경계 근처이거나, 1분(+경계) 이내 차이면 boundary_review (반올림/내림 규칙을 모르므로 확정 금지)
 *  - 그보다 크면 official_mismatch
 */
export function compareOfficial(terms: Term[], official: OfficialTerm[], boundarySeconds = 5): OfficialComparison[] {
  const out: OfficialComparison[] = [];
  for (const o of official) {
    const t = terms.find((x) => x.year === o.year && x.name === o.name);
    if (!t) continue;
    const ours = Math.floor(t.ms / 1000) * 1000;
    const off = parseKst(o.kst);
    const delta = (ours - off) / 1000;
    const secInMinute = ((((ours + 9 * 3_600_000) % 60_000) + 60_000) % 60_000) / 1000;
    let status: TermStatus;
    if (o.precisionSeconds === 60) {
      const sameMinute = Math.floor((ours + 9 * 3_600_000) / 60_000) === Math.floor((off + 9 * 3_600_000) / 60_000);
      if (sameMinute) status = secInMinute < boundarySeconds || secInMinute > 60 - boundarySeconds ? 'boundary_review' : 'official_confirmed';
      else status = Math.abs(delta) <= 60 + boundarySeconds ? 'boundary_review' : 'official_mismatch';
    } else status = Math.abs(delta) <= 1 ? 'official_confirmed' : Math.abs(delta) <= 1 + boundarySeconds ? 'boundary_review' : 'official_mismatch';
    out.push({ year: o.year, name: o.name, status, deltaSeconds: delta, ourKst: kstStr(ours), officialKst: kstStr(off) });
  }
  return out;
}
export const officialKey = (year: number, name: string) => `${year}:${name}`;
