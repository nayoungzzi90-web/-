# 인수인계 문서 (원문 보관, 2026-10-29 입력)

사용자가 제공한 Claude Code 인수인계 패키지 5개를 **원문 그대로** 둔다. 수정하지 않는다.

| 파일 | 내용 |
|---|---|
| `PROJECT_HANDOFF.md` | 프로젝트 식별, 상품·정책, 앱 기술 구성, R-001 상태, R-001~015 요약, 보안 감사 결과, 로드맵 |
| `CLAUDE.md` | Claude Code 작업 지침(절대 규칙) |
| `AI_EXPERT_HYBRID.md` | GPT 작성 + Gemini 감수 + 결정론 검증 설계(B안) |
| `MIGRATION_AND_QA.md` | Lovable → Claude Code 이전·QA 계획 |
| `FIRST_PROMPT.md` | 처음 붙여넣을 프롬프트 |
| `START_HERE.md` | 인수인계 시작 안내(이전 순서, 데이터 이관 금지선) |
| `CONFLICTS_WITH_CURRENT_DECISIONS.md` | **원문과 이후 사용자 결정·현재 코드 사이의 차이** (작업 전에 반드시 확인) |

## 중요
- 이 폴더의 `CLAUDE.md`는 **저장소 루트에 두지 않았다.** 원문의 가격·재화(냥)·추천 정책이 그 뒤의 사용자 결정(900원·엽전/닢·초대 보상 1닢)과 달라서, 그대로 활성화하면 이후 작업이 옛 정책을 따른다. 차이를 정리한 뒤 사용자 승인으로 루트에 둔다.
- 원문이 가리키는 `handoff/reference_specs/…`, `handoff/reference_prototypes/…`, `docs/` 안의 일부 파일은 이번에 제공되지 않았다(목록은 `CONFLICTS_…` 마지막 절).
- 원문에 적힌 Supabase 프로젝트 식별자는 접속 키가 아니지만, 저장소가 공개인 동안은 노출을 줄이려면 비공개 전환을 권한다.

## 보류한 자료 (공개 저장소 문제)
`START_HERE.md`가 "보안상 **공개 저장소 사용 금지**"라고 명시한다. 이 저장소(`nayoungzzi90-web/-`)는 **공개**다. 그래서 사업 전략·가격 정책이 담긴 **PRD v1.0**과 **Lovable 12단계 개발 프롬프트**는 두 번 올려주셨지만 저장소에 넣지 않았다. 저장소를 비공개로 바꾼 뒤 `docs/handoff/reference_specs/`에 넣는다. (복원 마스터·R-015 명세는 이미 들어 있는 파일과 바이트 단위로 동일해 중복 입력하지 않았다.)
