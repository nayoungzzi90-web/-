import { fnv, hex } from '../hash';
import { PLAN_VERSION } from './plan';
import { PROMPT_VERSION } from './prompt';
import { QA_VERSION } from './qa';
import { usableClaims } from './claims';
import type { InterpretationFacts } from './types';

/**
 * 결과 캐시 키: 같은 원국 + 같은 계산·해석·프롬프트·모델 버전이면 같은 키. 하나라도 바뀌면 새로 생성한다.
 * (원국 식별값 + 계산 정책 + 해석 규칙 버전 + 상품 + 프롬프트 + 모델 + 언어/문체 + 승인된 명제 집합)
 * 비암호학적 해시라 "같은 조건 재사용" 용도이며, 사용자 간 공유에는 쓰지 않는다(리포트는 본인 소유).
 */
export function reportCacheKey(facts: InterpretationFacts, opts: { model: string; allowDraft?: boolean; tone?: string; language?: string; concern?: string }): string {
  const claims = usableClaims(facts.claims, opts.allowDraft ?? false).map((c) => `${c.id}:${c.status}`).sort();
  const raw = JSON.stringify([
    facts.subjects.map((s) => [s.key, s.pillars]), facts.calculation, facts.version, facts.product, facts.years ?? null,
    PROMPT_VERSION, PLAN_VERSION, QA_VERSION, opts.model, opts.language ?? 'ko-KR', opts.tone ?? 'haeyo', claims, opts.concern ?? '',
  ]);
  return `rk_${hex(fnv(raw))}${hex(fnv([...raw].reverse().join('')))}`;
}
