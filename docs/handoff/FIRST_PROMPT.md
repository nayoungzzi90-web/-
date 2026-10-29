# Claude Code에 처음 붙여넣을 문장

> 전제: **오행 친구들 실제 Lovable 앱 저장소**를 GitHub clone/코드 export로 내려받고, 이 인수인계 패키지의 파일을 안내대로 앱 폴더에 넣은 뒤 실행하세요. 이 패키지 자체는 앱 전체 소스가 아닙니다.

아래 전체를 Claude Code에 입력:

```text
이 저장소는 내가 Lovable에서 개발하던 사주 웹사이트 '오행 친구들'의 실제 React + TypeScript + TanStack Start + Supabase 소스코드다. 이제부터 Lovable AI 개발은 중단하고 Claude Code를 기본 개발 도구로 사용한다. 처음부터 새 사이트를 만들지 말고 기존 코드, 디자인, DB 계약 및 테스트를 최대한 보존해라.

최우선으로 CLAUDE.md, PROJECT_HANDOFF.md, AI_EXPERT_HYBRID.md, MIGRATION_AND_QA.md, handoff/reference_specs/오행친구들_PRD_v1.0.md, handoff/reference_specs/OHENG_R001_R015_RESTORED_MASTER.md, handoff/reference_specs/oheng_r015_spec.md, 현재 앱 AGENTS.md, roadmap.md, docs/, src/, package.json, bun.lock, supabase/config.toml을 읽어라. 동봉 reference_prototypes의 TypeScript·ZIP은 독립 연구용 참조이며 실제 운영 앱 구현으로 무단 병합하지 마라.

첫 번째 작업은 반드시 READ-ONLY 코드·구조 감사다. 코드/DB/시크릿/운영 결제·배포는 건드리지 말고 현재 앱과 제품 PRD, R001~R015 확정·초안·미검증 조건의 차이를 파악해라. 모든 파일 경로·코드/테스트 증거를 밝혀라. R002~R009의 상세 원문 미확보, R006/009/010/011/013 전문가 검증 대기, R015 NO_GO를 그대로 유지해라. finalApproved=false와 결제 active=false는 승인 없이 절대 바꾸지 마라. 운영 SQL REVIEW_ONLY는 실행하지 마라.

제품 목표: 조선풍 귀여운 오행 캐릭터 10종, 무료 캐릭터와 오늘의 운세, 공유 카드/친구 초대, 기본사주·궁합·심층 연애운(P0), 택일·심층사주(P1), 업전(냥)·회원·유료 콘텐츠, 정확한 KST/윤달/절입 만세력. 전문가형 AI 해석은 결정론적 R001~R014 근거 엔진이 계산한 승인 claim만 사용하고 GPT는 한국어 상담 문장을 작성, Gemini는 독립 검토, R015가 품질/출시를 통제하는 B안 하이브리드다. LLM이 간지·시주·미승인 용신을 만들어내지 못하도록 차단해라.

보안 우선: 운영 회원 데이터·냥 잔액·결제/보상·DB/RLS·서비스키·비밀값·Git 브랜치·게시 상태를 승인 없이 변경하지 마라. 격리 스테이징과 운영 프로젝트를 섞지 마라. R015 staging에는 JWT34/34, anon5/5, 단일 서버/호스팅 quota 성공 결과가 있으나 독립2서버 Postgres 테스트와 프록시 헤더 검증은 아직 미완료다.

첫 답변은 다음 4개 산출물 초안과 실행 가능한 로컬 테스트 명령을 제시해라: 1) IMPLEMENTATION_MATRIX.md(기능별 실제 구현/미구현 증거), 2) MIGRATION_RISK_REGISTER.md(Cloud/Auth/DB/배포 종속성), 3) R001_R015_GAP_REPORT.md(명리학적 SOURCE_MISSING·승인 차이), 4) NEXT_5_COMMITS_PLAN.md(우선순위 5개 작업과 테스트). 내가 다음 단계 구현을 요청할 때까지 운영 코드/DB/배포/결제 상태는 변경하지 마라. 추정 대신 검증 결과와 미확인 사항을 구분해 한국어로 보고해라.
```
