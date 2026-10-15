# ohaeng-manse — 만세력 계산 엔진

출생정보(JSON) → 사주팔자·지장간·십성·합충형파해·대운·세운(JSON). **AI 언어모델·네트워크 없이** 결정적으로 계산한다. 학파별 이견은 `ManseConfig`(정책)로만 바꾼다.

> 상태: 독립 구현 여러 개와의 대조는 통과했지만 **KASI 공식 절입 자료와의 대조는 하지 못했다.** 자세한 근거와 한계는 [`docs/manse/03_VERIFICATION.md`](../../docs/manse/03_VERIFICATION.md).

## 사용

```ts
import { calculate } from './src/engine';
import { toSajuFacts } from './src/adapter';

const r = calculate({ calendar: 'solar', year: 1990, month: 4, day: 19, hour: 1, minute: 10, gender: 'F' }, /* 정책 override */ {});
if (!r.ok) console.error(r.error);            // { code, message, details } — 예외를 던지지 않고 명시적으로 실패
else { r.value;                               // ManseResult (JSON 직렬화 가능)
       toSajuFacts(r.value); }                // 기존 해석 AI 엔진 입력(SajuFacts)
```

CLI: `echo '{"calendar":"solar","year":1990,"month":4,"day":19,"hour":1,"minute":10,"gender":"F"}' | npm run -s manse:cli` (정책: 두 번째 인자 JSON).

### 요청 (`ManseRequest`)
`calendar:'solar'|'lunar'`, `year/month/day`, `leapMonth?`(음력), `hour/minute/second?`(없거나 `timeUnknown:true` 면 시간 미상), `gender?:'M'|'F'`, `birthplace?:{longitude}`(한국 124.0~132.5°E), `yearly?:{from,to}`(세운 범위; 생략하면 계산 안 함 — 호출 시각에 의존하지 않기 위함).

### 결과 (`ManseResult`) 핵심 필드
`status`(`OK`/`POLICY_DEPENDENT`/`NEEDS_REVIEW`), `uncertainties[]`(코드·대안 기둥), `pillars`(간지·십성·지장간), `basis`(어떤 절입·일수에 근거했는지), `relations[]`, `luck`, `yearly`, `time.steps`(시각 환산 과정), `policy`+`policyHash`, `dataVerification`(`officialConfirmed:false` 등), `warnings[]`.

### 오류 코드
`INVALID_INPUT` `INVALID_DATE` `OUT_OF_RANGE` `INVALID_TIME` `NONEXISTENT_LOCAL_TIME` `AMBIGUOUS_LOCAL_TIME` `INVALID_LUNAR_DATE` `LEAP_MONTH_NOT_FOUND` `LUNAR_OUT_OF_RANGE` `INVALID_POLICY` `INVALID_BIRTHPLACE` `GENDER_REQUIRED` `DATA_UNAVAILABLE`

## 지원 범위
양력 1900-01-01 ~ 2100-12-31. 한국 출생만(역사적 시간대 포함). 2051년 이후는 불확실도가 크다.

## 데이터와 DB
- `data/solar_terms.json`(4,850행), `data/new_moons.json`: 오프라인 파이프라인(`tools/ref/`)이 만든 사전 계산 표. 런타임은 이것만 읽는다.
- `supabase/migrations/0005_solar_terms.sql` + `npm run manse:seed-sql` 로 PostgreSQL 에 같은 데이터를 적재(검증 상태·교차검증 기록·공식값 비교 함수 포함).

## 시험
`npm run manse:test` — 단위·시간대(ICU 대조)·DB(PGlite)·독립 라이브러리 fixture. 전수 대조 스크립트는 `tools/verify/`.

## 라이선스 메모
런타임 의존성 없음. 검증용 도구: sxtwl(BSD)·lunar_python(MIT)·korean_lunar_calendar(MIT)·skyfield(MIT)·astronomy-engine(MIT). Swiss Ephemeris(AGPL/상용)는 오프라인 검증에만 썼고 저장소에 포함하지 않는다.
