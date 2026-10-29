# CLAUDE.md — 오행 친구들 (Hanji Fortune Fables)

Claude Code 작업 지침. 원문 인수인계 문서는 `docs/handoff/`에 그대로 있다(차이는 `docs/handoff/CONFLICTS_WITH_CURRENT_DECISIONS.md`). **이 파일은 원문 `docs/handoff/CLAUDE.md`에 사용자 결정(2026-10-21 이후)을 반영한 현행판**이다. 충돌하면 이 파일이 우선한다.

## 구조
- `lovable-app/` — 실제 제품(TanStack Start + Supabase). 화면, 로그인, 엽전·결제(꺼짐), 풀이 서버 함수.
- 루트(`engine/manse`, `src/lib/{saju,report,content}`, `supabase/`) — 만세력 엔진, 해석 명제·검수·AI 작성 파이프라인, 시험. `lovable-app/src/lib/reading-core/`는 루트 코드의 사본이므로 직접 고치지 말고 원본을 고친 뒤 `node lovable-app/scripts/sync-reading-core.mjs` 로 복사(`--check` 로 동일성 확인).
- `docs/saju-engine/` — R-001~R-015 명리 기준서 원문(`source/`), 참조 코드(`reference/`, 앱에 병합 금지), 규칙 상태(`RULE_REGISTRY.md`).
- 번호 주의: 명리 규칙 R-001~R-015 ≠ `lovable-app/docs/R001_*`, `R015_*`(음력·절입 정밀, 로그인·DB 권한 감사).

## 절대 규칙 (사용자 승인 없이 하지 않는다)
1. 프로젝트 재작성·기존 기능 삭제 금지.
2. **운영 DB 변경 금지**: DDL/DML, GRANT/REVOKE, 마이그레이션 적용, 회원·엽전·원장 변경. 새 SQL은 `lovable-app/docs/migrations/REVIEW_ONLY/` 에 검토용으로만 둔다.
3. **결제 활성화·계정 삭제 활성화·공개 배포·공개 상태 변경 금지.** `PAYMENTS_MODE` 기본 꺼짐, `ACCOUNT_DELETION_ENABLED` 기본 꺼짐, 유료 상품 `active=false`, `finalApproved=false`, R-015 `NO_GO` 를 승인 없이 바꾸지 않는다.
4. **비밀값 금지**: `.env`, service_role, OpenAI/Gemini/PG/KASI 키, 회원정보를 코드·로그·Git·프롬프트·채팅에 넣지 않는다. 키는 서버 환경변수/Secrets 에만. 채팅에 붙여넣은 키는 폐기하도록 안내.
5. **자료 진실성**: R-002~R-005 상세 원문은 없다(`SOURCE_MISSING`, R-006~R-009 원문은 DRAFT-1로 `docs/saju-engine/source/`에 있음). 요약 복원이나 참조 코드를 원문 확보·전문가 승인으로 오인하지 않는다. R-006/009/010/011/013 과 《궁통보감》 120조합은 검증 전 확정 발행 금지. 정책 채택 ≠ 구현 ≠ 테스트 ≠ 전문가 검증 ≠ 출시 승인.
6. **결정론 엔진 우선**: LLM 은 간지·시주·십성·월령·합충·대운·세운·격국·용신을 만들거나 바꾸지 못한다. GPT 는 승인된 근거로 상담문을 쓰고, Gemini 는 독립 감수(PASS/REVIEW/BLOCK 은 코드가 결정). 모델 합의는 정확성 보증이 아니다.
7. 영향이 큰 작업 전에: 현재 상태, 변경 대상, 위험, 검증 기준, 롤백 방법을 먼저 말한다. 문서·코드·데이터·배포는 각각 다른 승인 단위.
8. Git: 지정된 개발 브랜치에서만 작업·푸시, force push/이력 수정 금지, 사용자가 요청하기 전에는 PR 을 만들지 않는다. 커밋 끝에 지정된 공동 저자·세션 줄을 붙인다.
9. 저장소가 **공개**인 동안 사업 전략·마진 분석·보안 취약점 상세를 올리지 않는다(`START_HERE` 는 비공개 저장소를 요구). PRD·Lovable 프롬프트는 비공개 전환 뒤에 넣는다.

## 현행 제품 정책 (원문 `docs/handoff/`와 다른 점)
- 재화 **엽전, 단위 닢**, 1닢 = 900원. 가입 보너스 없음.
- 가격: 기본사주 900원(1닢), 궁합 900원(1닢), 심층 연애운 1,800원(2닢), 택일 1,800원(2닢, 준비 중), 심층사주 2,700원(3닢, 준비 중). 충전 팩 1~4닢.
- 초대 보상 1닢: 친구가 **처음 결제**하고 환불 기간(7일, 제안값) 안에 환불하지 않으면 지급, 초대자도 1닢 이상 결제한 적이 있어야 함, 한국 시간 하루 3명·월 10명.
- 풀이 문체: **한글만(한자 금지), 사주 전문용어 없이 담백하게 필요한 말만, 정확하게.** AI 풀이는 `src/lib/report` 의 검수(JARGON·HANJA·단정 표현)를 통과해야 한다.
- 출생은 한국 출생만, 지원 범위 1900~2050.
- 사용자 응답은 한국어, 초보자도 이해하게 짧고 정직하게(안 한 일·못 한 검증은 그대로 말한다). 작업 묶음이 끝나면 푸시 알림.

## 작업 방식
- 변경 후 반드시: 루트 `npx vitest run`, `lovable-app` 의 `npx tsc --noEmit`, `npx vitest run`, `npx eslint src`, 필요하면 `npx vite build`.
- 새 서버 기능은 입력 검증(zod), 서버 전용 모듈(`*.server.ts`), 권한은 서버가 DB 에서 직접 확인(클라이언트 값 불신).
- 보안 검토 기록: `lovable-app/docs/SECURITY_REVIEW_2026-10-29.md`. 결제 켜기 전 남은 항목이 있다.
