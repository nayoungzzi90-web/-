# Lovable → Claude Code 이전 및 운영 QA 계획

## A. 코드 원본 확보 (개발 도구 전환의 첫 관문)

1. Lovable **실제 앱 프로젝트**에서 GitHub 연결/비공개 저장소로 내보내기. 연결된 Git의 실제 브랜치·remote·커밋 식별.
2. 코드 다운로드만 된 경우 `/src`, `/public`, `package.json`, `bun.lock`, `/docs`, `/supabase`, `AGENTS.md`, Vite/TanStack config 포함 여부 확인. `git status`, 빌드 가능성 확인.
3. Lovable Git 연결 시 기존 `AGENTS.md` 규칙에 따라 force push/기존 커밋 수정/브랜치 동기화 무시 금지. Claude Code는 새 작업 브랜치에서 작업하고 확인 후 merge.
4. 본 패키지의 `CLAUDE.md` + `PROJECT_HANDOFF.md` + `AI_EXPERT_HYBRID.md` + `MIGRATION_AND_QA.md`를 앱 저장소 루트에 둔다. `reference_specs` / `reference_prototypes`는 앱 루트 하위 `handoff/`로 이동하여 **참고 전용**이라고 표기한다.
5. 외부 서비스를 올리기 전 GitHub Actions CI(테스트·빌드·린트) 도입하되 운영 배포 시크릿 부재 상태로 작동.

## B. DB·로그인·결제 이탈 위험

- Lovable Cloud auth/storage/Supabase URL/service_role에 **새 호스팅에서 접근 가능한지** 확인. 기존 공급업체의 Cloud 권한/계정 소유권이 유지되는지 확인.
- 필요하면 사용자 소유 Supabase 프로젝트로 **먼저 schema + RLS + SQL function + Index + 트리거를 구조화된 migration**으로 가져오고, 민감정보 이전은 별도 합의 및 암호화 백업/점검 후.
- 데이터 이전 전 백업 검증: auth users, profiles, birth_profiles, wallets, unlocked_readings, invite_codes/rewards, reading_price_catalog, 결제/원장 데이터(존재 시). 개인정보 백업/수명 정책 적용.
- 원본/타깃의 user ID, auth identity, OAuth redirect, RLS 정책, 서비스/anon 권한, storage bucket, PG 웹훅, API key를 mapping. 부정확한 가입자 복제나 인증 우회 금지.
- `wallets` 직접 UPDATE 금지: `spend_coins`, `apply_invite` 등 SECURITY DEFINER RPC와 원장/멱등 키 보존.
- R015 운영 SQL은 아직 리뷰 전용이다. 기존 서버 코드의 `production fail-closed` 동작 때문에 **RPC 설치·pepper 구성 전 공개 배포하면 서비스가 사용 불가일 수 있음**. 사용자 승인 없이 SQL/키/배포를 적용하지 않는다.
- 세금/약관/환불/PG 테스트·실결제 검증은 제품 출시 전 독립 게이트. P0/P1 판매 활성화 금지.

## C. 명리·품질

- 실제 현재 앱의 만세력 범위 1900~2026 및 역사시 경계·KASI 교차 확인, 음력 변환 46,386건 기록·원본 입력 보존.
- R-002~009에 `SOURCE_MISSING`을 유지, R-013 120 케이스 원전 교감 전 용신 확정 문구 차단.
- LLM 연결/모델 비용·품질 점검은 테스트 입력으로만, paid entitlement/결제 발생 금지.
- 사용자 발급 리포트에는 사용된 engine/rule/prompt/model 버전과 evidence_id 저장; 같은 구매 리포트 재조회 시 내용 불변.

## D. 테스트 분류 및 게이트

| 단계 | 필수 검증 | 현재 증거 |
|---|---|---|
| 로컬 빌드 | package install, typecheck, test, build | 기존 Lovable 빌드/테스트 일부 통과, Claude Code 환경 미재실행 |
| 만세력 | 입춘/12절/KST/DST/윤달/자시 ±120초 | 기존 R001 문서 참조, 공식 live 교차 미완료 |
| 인증 RLS | A/B 실 JWT, anon, cross-user, wallet | 격리 staging 34/34 PASS / anon 5/5 |
| 영속 요청 제한 | no-spoof 11 연속, seed9+10 동시 | hosted staging 10×200/1×429, 1×200/9×429 PASS |
| 프록시 | edge가 사용자가 넣은 header를 strip/override | **미검증**, trusted header unset 유지 |
| 독립 앱 2프로세스 | 다른 PID·같은 staging Postgres RPC, 동시 quota | **미실행**, 로컬 SQLite smoke는 별개 |
| 권한 최소화 | anon revoke, authenticated 최소 grant | staging PASS, **운영 리뷰 SQL 미적용** |
| 결제/원장 | 원자 차감·멱등 결제·환불/재시도 | 설계/일부 foundation, 운영 미승인 |
| 전문가 명리 | R006/009/010/011/013, R015 G0~G6 | 추가 원전·전문 검수 필요 |
| 운영 롤아웃 | 개인정보/백업/복구/롤백/PG/승인 | **NO_GO** |

## E. 다음 5개 커밋 예시 (모두 비공개 dev/stage)

1. `chore: import handoff and document environment` — 변경 없이 현상 기록/README/AGENTS 충돌 확인.
2. `test: baseline regression and critical paths` — 빌드 및 실사용자 데이터 무접촉 테스트.
3. `refactor: isolate Lovable runtime coupling` — Lovable 전용 모듈 대체 설계 및 스테이징 차단 가드, 모바일 UI 보존.
4. `test: two-process staged shared quota` — 각자 독립 서버 프로세스 vs 실제 staging PostgreSQL; 원자 카운터/cleanup.
5. `feat: evidence-gated interpretation foundation` — R001~R015 구조화된 근거/claim 유보, GPT/Gemini mock 어댑터.

커밋 순서는 예시다. 전 단계 테스트 통과, 사용자 확인을 거쳐 다음으로 이동한다.

## F. 각 작업의 완료 보고 양식

```text
[작업 범위]              staging / local / production
[변경 파일]              ...
[DB 변경]                none / staging only / explicitly approved production
[테스트]                 test counts + logs + evidence
[미검증/차단]            NO_GO items
[회귀 영향]              none / known limitations
[롤백]                   commit revert or migration revert
[다음 1개 단계]          ...
```
