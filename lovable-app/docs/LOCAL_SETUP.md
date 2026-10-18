# 로컬 실행 (Lovable 밖)

- Node 22 이상. `bun.lock` 이 Lovable 비공개 저장소 주소(101곳)를 가리켜서 `bun install --frozen-lockfile` 은 밖에서 403 으로 실패한다.
- 대신: `npm install --legacy-peer-deps` → `npm test` / `npx tsc --noEmit` / `npm run build` / `npm run dev`.
- `.env` 는 저장소에 없다. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 를 직접 넣는다(서비스 롤 키는 서버 환경변수로만).
- `bun.lock` 은 Lovable 동기화에 쓰이므로 일부러 건드리지 않았다.
