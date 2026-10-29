# 오행 친구들 — Claude Code 통합 인수인계 문서

**업데이트 기준: 2026-10-30 / Lovable 프로젝트 파일 읽기 + 이전 결정 기록 및 제공된 명세**

## 1. 프로젝트 식별 및 인수인계 범위

- 사용자 서비스명: **오행 친구들** (영문/코드상 Hanji Fortune Fables, 예전 프로젝트 명 Fortunes Found; Lovable 화면 표기는 변경 가능).
- 실제 앱 Lovable 프로젝트 ID: `a7377037-44b1-44a0-9424-62e9977d9186`; 편집 링크: https://lovable.dev/projects/a7377037-44b1-44a0-9424-62e9977d9186
- 최신 읽기 전용 점검 당시 앱 `is_published=false`; `supabase/config.toml` 실제 앱 project_id: `lwxntswrbqqfvxymwynp` (환경 종속 식별자, **접속 키 아님**).
- 별도 R015 QA 샌드박스: `f18ad423-6cc1-4cae-a366-f0ca9939bd6e`, Supabase ref `ewuiedtpnhmkzdohwdji` (실제 앱/운영 데이터와 섞지 말 것); 이전 조회 당시 staging 웹사이트 `is_published=true`, audience public였으므로 현재 재확인 및 필요 시 비공개화.
- 실제 앱 Git 소스가 **이 ZIP에 포함되어 있지는 않음**. 사용자는 Lovable GitHub 내보내기/코드 다운로드 후 해당 소스 옆에 본 문서를 배치한다.
- 참고 정통 명리 원전 기반 설계 원본/요약 복원은 `reference_specs/OHENG_R001_R015_RESTORED_MASTER.md`. R-002~009 세부 원문 미확보라고 자체 고지되어 있음.

## 2. 제품 목적·이용자·브랜드

- 20~40대 여성 중심. 무료 사주 캐릭터로 진입해 바이럴 공유·친구 초대·오늘의 운세 재방문으로 성장시키며, 유료 기본·궁합·연애·심층 콘텐츠를 제공.
- 캐릭터 일간 10종(甲乙丙丁戊己庚辛壬癸), 표정·소품·칭호 변형. 동일 명식+버전 → 동일 캐릭터 결과.
- 시각 디자인: 귀여운 조선풍·한지·민화 감성, 독창적 일러스트, 모바일 우선. 제안 토큰: 미색 `#F8F2E6`, 먹색 `#302C2B`, 적갈 `#8A3F3B`, 청록 `#2F7168`, 남색 `#33495D`, 금색 `#B48A44`(디자인 확정값 아닌 제안/접근성 검증 필요).
- 캐릭터 공유 카드: 캐릭터 이미지+칭호+짧은 설명+친구 추천 링크. 원국 전체/출생시각·이메일·결제 정보 기본 공개 금지.
- PRD는 이상적 제품 설계, 실제 앱은 일부만 구현; 둘을 혼동하지 않는다.

## 3. 상품/가격/보관 기준 (현재 PRD v1.0)

| 출시 우선 | 상품 | 금액 | 업전(냥) | 콘텐츠 |
|---|---|---:|---:|---|
| P0 | 나의 사주 캐릭터 | 무료 | - | 10일간, 성격/강점/약점/공유 |
| P0 | 오늘의 운세 | 무료 | - | 한국 날짜 기반 오늘 흐름·작은 행동 |
| P0 | 기본사주 | 990원 | 4 | 1,800~2,500자 |
| P0 | 궁합 | 990원 | 4 | 1,500~2,000자, 30일 보관 |
| P0 | 심층 연애운 | 3,900원 | 12 | 4,000~5,000자, 현재 역년 포함 연속 5년 |
| P1 | 택일 | 4,900원 | 15 | 기간 내 후보일 비교, 상세 게이트 필요 |
| P1 | 심층사주 | 5,900원 | 18 | 7,000~9,000자, 격국·대운·세운 포함 |

