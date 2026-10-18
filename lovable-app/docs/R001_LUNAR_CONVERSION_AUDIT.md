# R-001 음력/윤달 → 양력 변환 감사 (2026-10-16)

상태: **시범/검토용, finalApproved=false 유지.** 배포·DB migration·회원 데이터/잔액/구매 이력 변경 없음. 유료 상품 active=false 유지.

## 라이브러리
| 용도 | 패키지 | 버전 | 라이선스 | 사용 위치 |
|---|---|---|---|---|
| 본 변환 (서버 전용) | korean-lunar-calendar (usingsky) | 0.4.0 | MIT | `src/lib/lunar-conversion.server.ts` (`*.server.ts` → 클라이언트 번들 제외) |
| 독립 교차 비교 (테스트 전용) | kor-lunar (kahyou22) | 1.7.0 | MIT | devDependency, `src/test/lunar-conversion.test.ts`만 |

두 패키지 모두 런타임 의존성 없음, 타입 선언 포함. 두 패키지는 모두 KASI 기반 음력 데이터를 내장한 표 방식이므로 **서로 완전히 독립된 원천이 아니며**, 이 비교는 KASI 공식 API 전수 검증이 아님.

## KASI 공식 API
공공데이터포털(data.go.kr/15012679) 서비스키가 없어 **KASI 서버를 호출하지 않았음. live 대조는 pending.** 결과 메타 `independentlyVerified:false`.

## 동작
- `parseBirthInput`(서버): calendar는 정확히 `"solar"|"lunar"`, leap은 boolean만. 음력은 leap 필수.
- 음력: YYYY-MM-DD 숫자 형식 → `setLunarDate(y,m,d,leap)` false면 거부(없는 윤달·작은달 30일·범위 밖) → `getSolarCalendar()` → `setSolarDate` 왕복 재변환이 년/월/일/윤달 모두 일치해야 통과.
- 지원 범위는 **변환된 양력 날짜** 기준 1900-01-01~2026-12-31 (음력 1899년 말 입력도 양력 1900년이면 허용).
- 정책: 연/월주 = 기존 절입 태양황경 엔진, 일주 = 환산된 법정 양력 날짜. 음력 달력 간지(세차·월건·일진)는 사용하지 않음. 입춘·23시·자정(midnight 기본, zi23 opt-in)·서머타임 차단·±120초 검토는 기존 엔진 그대로.
- 결과: `originalBirthCalendar`, `calendarConversion{originalCalendar, originalDate, isLeapMonth, convertedSolarDate, conversionVersion, sourceName, independentlyVerified:false}`.

## 테스트 (vitest 36/36 통과, tsgo 통과)
- 고정 사례: 2025 윤6/1→2025-07-25, 평6/1→2025-06-25, 2026 음1/1→2026-02-17, 2017 윤5/1→2017-06-24, 2017 윤3월·2025 윤1월 거부, 작은달 30일·형식·비boolean leap 거부, 월경계(윤6/29→2025-08-22), 1900/2026 경계, 엔진 연동(입춘 전후·DST 중복·절입일 시간 미상·자정 정책).
- 독립 비교: 음력 1899~2026 전 일자 **46,386건 일치, 불일치 0**, 윤달 1일 47건 포함, 존재하지 않는 일자/윤달 2,231건 모두 거부, 범위 밖 362건 거부.
- 기존 R-001 테스트 30건 회귀 통과(음력 차단 테스트 1건은 '변환 후 허용·없는 윤달 차단'으로 갱신).

## 입력 화면
음력 선택 시 연/월/일 select(1~30일), '윤달' 체크(확실할 때만), 실존 여부는 서버가 판단. 오류는 결과 화면의 '다시 입력하기'로 돌아감.

## 한계 / 승인 필요
- KASI 공식 API live 대조 미수행(서비스키 필요).
- 저장 칸이 양력 날짜 형식이라 음력 '2월 30일'처럼 양력에 없는 숫자는 저장 불가(계산은 가능). 구조 변경은 별도 승인 필요.
- 요청 제한은 워커별 휘발성 메모리 Map(분당 30회/IP) — 운영 보안 수준 아님. 영속 레이트 리밋·RLS/anon 실제 권한 테스트는 별도 단계.
- 해외 출생·진태양시 미지원.
