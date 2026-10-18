# Lovable 프로젝트 가져오기 · R001/R015 확인 · 만세력 엔진 교차 검증 (2026-10-18)

## 가져온 것
- `lovable-app/` : Lovable에서 만든 TanStack Start 프로젝트 전체(소스, docs의 R001·R015 문서와 REVIEW_ONLY SQL, roadmap.md, AGENTS.md).
- 제외한 것: `.env`(공개용 키만 있었지만 공개 저장소라 올리지 않음), `node_modules`, 빌드 산출물.
- 코드 변경 없음. 운영 DB·결제·배포 변경 없음. 이 저장소는 **공개(public)** 이므로 R015 감사 문서의 staging 프로젝트 ID 등이 공개된다는 점에 유의.

## 실행 결과 (임시 폴더에서 `npm install --legacy-peer-deps`)
- 테스트 55/55 통과 (R015 문서의 수치와 일치), 타입 검사 통과, 빌드 성공.
- 린트 627건(오류 621: 620건은 prettier 모양, 경고 6).
- `bun install --frozen-lockfile` 실패: `bun.lock` 의 101개 주소가 Lovable 비공개 저장소(403).

## R001 (만세력·음력)
- 보존: 엔진 `src/lib/saju-engine.server.ts`, 음력 변환 `lunar-conversion.server.ts`, 저장 구조 `birth-persistence.server.ts`, 관련 테스트.
- 남은 것: KASI 공식 API 대조(서비스키 필요), DE440s 직접 검증, 2027년 이후, 해외 출생·진태양시, 시간법 출처 대조.

## R015 (인증·RLS·요청 제한)
- 상태: 운영 NO-GO. staging 검증만 통과(합성 SQL, 실제 JWT 2인 34/34, 로컬/공유 프리뷰 HTTP).
- 운영 전 필요: 운영 DB에 SQL 2건 적용(별도 승인), `RATE_LIMIT_PEPPER` 32자 이상, 프록시 신뢰 헤더 검증(전까지 `TRUSTED_CLIENT_IP_HEADER` 설정 금지), 다중 서버 quota 공유 검증.
- 코드와 SQL 일치 확인: 앱이 호출하는 `saju_rate_limit_hit(p_scope, p_identity_hash) → boolean` 과 리뷰 SQL 시그니처가 같고, 한도(30/10)는 DB에 고정.

## 우리 만세력 엔진 ↔ Lovable 엔진 교차 검증
정책을 맞춰 비교: 우리 `ziHour: MIDNIGHT`, `timeBasis: ERA_WALL_CLOCK` (서울 법정 벽시계, 서머타임 포함).
도구: `engine/manse/tools/crosscheck/*.ts` (`npx tsx`, Lovable 의존성 설치 필요).

| 비교 | 건수 | 연·월·일·시주 불일치 |
|---|---|---|
| 1900~2026 매일 × 3개 시각(03:30, 15:30, 23:30) | 139,148 | **0** |
| 모든 12절 앞뒤 ±30분 내 14개 시점(1901~2025) | 21,000 | 617건 — 전부 절입 경계 보호구간이며 한쪽 이상이 "검토 필요"로 표시. 표시 없이 어긋난 경우 **0** |

- 두 엔진은 독립 구현(Lovable: astronomy-engine, 우리: DE421 기반 자체 표)이라 서로 교차 검증이 된다.
- 정책을 다르게 두면 일치하지 않음(예: `KST_PLUS9` 에서는 23시대 일주·시주, `ERA_STANDARD` 에서는 1948 등 +8:30 시기 시주가 달라짐). 정책 차이이며 계산 오류가 아님.
- 이것은 두 엔진끼리의 일치이지 KASI 공식 확인이 아니다.
