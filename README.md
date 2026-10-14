# 오행 친구들 (사주 웹서비스)

PRD v1.0 기준 모바일 우선 React + TypeScript 웹앱입니다. **현재는 샌드박스(Mock) 구현**이며 실제 결제·개인정보 수집·실제 AI 호출은 모두 꺼져 있습니다.

```bash
npm install
npm run dev        # http://localhost:5173 (개발 모드에서는 궁합 화면이 샌드박스로 열림)
npm test           # 계산·원장·추천·결제·접근제어 규칙 테스트
npm run build
```

## 구성
- `src/lib/saju` — `ChartCalculator` 인터페이스, **샘플 드라이버(미검증)**, 십성/합충 규칙
- `src/lib/content` — 캐릭터 10종(결정론 규칙), 오늘의 운세(규칙형+캐시), 리포트 생성기(Mock)+자동 QA
- `src/lib/mock` — 서버 로직의 참조 구현(업전 원장, 추천, 결제 승인 검증, 리포트 작업, 30일 삭제). localStorage 저장
- `supabase/migrations/0001_init.sql` — 실제 스키마·RLS·`redeem_coins` (**아직 실행·검증 안 됨**), `supabase/tests/rls_tests.sql`
- `docs/RELEASE_GATES.md` — 출시 차단 조건, `docs/LIBRARY_EVALUATION.md`

## 실서비스 전환 시 해야 할 일 (사람의 작업)
별도 소유의 Supabase 프로젝트 생성 → 마이그레이션 적용·RLS 테스트 → `lib/mock` 호출을 Edge Function/RPC 로 교체 → OAuth 키·redirect 허용 목록 설정 → 만세력 라이브러리 검증 → PG 계약 → 법률 검토. 자세한 목록은 `docs/RELEASE_GATES.md`.
