# 만세력 라이브러리 평가표 (미완료)

현재 앱은 `src/lib/saju/sampleCalculator.ts`(verified=false)로 동작합니다. 정식 공개 전 아래 항목을 사람이 확인한 뒤 `ChartCalculator` 어댑터로 교체하세요. **외부 검증은 완료되지 않았습니다.**

| 항목 | 후보 A | 후보 B | 확인 방법 |
|---|---|---|---|
| 상업 이용 라이선스 | 미확인 | 미확인 | 라이선스 원문 보존 |
| 런타임(브라우저/Edge) | 미확인 | 미확인 | Supabase Edge Function(Deno)에서 실행 테스트 |
| 음력·윤달 변환 | 미확인 | 미확인 | 한국천문연구원 기준 대조 |
| 절기 시각(입춘 등) 분 단위 | 미확인 | 미확인 | 경계값 20건 |
| 자시/야자시 규칙 | 미확인 | 미확인 | 채택 규칙을 `rules_version` 에 명시 |
| 대운(시작 나이·순역행) | 미확인 | 미확인 | 전문가 검수 |

## 검증 케이스 관리 구조 (제안)
`tests/fixtures/chart_cases.json` 에 `{ id, input, expected_pillars, source, source_url, boundary:boolean, reviewer, verified_at }` 를 50건 이상(경계값 20건 포함) 쌓고, 어댑터 교체 시 전부 통과해야 유료 출시를 허용합니다.

## 샘플 드라이버의 알려진 한계
- 절기를 매년 같은 양력일로 근사 → 절기일 ±1일은 `term_boundary_unverified` 경고
- 음력/윤달, 대운 미지원 (`LUNAR_UNSUPPORTED`, `luck_cycles_unavailable`)
- 서머타임·경도 보정 미적용