- 심층 연애운 2026 조회 시 2026~2030. 결과 생성 시점의 리포트는 연도 변경 후에도 자동 재생성하지 않음.
- 궁합 입력·결과 30일 보관 후 삭제 정책(백업/로그 삭제·동의·법무 검증 필요); 기타 유료 리포트 계정 유지 기간 저장·재열람, 삭제 요청/탈퇴 시 처리 필요.
- 회원: 비회원 무료 경험 후 구매 직전 로그인(카카오·구글·이메일). 출생시간 미상 허용, 시주 임의 추정 금지.
- PG 후보: 토스페이먼츠. 실제 계약·테스트키·금액검증·웹훅·환불 구현/승인 전 현금 수납 활성화 금지.
- 추천: 유효한 신규 회원의 무료 캐릭터 체험 + 검증된 신규 가입 후 추천인에게 2냥, **일 5건/월 30건 상한**(한국 시간 기준). 동일 대상 중복/셀프 추천·봇·계정 악용 방지, 원장 멱등. 미확정 보상 기간/취소 정책은 활성화 금지.

## 4. 현재 실제 앱 기술 구성 (Lovable 저장소 읽기 기준)

- React + TypeScript + TanStack Start/Router, Vite, Supabase/Lovable Cloud. 락파일 `bun.lock`, `package.json`은 npm 스크립트와 Vitest. `@lovable.dev/cloud-auth-js` 등 Lovable 런타임 종속성 발견 → 이탈 전 대체/호환성 확인.
- 계산: `src/lib/saju-engine.server.ts`가 `astronomy-engine`으로 12절기 계산. `src/lib/lunar-conversion.server.ts`가 `korean-lunar-calendar` 기반 음양력 변환. UI/서버 연결은 `src/lib/saju-fns.ts`와 폼 `src/components/BirthForm.tsx`.
- DB/인증: `src/lib/user-fns.ts`, `src/integrations/supabase/client.server.ts`, `src/start.ts`, `auth-middleware.ts`. `AGENTS.md`의 명시 사항은 사용자 관련 데이터 서버 함수 경유 + RLS, 냥 지갑/초대는 SQL SECURITY DEFINER 함수를 통한 갱신만 허용.
- 보안: `src/lib/rate-limit.server.ts` 및 `src/lib/saju-fns.ts`. 운영 모드는 영속 RPC/비밀값 실패 시 fail-closed; 개발 preview에서는 메모리 대체가 가능하지만 보안 보증 아님.
- 앱 화면 파일: `src/routes/`에 `index`, `input`, `character`, `today`, `auth`, `basic`, `compatibility`, `love`, `invite`, `my`; `src/components/Paywall.tsx` 등. 각 화면이 진짜 유료 콘텐츠를 생성·판매할 수 있다는 증거는 아님.
- 라이브러리·라이선스: `astronomy-engine` MIT; Swiss Ephemeris는 비교 검증에서만 참조(상업 앱에 AGPL 이슈 없이 자동 포함 금지). 지역/절기·DST 경계 테스트 필수.

## 5. R-001 사실 계산 상태·검증 범위

- **실제 앱** `docs/R001_PRECISION_AUDIT_2026-10-16.md`: 지원 한국 양력 법정시 1900~2026. 참조 구현 명세에는 1900~2100 등의 목표 범위가 있으나 **현재 앱에서 2100년까지 지원한다고 주장하면 안 됨**.
- `astronomy-engine SearchSunLongitude` 기반 절입. 입춘=315°, 경칩=345°, 청명=15°, 입하=45°, 망종=75°, 소서=105°, 입추=135°, 백로=165°, 한로=195°, 입동=225°, 대설=255°, 소한=285°.
- 법정시 `Asia/Seoul`, 한국 역사적 DST 반영 정책. 날짜 경계 `midnight` 기본; `zi23` 서버 옵션은 UI 미노출. 출생시간 미상은 불확실 상태 관리.
- 이전 감사: KASI 공개 2025~2027 36절기 표본 비교 36/36 ≤60초, 최대 59.5초, 참고 공개 데이터가 초 단위 권위/법정 원본 확정은 아님. Swiss/Moshier 1900~2027 1,536건 비교 최대 51.16초(참조 비교 환경만).
- 음력 윤달 변환: `korean-lunar-calendar`↔`kor-lunar` 46,386 날짜 교차 불일치 0건 기록. 공식 KASI 음양력 API **실시간 대조 미완료**. 출생 입력 원본 보존과 표준 양력 변환 저장 구조 코드/DB 다시 대조 필요(옛 roadmap 일부 체크 미반영).
- **`finalApproved=false`** 유지. 절입 경계 ±120초는 검토 필요. 해외 출생/진태양시/1970 이전 역사시/부정확한 달력 지원 상태 점검. 원국 확정 기반 유료 자동 리포트는 미승인.

