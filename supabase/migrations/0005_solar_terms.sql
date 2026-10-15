-- 만세력 엔진: 24절기·합삭 데이터 (설계안: 실행 전 검토 필요. 로컬 PGlite 로 스키마·시드·제약을 시험했다)
-- 범위: 1899(부분)–2101 (서비스 지원 범위 1900-01-01–2100-12-31, 앞뒤는 경계 계산용 버퍼)
-- 원칙: 절입 시각은 UTC 로 저장. KST 표시는 "고정 UTC+9" 표기이며 역사적 표준시(+8:30 등)가 아니다.

create table if not exists solar_term_datasets (
  id            text primary key,                       -- 예: de421-own-2026-10
  title         text not null,
  ephemeris     text not null,                          -- 계산에 쓴 천체력
  engine_version text not null,                         -- 계산 파이프라인 버전
  time_scale_policy text not null,                      -- ΔT·윤초 처리 설명
  range_from_year int not null, range_to_year int not null,
  generated_at  timestamptz not null default now(),
  notes         text
);

create table if not exists solar_terms (
  id            bigint generated always as identity primary key,
  dataset_id    text not null references solar_term_datasets(id),
  year          int  not null check (year between 1899 and 2101),
  term_seq      smallint not null check (term_seq between 1 and 24),     -- 해당 연도 안의 순서: 1=소한 … 24=동지
  term_name     text not null,
  sun_longitude smallint not null check (sun_longitude between 0 and 345 and sun_longitude % 15 = 0),
  is_jie        boolean generated always as (sun_longitude % 30 = 15) stored,   -- 절(節): 월주 경계
  utc_instant   timestamptz not null,
  kst_display   text not null check (kst_display ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'),  -- UTC+9 고정
  source        text not null,
  engine_version text not null,
  verification_status text not null default 'computed'
    check (verification_status in ('computed','cross_checked','official_confirmed','official_mismatch','boundary_review')),
  uncertainty_seconds numeric not null check (uncertainty_seconds >= 0),   -- 이 값 안쪽의 경계는 확정하지 않는다
  unique (dataset_id, year, term_seq),
  unique (dataset_id, sun_longitude, utc_instant)
);
create index if not exists solar_terms_instant_idx on solar_terms (dataset_id, utc_instant);

-- 교차검증 기록 (소스별로 여러 건)
create table if not exists solar_term_checks (
  id            bigint generated always as identity primary key,
  term_id       bigint not null references solar_terms(id) on delete cascade,
  check_source  text not null,                          -- 예: swisseph-moshier, astronomy-engine
  delta_seconds numeric not null,                       -- (검증 소스 - 기준값), TT 기준
  tolerance_seconds numeric not null,
  passed        boolean generated always as (abs(delta_seconds) <= tolerance_seconds) stored,
  checked_at    timestamptz not null default now()
);

-- 공식 자료 적재용 (KASI 월력요항/공공데이터). 현재 비어 있음.
create table if not exists official_solar_terms (
  id            bigint generated always as identity primary key,
  year          int not null,
  term_name     text not null,
  official_kst_minute timestamp not null,               -- 공식 표기 (분 단위로 가정하지 않음: 초가 있으면 그대로)
  precision_seconds int not null default 60 check (precision_seconds in (1, 60)),
  source_document text not null,                        -- 문서명·판·페이지
  source_url    text,
  imported_at   timestamptz not null default now(),
  unique (year, term_name, source_document)
);

create table if not exists new_moons (
  dataset_id    text not null references solar_term_datasets(id),
  seq           int  not null,
  utc_instant   timestamptz not null,
  kst_display   text not null,
  source        text not null,
  verification_status text not null default 'computed'
    check (verification_status in ('computed','cross_checked','official_confirmed','official_mismatch','boundary_review')),
  primary key (dataset_id, seq)
);

-- 공식값 비교: 공식 표기(KST, 분 단위로 가정하지 않고 precision_seconds 로 받음)와 계산값을 비교한다.
--  · 분 단위 공식값과 같은 분이면서 계산값의 초가 경계(p_boundary_seconds) 안쪽이면 boundary_review (반올림/내림 규칙을 모르므로 확정 금지)
--  · 같은 분이고 경계에서 떨어져 있으면 official_confirmed
--  · 1분 + 경계 허용 이내 차이면 boundary_review, 그보다 크면 official_mismatch
--  · 공식값이 없으면: 모든 교차검증 통과 → cross_checked, 아니면 computed
create or replace function refresh_solar_term_status(p_dataset text, p_boundary_seconds numeric default 5)
returns table (status text, n bigint) language plpgsql as $$
begin
  with calc as (
    select t.id, (t.utc_instant at time zone 'UTC') + interval '9 hours' as kst,
           o.id as oid, o.official_kst_minute as okst, o.precision_seconds as oprec,
           coalesce(c.n, 0) as n_checks, coalesce(c.f, 0) as n_failed
    from solar_terms t
    left join (select term_id, count(*) n, count(*) filter (where not passed) f from solar_term_checks group by term_id) c on c.term_id = t.id
    left join official_solar_terms o on o.year = t.year and o.term_name = t.term_name
    where t.dataset_id = p_dataset
  ), verdict as (
    select id, case
      when oid is null then case when n_checks > 0 and n_failed = 0 then 'cross_checked' else 'computed' end
      when oprec = 60 and date_trunc('minute', kst) = okst then
        case when extract(second from kst) < p_boundary_seconds or extract(second from kst) > 60 - p_boundary_seconds then 'boundary_review' else 'official_confirmed' end
      when oprec = 1 and abs(extract(epoch from (kst - okst))) <= 1 then 'official_confirmed'
      when abs(extract(epoch from (kst - okst))) <= oprec + p_boundary_seconds then 'boundary_review'
      else 'official_mismatch' end as st
    from calc
  )
  update solar_terms t set verification_status = v.st from verdict v where t.id = v.id;
  return query select verification_status, count(*) from solar_terms where dataset_id = p_dataset group by 1 order by 1;
end $$;

-- 읽기 전용 공개 데이터 (천문 계산값). 쓰기는 service role 만.
alter table solar_term_datasets enable row level security;
alter table solar_terms enable row level security;
alter table solar_term_checks enable row level security;
alter table official_solar_terms enable row level security;
alter table new_moons enable row level security;
create policy solar_term_datasets_read on solar_term_datasets for select using (true);
create policy solar_terms_read on solar_terms for select using (true);
create policy new_moons_read on new_moons for select using (true);
-- solar_term_checks / official_solar_terms 는 정책 없음 = service role 전용
