# 2. 계산 정책·모듈 구조

## 2.1 원칙
1. AI 언어모델은 계산에 쓰지 않는다. 입력→출력이 결정적(deterministic)이며 같은 입력·정책·데이터 버전이면 byte 단위로 같은 JSON.
2. 학파·관행이 갈리는 지점은 코드에 박지 않고 **정책 객체(`ManseConfig`)** 로 받는다. 결과 JSON 에 사용한 정책 전체와 정책 해시를 기록한다.
3. 실패는 예외가 아니라 **명시적 결과 타입**(`{ ok:false, error:{code,message,details} }`)으로 반환한다.
4. 검증되지 않은 것은 확정하지 않는다. 결과에는 `status`(`OK` / `NEEDS_REVIEW`)와 `uncertainties[]`, `dataVerification` 이 항상 붙는다.
5. 서비스 런타임은 외부 라이브러리·네트워크 없이 **사전 계산된 절입/합삭 표**(DB 또는 JSON)를 읽는다.

## 2.2 모듈 구조 (`engine/manse/src`)

| # | 요구 모듈 | 파일 | 입력 → 출력 |
|---|---|---|---|
| – | 공통 | `types.ts`, `errors.ts`, `ganji.ts`, `config.ts` | 타입·오류 코드·60갑자·정책 스키마/검증/해시 |
| – | 시간 기초 | `time.ts` | 그레고리력 ↔ 율리우스 일수, epoch ms |
| 2 | 출생지역·역사적 시간대 | `zone.ts` | 현지 시각 → UTC(후보 목록, 서머타임 중복/공백 처리), 표준 자오선 |
| 3 | 표준시·진태양시 보정 | `solarTime.ts` | UTC + 경도(+균시차) → 명리 계산용 시각 |
| – | 절기 표 | `terms.ts` | 절입 시각 조회·구간 탐색, 데이터 검증 상태 |
| 1 | 음양력 변환 | `lunar.ts` | 합삭+중기로 만든 월 표 → 양↔음(윤달 포함) |
| 4 | 연주 | `pillars.ts#yearPillar` | 입춘 경계(정책) |
| 5 | 월주 | `pillars.ts#monthPillar` | 절 경계, 오호둔 월간 |
| 6 | 일주 | `pillars.ts#dayPillar` | 율리우스 일수 기반 60갑자, 자시 경계(정책) |
| 7 | 시주 | `pillars.ts#hourPillar` | 오서둔 시간 |
| 8 | 지장간·십성 | `hidden.ts`, `tenGods.ts` | 지장간 표(정책), 일간 기준 십성 |
| 9 | 합충형파해 | `relations.ts` | 천간합·충, 지지 육합/삼합/방합/충/형/파/해 추출(작용 여부는 판단하지 않음) |
| 10,11 | 대운 순역·기산·대운·세운 | `luck.ts` | 방향, 기산(정책), 대운 10주기, 연도별 세운 |
| – | 통합 | `engine.ts` | `calculate(request, config?) → Result<ManseResult>` |
| – | AI 엔진 연결 | `adapter.ts` | `ManseResult → SajuFacts`(기존 해석 엔진 입력) |
| – | 공식값 비교 | `official.ts` | KASI 표 ↔ 계산값 비교, 상태 판정 |

오프라인 도구(`tools/`): `ref/de421_events.py`(기준 사건 생성), `ref/finalize_events.py`(UTC 환산·교차검증), `gen-seed-sql.ts`(DB 시드), `verify/*`(독립 대조).

## 2.3 정책 목록과 기본값

