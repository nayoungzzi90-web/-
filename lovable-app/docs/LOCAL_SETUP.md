# 로컬 실행 (Lovable 밖)

- Node 22 이상. `bun.lock` 이 Lovable 비공개 저장소 주소(101곳)를 가리켜서 `bun install --frozen-lockfile` 은 밖에서 403 으로 실패한다.
- 대신: `npm install --legacy-peer-deps` → `npm test` / `npx tsc --noEmit` / `npm run build` / `npm run dev`.
- `.env` 는 저장소에 없다. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 를 직접 넣는다(서비스 롤 키는 서버 환경변수로만).
- `bun.lock` 은 Lovable 동기화에 쓰이므로 일부러 건드리지 않았다.

## KASI 공식 24절기 대조 (R-001)
`scripts/kasi-verify.mjs` — 공공데이터포털 '한국천문연구원 특일 정보' 24절기 API ↔ 우리 엔진(`scripts/term-reference.json`, `gen-term-reference.ts` 로 재생성). Node 18+ 만 있으면 되고 의존성 없음.
```
KASI_KEY='발급받은 일반 인증키(Decoding)' node scripts/kasi-verify.mjs 2000 2027
```
- 이 클라우드 세션의 네트워크는 apis.data.go.kr 를 막고 있어(403) 실제 호출은 **사용자 PC** 에서 한다. 키는 채팅·깃에 남기지 않는다.
- 응답 형식은 KASI 공식 활용가이드 v1.4 로 확인했다: 항목 `locdate`(YYYYMMDD), `dateName`, `dateKind`(03=24절기), `kst`(HHmm, 뒤에 공백이 붙기도 함), `sunLongitude`. 요청 파라미터는 `solYear`(필수)·`solMonth`·`ServiceKey`·`_type=json`·`numOfRows`.
- **중요:** 24절기 데이터는 연 1회(11월경) 갱신되므로 **2028~2050년은 API 에 없을 가능성이 크다.** 이 API 로 대조 가능한 범위는 과거~내년 정도이고, 몇 년부터 데이터가 있는지는 실제 호출로 확인해야 한다. 로컬 가짜 서버로 비교 로직만 시험했고 실제 API 호출은 0회다.

## 기능 스위치(서버 환경변수, 기본 모두 꺼짐)
- `PAYMENTS_MODE` = `disabled`(기본) | `sandbox`(가짜 승인, 테스트) | `live`(실제 PG — 아직 구현 없음, NOT_CONFIGURED)
- `ACCOUNT_DELETION_ENABLED` = `true` 일 때만 회원 탈퇴가 실제로 동작(정책 승인 전까지 켜지 않는다)
- `RATE_LIMIT_PEPPER`(32자 이상), `TRUSTED_CLIENT_IP_HEADER`(프록시 검증 전 설정 금지) — `docs/R015_*` 참고
