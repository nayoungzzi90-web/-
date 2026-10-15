// 상담사 검수용 규칙 목록 문서 생성: npx vite-node scripts/make-rules-doc.ts
import { writeFileSync } from 'node:fs';
import { RULES } from '../src/lib/report/claims';

const lines = ['# 해석 규칙 카탈로그 (상담사 검수용)', '', '`approved_rules` 테이블에 규칙 ID 를 넣으면 해당 규칙이 만든 명제가 APPROVED 가 됩니다. 현재는 **전부 미승인 초안**입니다.', '', '| 규칙 ID | 제목 | 영역 | 판정 논리 |', '|---|---|---|---|'];
for (const r of RULES) lines.push(`| ${r.id} | ${r.title} | ${r.domain} | ${r.logic} |`);
writeFileSync('docs/CLAIM_RULES.md', lines.join('\n') + '\n');
console.log(lines.length - 5, 'rules');