## 6. R-001~R-015 명리 규칙 현황 요약

**채택 원칙은 학술·구현·운영 승인과 구분**. 자세한 내용은 동봉 복원 마스터 원문 참고.

| ID | 책임 | 출력/금지 | 상태 참고 |
|---|---|---|---|
| R001 | 천문 절입·사주 4주·달력·법정시 | 검증된 원국 사실, 불명확 시 검토 | 앱 후보 구현, finalApproved=false |
| R002 | 월령/계절 오행 세력 | 득령과 최종 신강 구분 | 채택 원칙, 상세 원문 일부 미확보 |
| R003 | 지장간/사령 분일 | 출처·절입 경계·이견 저장 | B형 분일표 검증 대기 |
| R004 | 통근·득지 | 근·합충 영향을 증거로 기록 | 상세 원문 미확보 |
| R005 | 천간 6쌍 생극설·소모·천간합 | 살인상생/식신제살/재극인 후보 | DRAFT-2 채택, 전수 검증 대기 |
| R006 | 신강·신약·중화 | 임의 점수 합산 금지, 후보·반증 | 강약 경계 전문가 검증 대기 |
| R007 | 일반 격국 후보 | 월지 본기만으로 최종 확정 금지 | 상세 원문 일부 미확보 |
| R008 | 투출·회합·잡기 후보 | exact/related/합화 구분, 辰戌丑未 | 참조 TS 코드 존재, 운영 승인 아님 |
| R009 | 건록·월겁·양인·종/가종격 | 복수 후보 허용, final_pattern=null | 참조 TS, 성립 조건 미검증 |
| R010 | 성격·파격·구응·겸격 | 근거·반증·조건별 격국 판정 | 원문 존재, 추가 검증 |
| R011 | 격국용신·상신 | 승인된 격국 전제, 후보·파상신 | 원문 존재, 운영 확정 금지 |
| R012 | 억부용신 후보 | 강약/관살/재성/인성 맥락, 단일 확정 금지 | DRAFT 명세/TS 참조 |
| R013 | 조후·통관·병약 | 10천간×12월령 120색인 후보 | 원전 교감·전문가 검토 미완료 |
| R014 | 다섯 도메인 종합·충돌 | 근거 연결/보류, 단일 최종 용신 강제 금지 | 참조 TS·운영 조건 미완료 |
| R015 | R001~14 감사, 계산 QA, 전문가·보안·운영 게이트 | NO_GO/LIMITED_GO/GO | 명세 DRAFT, 운영 NO_GO |

R015 게이트: G0 입력/개인정보, G1 천문, G2 기초 규칙, G3 해석 claim, G4 전문가 서명, G5 RLS/권한/결제, G6 운영 백업·롤백. 상태 전이는 `policy_accepted → source_checked → implemented → unit_verified → expert_reviewed → integrated → release_approved`, 중간 생략 금지.

## 7. AI 해석 B안 전문가형 하이브리드 (사용자가 선택한 방향)

