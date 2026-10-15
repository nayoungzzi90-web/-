import { CATALOG } from '../catalog';
import type { InterpretationFacts, ProductKey, ReportPlan, SectionPlan } from './types';

export const PLAN_VERSION = 'plan-1.0';

/** PRD 2.1 의 목차·글자 수. min/max 는 목표의 70%~150% (제품 전체 범위는 totalRange 로 따로 검사). */
const sec = (id: string, title: string, purpose: string, target: number, focusTags: string[]): SectionPlan => ({
  id, title, purpose, targetChars: target, minChars: Math.round(target * 0.7), maxChars: Math.round(target * 1.5), focusTags,
});

const BASIC: SectionPlan[] = [
  sec('s1', '원국 핵심', '사주 원국(네 기둥)과 일간, 오행 분포를 쉬운 말로 요약한다. 네 기둥의 간지를 정확히 언급한다.', 250, ['core', 'balance']),
  sec('s2', '타고난 성격·기질', '일간, 월간 십성, 계절, 자기 힘/바깥 힘을 근거로 타고난 성격과 기질을 설명한다.', 450, ['personality', 'season', 'balance']),
  sec('s3', '강점·재능', '십성 비중과 오행 분포에서 읽히는 강점과 재능, 그것이 잘 쓰이는 상황을 설명한다.', 350, ['strength', 'balance']),
  sec('s4', '직업·재물 경향', '십성(식상·재성·관성)을 근거로 일하는 방식, 어울리는 환경, 재물을 다루는 경향을 설명한다.', 400, ['career', 'money']),
  sec('s5', '관계·연애 경향', '관계에서의 태도와 원국 안의 합충을 근거로 대인관계·연애 경향을 설명한다.', 350, ['relationship', 'relations', 'love']),
  sec('s6', '실천 조언', '앞선 내용을 바탕으로 오늘부터 할 수 있는 작은 실천 3가지를 제안한다. 새로운 사실을 만들지 않는다.', 350, ['advice', 'balance']),
];

const COMPAT: SectionPlan[] = [
  sec('s1', '관계 유형', '두 사람의 일간 오행 관계와 십성 관계로 관계의 기본 결을 설명한다. 점수·확률은 쓰지 않는다.', 250, ['compat_core']),
  sec('s2', '소통', '일간 관계와 오행 보완을 근거로 소통 방식의 장점과 엇갈림을 설명한다.', 300, ['communication', 'compat_core']),
  sec('s3', '갈등·차이', '일지·월지의 합충을 근거로 부딪히기 쉬운 지점과 차이를 설명한다.', 300, ['conflict']),
  sec('s4', '애정표현', '두 사람의 일지 십성을 근거로 애정을 주고받는 방식의 차이를 설명한다.', 300, ['affection']),
  sec('s5', '생활방식', '월지 관계와 오행 보완을 근거로 생활 리듬·소비·휴식 방식의 조율점을 설명한다.', 300, ['lifestyle']),
  sec('s6', '소통 조언', '앞선 내용을 바탕으로 두 사람이 바로 해 볼 수 있는 대화 방법을 제안한다. 새로운 사실을 만들지 않는다.', 300, ['communication', 'advice']),
];

const loveSections = (years: number[]): SectionPlan[] => [
  sec('s1', '연애 기질', '일간·월간 십성·오행 균형으로 연애에서의 기본 기질을 설명한다.', 600, ['love', 'personality', 'balance']),
  sec('s2', '원하는 관계·상대', '일지(배우자궁) 십성과 이성 인연 별로 편안해하는 관계 유형과 끌리는 상대의 결을 설명한다.', 500, ['love', 'relationship']),
  sec('s3', '반복될 수 있는 관계 패턴', '원국의 합충, 자기 힘/바깥 힘, 십성 쏠림에서 읽히는 반복 패턴과 알아차리는 방법을 설명한다.', 650, ['relations', 'relationship', 'personality']),
  sec('s4', '강점·어려움', '연애에서의 강점과 어려움을 균형 있게 설명한다. 어려움은 비난이 아니라 조율 포인트로 쓴다.', 500, ['strength', 'love']),
  sec('s5', '현재 대운', '대운 계산이 제공되지 않는 경우 계산 전이라는 점을 솔직히 밝히고, 세운 중심으로 읽는 방식과 큰 흐름을 보는 법을 짧게 안내한다. 대운 간지를 지어내지 않는다.', 500, ['luck', 'limits']),
  sec('s6', `${years[0]}~${years[years.length - 1]}년 세운`, `${years.join(', ')}년을 한 해씩 모두 다룬다. 각 해의 간지·십성·일지와의 합충을 근거로 관계 영역에서 어떤 주제가 부각될지 설명한다. 연도마다 소제목처럼 "○○○○년(간지)"로 시작한다.`, 1250, ['yearly']),
  sec('s7', '조언', '앞선 내용을 바탕으로 한 실천 조언. 새로운 사실을 만들지 않는다.', 500, ['advice', 'love']),
];

/** 모든 문단이 지켜야 하는 규칙. 프롬프트와 QA 가 같은 목록을 공유한다. */
export const COMMON_RULES = [
  '제공된 "사실 줄"에 있는 내용만 근거로 쓴다. 사주 원국·간지·십성·오행 수치를 바꾸거나 새로 만들지 않는다.',
  '네 기둥 외의 간지(예: 제공되지 않은 갑자·병오)를 언급하지 않는다. 간지를 쓸 때는 제공된 것만 그대로 쓴다.',
  '출생 시간을 모르는 경우 시주를 절대 추측하지 않고, 시주가 필요한 해석은 하지 않는다.',
  '미래를 단정하지 않는다. "반드시", "무조건", "100%", "틀림없이", "운명이 정해져 있다" 같은 표현과 결혼·이별·재회·사고 등의 확정 예언을 금지한다. "~하기 쉬워요", "~일 가능성이 있어요"처럼 경향으로 쓴다.',
  '의학·심리 진단(우울증, 불안장애, 치료, 질병 등)을 하지 않는다. 사주는 재미와 자기이해를 위한 참고 자료다.',
  '점수·퍼센트·등급(예: 92%, 80점)을 쓰지 않는다.',
  '쉬운 상담사 말투(해요체)로, 한자·전문용어는 처음 나올 때 괄호로 쉬운 뜻을 붙인다. 공포감을 주거나 불안을 부추기지 않는다.',
  '같은 설명이나 문장을 반복하지 않는다. 이전 섹션에서 한 말은 다시 풀어 쓰지 말고 새로운 관점만 더한다.',
  '일반론(누구에게나 맞는 말)으로 채우지 않는다. 각 문단은 제공된 사실 줄의 고유한 표지(십성명, 간지, 오행, 연도 등)를 2개 이상 직접 언급한다.',
];

export function buildPlan(product: ProductKey, facts: InterpretationFacts): ReportPlan {
  const meta = CATALOG[product];
  const hourKnown = facts.subjects.every((s) => s.hourKnown);
  const sections = product === 'basic' ? BASIC : product === 'compatibility' ? COMPAT : loveSections(facts.years ?? []);
  return {
    product, productName: meta.name, sections: sections.map((s) => ({ ...s })),
    totalRange: meta.length ?? [0, 99999], years: facts.years, hourKnown, rules: COMMON_RULES,
  };
}
