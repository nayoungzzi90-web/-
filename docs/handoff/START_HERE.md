# 오행 친구들 → Claude Code 인수인계 시작 안내

**작성 기준: 2026-10-30** · 프로젝트 내부 원본·사용자 채택 요구사항·과거 QA 기록을 병합한 인수인계 번들.

## 핵심 결론

Claude Code로 개발을 계속할 수 있으며 Lovable AI 크레딧은 필요하지 않습니다. **단, 이 번들은 실제 Lovable 전체 Git 저장소의 복사본이 아닙니다.** 기존 앱 전체의 React/TypeScript 코드·에셋·락파일·마이그레이션과 환경별 DB 백업을 먼저 확보해야 합니다. 이 문서와 참조 ZIP만 가져가면 기존 사이트가 자동 복원되는 것은 아닙니다.

## 구성

- `CLAUDE.md` — Claude Code가 작업마다 지켜야 할 영구 지침. **앱 Git 저장소 루트에 복사**.
- `PROJECT_HANDOFF.md` — 실제 코드/DB 확인사항, 전체 제품 정책, R001~R015 현재 상태와 차기 우선순위.
- `FIRST_PROMPT.md` — 앱 소스와 이 문서들을 같은 폴더에 둔 후 Claude Code에 붙여넣는 첫 지시문.
- `MIGRATION_AND_QA.md` — Lovable에서 독립 배포로의 마이그레이션, 검증, 배포 금지선.
- `AI_EXPERT_HYBRID.md` — 사용자 선택 B안, GPT 작성 / Gemini 독립 감수 / 결정론적 명리 정책 엔진.
- `reference_specs/오행친구들_PRD_v1.0.md` — 기존 제품 PRD 원본 (기획 기준선, 구현 완료 증거 아님).
- `reference_specs/OHENG_R001_R015_RESTORED_MASTER.md` — 전체 R001~015 복원 마스터 (일부는 원문 미확보라고 명시됨).
- `reference_specs/oheng_r015_spec.md` — R015 초안/감사 게이트 원문.
- `reference_specs/오행친구들_Lovable_개발프롬프트_v1.0.md` — 이전 Lovable용 12단계 프롬프트 원본 (아카이브용, Claude 지시보다 하위).
- `reference_prototypes/*.zip` — 별도로 작성됐던 R001, R008~014, R015 보안 참조 코드 및 두 프로세스 테스트 번들. **현재 앱에 포함된 구현 또는 운영 승인 코드라는 뜻이 아닙니다.** 자동 병합 금지.

## 실제 이전 순서

1. [Lovable 원본 프로젝트](https://lovable.dev/projects/a7377037-44b1-44a0-9424-62e9977d9186)에서 **GitHub 비공개 저장소 동기화/내보내기** 또는 전체 코드 다운로드. 보안상 공개 저장소 사용 금지. 기존 Lovable 연결 브랜치를 force-push/rebase하지 말 것(`AGENTS.md` 확인).
2. 앱 소스 디렉터리 최상위에 **`CLAUDE.md`, `PROJECT_HANDOFF.md`, `AI_EXPERT_HYBRID.md`, `MIGRATION_AND_QA.md`를 복사**. `reference_specs/`와 `reference_prototypes/`는 `handoff/` 하위에 둘 수 있음. `FIRST_PROMPT.md`는 Claude Code 입력에 사용.
3. `.env`, API key, service_role, DB connection string, 결제 시크릿 등을 Git/프롬프트/채팅에 복사하지 않기. Lovable Cloud Supabase는 앱 소스와 별개이므로 **읽기 전용 인벤토리·백업·소유권/접근가능성 확인** 후 독립 인프라 이전 계획 수립.
4. Claude Code 실행 전 Node 및 bun/npm 도구 확인. 프로젝트 실제 `package.json`/`bun.lock`에 맞는 패키지 매니저 사용. 앱의 테스트·타입검사·빌드는 **로컬에서만**.
5. 첫 작업은 **코드 변경 없는 감사**: 라우트/만세력/음력 변환/인증/지갑/추천/RLS/DB/배포 의존성/실제 버전과 문서 차이를 문서화. `finalApproved:false`, 상품 비활성, 운영 NO_GO 보호.
6. 검증 계획 승인 후 한 기능씩 구현하고 테스트→리뷰→배포별 승인. 결제·유료 오픈·운영 DB SQL 적용은 독립적인 명시 승인 필요.

## 데이터 이관 절대 금지선

- **기존 운영 회원·생년월일·출생시간·지갑·냥 거래 기록·초대 보상 내역을 임의 삭제·수정·복제·공개하지 않기**.
- 실제 회원 데이터로 AI 테스트 금지; 합성 계정만 별도 staging DB에서 사용.
- Lovable Cloud 내부 인증·스토리지·권한·실제 호스팅 종속성이 있을 수 있으니, 외부 호스팅으로 옮긴다는 이유만으로 Supabase 연결이 자동 이전된다고 가정하지 않기.
- 기존 운영 프로젝트는 코드 확인 기준 비공개·유료 비활성·R001 finalApproved=false·R015 운영 SQL 미적용이며 **NO_GO**.
- 별도 격리 Staging 프로젝트가 공개 게시 상태였던 이력이 있음. 현재 공개 여부는 다시 확인하고 사용 후 공유 프리뷰 링크 회수.