- **계산/규칙 엔진(결정론적)**: immutable `SajuFacts` → 출처/버전 연결된 `InterpretationFacts` → 승인된 claim 목록. 원국/간지 계산은 GPT/Gemini가 책임지지 않는다.
- **GPT**: 근거와 목차를 준수해 한국어 상담 리포트 초안 생성. 미승인 해석·출생시간 미상 시주·확정적 미래 예언 생성 금지.
- **Gemini**: 동일 사실·승인 규칙·초안으로 독립 검토; 원국 불일치, 근거 없는 단정, 문단 간 모순, 상품 분량, 전문가 검수 기준을 검사.
- **검증 게이트**: JSON Schema, evidence_id/claim_id 매핑, 사용되지 않은 사실/금지 문구/모델 간 충돌 처리. `PASS`만 저장·제공, `REVIEW`는 수정/검수, `BLOCK`은 발급 차단·복구/환불 흐름으로 분리.
- GPT+Gemini의 의견 일치가 명리 이론의 과학적 예측 정확성을 검증하지 않는다는 고지를 유지.
- 구체 모델 버전·API 가격·요청 비용·병렬화·호출 빈도·개인정보 외부 전송 정책은 **아직 시험/검증할 설계 항목**. 모델 이름을 특정 버전으로 고정하거나 자동 과금 시작 금지.

## 8. R-015 보안 감사: PASS와 NO_GO를 정확히 구분

- **격리 Staging DB**: rate RPC 원자 카운터/최소권한 SQL/합성 역할 분리 검증 완료(운영 아님). `pgtap` 지원 불가로 SQL ASSERTION 대체.
- **실제 Staging JWT**: 두 합성 사용자의 실토큰 A/B RLS·자기행/타인행·지갑·변조토큰 **34/34 PASS**; 작업 후 auth users / profiles / wallets 0건. 익명 SDK 접근 **5/5 PASS**.
- **Staging 로컬 단일 서버**: 10회 허용/11번째 제한, seed9+동시10 중 1회 허용, fail-closed, 본문 1024바이트 제한, header allowlist, 단위 테스트 최대 30/30 PASS.
- **Staging 호스팅 게스트 프리뷰**: 정상(위조헤더 없는) 11회 실제 HTTP → 10×200+1×429, unknown DB count11; 9개 시드+동시10 → 1×200+9×429, unknown DB count19. 이전 혼합 위조헤더 6×200/5×403은 edge 선차단으로 분리 기록됨. `cf-connecting-ip` 위조 응답은 앱 마커 없는 HTML403(프록시 성질 확정 아님).
- **독립 앱 2프로세스+동일 Staging Supabase RPC**: **NOT RUN**. Lovable 크레딧 소진으로 추가 실행 차단. 별도 로컬 SQLite 2프로세스 모의 smoke PASS는 **진짜 staging PostgreSQL 2프로세스 증거가 아님**.
- **신뢰 프록시 헤더 재작성/제거(STRIP/OVERWRITE)**: **NOT VERIFIED**, `TRUSTED_CLIENT_IP_HEADER` 미설정 유지. 잘못된 클라이언트 IP 헤더를 그대로 신뢰하지 않음.
- **운영 Supabase**: public 6개 테이블 RLS 활성, anon/authenticated 표 수준 GRANT 과다(리뷰 SQL 미적용), `saju_rate_limit_hit` RPC 운영에 없음, 코드가 배포되면 fail-closed 가능. `docs/migrations/REVIEW_ONLY/R015_SAJU_RATE_LIMIT_REVIEW_ONLY.sql` 및 `R015_LEAST_PRIVILEGE_REVIEW_ONLY.sql` 절대 자동 실행 금지.
- **읽기 전용 운영 DB 과거 확인**: 출생정보 1건, 기본사주·궁합 카탈로그 상품 active=false. 회원/냥 실제 데이터 이관 전 재검증 필요. 특정 운영 DB의 현재 레코드 수는 후속 시점에서 달라질 수 있으니 고정 전제 금지.
- **현재 출시 NO_GO**. 보안 테스트 PASS=명리 리포트 운영 GO 아님.

## 9. 운영 우선순위와 개발 로드맵

