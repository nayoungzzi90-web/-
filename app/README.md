# app — 오행 친구들 새 프로젝트

Lovable 없이 새로 만드는 프로젝트(TanStack Start, Cloudflare Workers). 옛 `lovable-app/`은 이 폴더가 같은 일을 할 때까지 그대로 둔다.

## Cloudflare 배포 설정 (Worker 이름 `ohaeng-friends`)
- 프로덕션 분기: `claude/keen-goodall-f4o7r9`
- 루트 디렉터리: `/` (명령에서 `cd app` 으로 이동)
- 빌드 명령: `cd app && npm install --legacy-peer-deps && npm run build`
- 배포 명령: `cd app && npx wrangler deploy`
- 버전 명령: `cd app && npx wrangler versions upload`
- Worker 이름은 `vite.config.ts` 의 `name` 과 대시보드 이름이 같아야 한다.
- `npm ci` 는 잠금 파일이 맞지 않아 쓰지 않는다.

## 환경변수
무료 체험(입력·결과·궁합·복주머니)에는 필요 없다. AI 풀이 시범(`/ai-trial`)을 켤 때만 `AI_READING_MODE=trial`, `AI_TRIAL_TOKEN`(Secret), `OPENAI_API_KEY`(Secret), `AI_MODEL`, 원가 변수를 넣는다(`src/lib/ai-trial.server.ts` 참고). 키는 채팅·코드에 붙여넣지 않는다.

## 점검
`npx vitest run`, `npx tsc --noEmit`, `npx eslint src`, `npx vite build`, `node scripts/sync-reading-core.mjs --check`