| 정책 | 선택지 | 기본값 | 근거/비고 |
|---|---|---|---|
| `yearBoundary` | `IPCHUN` / `JAN1` / `LUNAR_NEW_YEAR` | `IPCHUN` | 사주명리 다수설 |
| `ziHour` | `ZI_23_NEXT_DAY` (23시에 일주 교체) / `ZI_SPLIT_YAJA` (야자시·조자시: 일주는 자정 교체, 23시대 시주는 익일 일간으로 子시) / `MIDNIGHT` (00시 교체, 23시대도 당일 일간의 子시) | `ZI_SPLIT_YAJA` | 학파별 이견. 기본값은 임의 선택이며 결과에 대안 표시 |
| `solarTime.mode` | `NONE` / `LONGITUDE` / `FIXED_OFFSET` | `NONE` | 출생지 미입력이 기본인 서비스이므로 보정 없음. 대안은 `uncertainties` 로 노출 |
| `solarTime.fixedOffsetMinutes` | 정수 | `-30` | `FIXED_OFFSET` 일 때만 사용 |
| `solarTime.applyEquationOfTime` | bool | `false` | 균시차 적용 여부 |
| `solarTime.missingPlace` | `FLAG` / `USE_SEOUL` / `ERROR` | `FLAG` | `LONGITUDE` 인데 출생지 없을 때 |
| `timeBasis` | `KST_PLUS9` / `ERA_STANDARD` / `ERA_WALL_CLOCK` | `KST_PLUS9` | 명리 계산용 시계: 항상 UTC+9 / 당시 표준시(서머타임 제외) / 입력한 벽시계 그대로(서머타임 포함). 1908–11, 1954–61 의 +8:30 시기와 서머타임 처리가 갈림 |
| `lunarClock` | `PRE1912_UTC_PLUS8` / `TZDB_STANDARD` | `PRE1912_UTC_PLUS8` | 음력 역일을 정하는 시계. 1912년 이전만 다르다. 기본값은 독립 라이브러리와의 전수 대조에서 **추정**한 값이며 공식 확인 전 |
| `dstAmbiguous` | `FIRST` / `SECOND` / `ERROR` | `FIRST` | 서머타임 종료 시 중복 시각. 후보 간 결과가 다르면 `NEEDS_REVIEW` |
| `hiddenStems.table` | `STANDARD` / `SIMPLE` | `STANDARD` | 월률분야 일수는 학파별 상이 |
| `luck.startPrecision` | `EXACT` / `DAYS_QUOTIENT` / `SHICHEN` | `EXACT` | 3일=1년, 1일=4개월, 1시진(2시간)=10일. EXACT=분 단위 연속 환산, DAYS_QUOTIENT=일수를 3으로 나눈 몫(세)·나머지×4개월, SHICHEN=달력 날짜 차이와 시진 번호 차이로 센다 |
| `luck.yearLengthDays` | 숫자 | `365.2425` | 기산 시각을 날짜로 환산할 때 1년의 길이(360 등 대안) |
| `luck.missingGender` | `OMIT` / `ERROR` | `OMIT` | 성별 없으면 순역 불가 → 대운 생략+경고 |
| `luck.count` | 정수 | `10` | |
| `boundaryGuardSeconds` | 숫자 | `120` | 절입 시각과 출생 시각이 이 안이면 확정하지 않음 |
| `requireOfficialTermData` | bool | `false` | `true` 이면 공식 확인 안 된 절기 근처 결과는 모두 `NEEDS_REVIEW` |

## 2.4 상태 판정 (확정하지 않는 규칙)

결과 `status`: `OK`(미확정 없음) / `POLICY_DEPENDENT`(일주·시주가 정책 선택에 따라 달라짐, 대안 제시) / `NEEDS_REVIEW`(절입 경계·시각 미상 절입일·서머타임 중복·공식자료 요구 등으로 확정 불가). `OK` 도 "공식 절입 자료로 확인됨"을 뜻하지 않는다 — 그것은 `dataVerification.officialConfirmed` 가 따로 말한다.

- **절입 경계 가드**: 출생 순간과 연주/월주를 가르는 절입 시각의 차이가 `boundaryGuardSeconds + 절입 불확실도` 이내면 해당 기둥은 `boundary: true`, 양쪽 후보를 `candidates` 로 모두 제시하고 `status = NEEDS_REVIEW`.
- **시각 미상**: 하루 전체 구간에서 기둥이 하나로 정해지지 않으면(절입일) `candidates` 제시 + `NEEDS_REVIEW`. 시주는 계산하지 않는다.
- **정책 민감도**: 일주·시주가 정책 조합(자시·진태양시·출생지 범위)에 따라 달라지면 `uncertainties` 에 `PILLAR_POLICY_DEPENDENT` 와 대안 값을 넣는다. 출생지 미입력이면 경도 범위(124.6°–131.9°E)를 훑는다.
- **절기 데이터 상태**: 공식 확인(`official_confirmed`)이 아니면 `dataVerification.level = EPHEMERIS_CROSS_CHECKED` 이고 `officialConfirmed:false`. 2051년 이후는 `EXTENDED_RANGE`(불확실도 더 큼).
- 이 상태가 AI 해석 엔진의 `computation.verified` 로 매핑된다: 공식 확인 전에는 **항상 `false`**.

## 2.5 데이터 모델 (PostgreSQL, `supabase/migrations/0005_solar_terms.sql`)

`solar_term_datasets`(출처·엔진 버전·ΔT/윤초 정책) → `solar_terms`(연도·절기·황경·UTC·KST 표시·출처·엔진 버전·검증 상태·불확실도) → `solar_term_checks`(교차검증 기록: 소스, 차이(초), 허용치, 통과) / `official_solar_terms`(공식값 적재용, 현재 비어 있음). 합삭은 `new_moons`(출처 포함). 상태 갱신은 SQL 함수 `refresh_solar_term_status()` 가 하며 TS `official.ts#compareOfficial` 과 같은 규칙이다. 검증 상태: `computed` → `cross_checked` → `official_confirmed` (또는 `official_mismatch`, `boundary_review`).
