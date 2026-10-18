# 로컬 실행 (Lovable 밖)

- Node 22 이상. `bun.lock` 이 Lovable 비공개 저장소 주소(101곳)를 가리켜서 `bun install --frozen-lockfile` 은 밖에서 403 으로 실패한다.
- 대신: `npm install --legacy-peer-deps` → `npm test` / `npx tsc --noEmit` / `npm run build` / `npm run dev`.
- `.env` 는 저장소에 없다. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 를 직접 넣는다(서비스 롤 키는 서버 환경변수로만).
- `bun.lock` 은 Lovable 동기화에 쓰이므로 일부러 건드리지 않았다.

## KASI 공식 24절기 대조 (R-001)
`scripts/kasi-verify.mjs` — 공공데이터포털 '한국천문연구원 특일 정보' 24절기 API ↔ 우리 엔진(`scripts/term-reference.json`, `gen-term-reference.ts` 로 재생성). Node 18+ 만 있으면 되고 의존성 없음.
```
KASI_KEY='발급받은 일반 인증키(Decoding)' node scripts/kasi-verify.mjs 2025 2050
```
- 이 클라우드 세션의 네트워크는 apis.data.go.kr 를 막고 있어(403) 실제 호출은 **사용자 PC** 에서 한다. 키는 채팅·깃에 남기지 않는다.
- 응답 형식(`kst` 시각 필드 유무)은 아직 확인하지 못했다. 스크립트는 첫 응답 한 건을 출력하고, 시각이 없으면 날짜만 비교한다. 로컬 가짜 서버로 비교 로직만 시험했다(실제 API 호출 0회).