### Phase A — Claude Code 인수인계·로컬 복원
1. Lovable 실제 앱 전체 코드/에셋/락파일/현재 migration Git export. Git remote/브랜치 확인 및 백업 태그.
2. 앱 의존성 설치/최소 실행/단위 테스트/타입·빌드 검증. 테스트 실패 시 가장 작은 영향 범위로 원인 정리.
3. 서버 시크릿/프론트 공개 env 분리, Supabase 백엔드 소유권/접속·RLS·auth 방식/외부 호스팅 의존성 분석. staging 프로필로만 작동 확인.
4. 실제 구현과 PRD/명리 참조 사양의 차이를 `IMPLEMENTATION_MATRIX.md` 및 `OPEN_DECISIONS.md`로 작성.

### Phase B — R001/규칙 근거 견고화
1. 한국천문연구원 절기 및 음양력 실제 API 교차검증, 역사시/DST/윤달 오류 테스트 강화, 지원연도 범위 확정.
2. R002~009 SOURCE_MISSING 및 R006/009/010/011/013 전문가 검증 필요 조건을 evidence/claim 버전으로 명시.
3. 공통 InterpretationFacts 모델, claim whitelist, 승인된 범위의 캐릭터/미리보기만 연결.

### Phase C — 실제 서비스·AI/B안
1. 오행 캐릭터 무료/오늘의 운세/공유카드, 로그인·결제전 게스트 연결·추천 귀속.
2. GPT 초안 + Gemini 독립 검사 통합(스테이징 샘플, 비용·개인정보·모델버전 측정), 리포트 생성 큐·실패 복구·근거 보기.
3. 업전 원장/중복 보상/권한 부여·결제 PG test 결제/취소/웹훅 검증. 관리자 접근 통제·삭제 정책.

### Phase D — R015 게이트/운영 롤아웃
1. 독립 2-app-process/공통 Supabase rate RPC 테스트, 신뢰 프록시 overwrite 실제 검증. 비밀값·서버 코드 동작 검증.
2. 운영 변경 실행 **전** 실제 GRANT·권한/함수/백업 스냅샷과 READ-ONLY 영향 분석, 안전한 migration/rollback 검토.
3. 명리학 전문가 승인과 법률·약관·개인정보·실제 과금/환불/로그/재해복구 검수; 기능별 `NO_GO/LIMITED_GO/GO` 문서 서명.
4. 모든 게이트 완료 및 사용자 명시 승인 후 제한 베타 → 운영 배포.

## 10. 주요 갈등·불확실성 목록

- 앱 README·roadmap에는 옛 명칭/완료 체크가 남아 있을 수 있음; 날짜로만 구현 완료를 확정하지 말 것. 실제 코드/DB 검증 필요.
- 독립 명리 참조 코드 R008~R014는 현재 Lovable 앱에서 직접 import되어 있다고 보장되지 않음. reference_prototypes를 prod 코드로 무단 복사하지 말 것.
- PRD v1은 장차 도달할 제품 정책 기준선; 현재 앱에 `coin_ledger`, `orders`, `reports` 등이 실제 테이블로 모두 존재한다고 가정하지 말 것.
- 원전·한국 시간대·정밀 달력·합화/용신·주장 가능한 미래 예측은 이론·정책·데이터 검증이 다르다. 모델 합의는 과학적 실증이 아님.
- 기존 Lovable Cloud 백엔드가 외부 앱에서 어떻게 인증/접속되는지 실험 전에는 DB 이전 가능성과 비용을 단정하지 말 것.

## 11. 가장 처음 Claude Code에게 요청할 산출물

1. `IMPLEMENTATION_MATRIX.md` (컴포넌트·경로·DB·테스트 증거·운영 승인 상태)
2. `MIGRATION_RISK_REGISTER.md` (프로젝트별 종속/DB·auth·hosting/시크릿·업전 원장 영향)
3. `R001_R015_GAP_REPORT.md` (필수 근거·SOURCE_MISSING·검증 대기)
4. `NEXT_5_COMMITS_PLAN.md` (되돌릴 수 있는 소규모 변경 순서, 원래 기능 보존)

첫 실행에서 이 문서 4개를 작성하되 운영 코드·DB·배포는 수정하지 않는 게 안전하다.
