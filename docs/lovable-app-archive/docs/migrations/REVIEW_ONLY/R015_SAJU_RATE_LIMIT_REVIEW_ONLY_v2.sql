-- R-015 공개 사주 미리보기 공유 요청 제한 v2 — REVIEW ONLY. 실행 금지(미적용).
-- v1(R015_SAJU_RATE_LIMIT_REVIEW_ONLY.sql) 대비 변경은 **하나**: 오래된 버킷 정리를 함수 안에서 기회적으로 수행한다.
--   이유: 2026-10-18 운영 스냅샷에서 pg_cron 확장이 설치돼 있지 않았다. v1 은 정리 스케줄(cron)이 필요해
--         확장 활성화라는 추가 승인·변경이 따른다. v2 는 cron 없이도 표가 무한히 커지지 않는다.
--   v1 로 staging 에서 통과한 한도 로직(30/10, 원자적 upsert)은 그대로다. v2 는 staging 에서 다시 검증해야 한다.
-- 한도/창은 DB 함수에 고정: saju_preview 30회/분, 신뢰 IP 없는 공유 키 saju_preview_unknown 10회/분.

CREATE SCHEMA IF NOT EXISTS private_saju;
REVOKE ALL ON SCHEMA private_saju FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private_saju TO service_role;

CREATE TABLE IF NOT EXISTS private_saju.rate_buckets (
  scope           text        NOT NULL CHECK (scope IN ('saju_preview', 'saju_preview_unknown')),
  hashed_identity text        NOT NULL CHECK (hashed_identity ~ '^[0-9a-f]{64}$'),
  minute_bucket   timestamptz NOT NULL,
  count           integer     NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (scope, hashed_identity, minute_bucket)
);
REVOKE ALL ON private_saju.rate_buckets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private_saju.rate_buckets TO service_role;
ALTER TABLE private_saju.rate_buckets ENABLE ROW LEVEL SECURITY; -- 정책 없음 = 클라이언트 역할 전면 차단
CREATE INDEX IF NOT EXISTS rate_buckets_minute_idx ON private_saju.rate_buckets (minute_bucket);

CREATE OR REPLACE FUNCTION public.saju_rate_limit_hit(p_scope text, p_identity_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_max integer;
  v_bucket timestamptz := date_trunc('minute', now());   -- 고정 60초 창
  v_count integer;
BEGIN
  IF p_scope = 'saju_preview' THEN v_max := 30;
  ELSIF p_scope = 'saju_preview_unknown' THEN v_max := 10;
  ELSE RAISE EXCEPTION 'INVALID_SCOPE'; END IF;
  IF p_identity_hash IS NULL OR p_identity_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_IDENTITY';
  END IF;

  INSERT INTO private_saju.rate_buckets AS b (scope, hashed_identity, minute_bucket, count)
  VALUES (p_scope, p_identity_hash, v_bucket, 1)
  ON CONFLICT (scope, hashed_identity, minute_bucket)
  DO UPDATE SET count = b.count + 1
  RETURNING b.count INTO v_count;

  -- v2: 약 2% 의 호출에서 10분 지난 버킷을 지운다(cron 불필요). 정리가 실패해도 한도 판정에는 영향이 없도록 분리.
  IF random() < 0.02 THEN
    BEGIN
      DELETE FROM private_saju.rate_buckets WHERE minute_bucket < now() - interval '10 minutes';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN v_count <= v_max;
END;
$$;
REVOKE ALL ON FUNCTION public.saju_rate_limit_hit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saju_rate_limit_hit(text, text) TO service_role;

-- 수동 정리 함수(선택, service_role 전용). 스케줄은 만들지 않는다.
CREATE OR REPLACE FUNCTION private_saju.cleanup_rate_buckets()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH d AS (DELETE FROM private_saju.rate_buckets WHERE minute_bucket < now() - interval '10 minutes' RETURNING 1)
  SELECT count(*)::integer FROM d;
$$;
REVOKE ALL ON FUNCTION private_saju.cleanup_rate_buckets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_saju.cleanup_rate_buckets() TO service_role;

-- ROLLBACK (리뷰용): 데이터는 휘발성 카운터뿐이라 삭제 안전.
-- DROP FUNCTION IF EXISTS public.saju_rate_limit_hit(text, text);
-- DROP FUNCTION IF EXISTS private_saju.cleanup_rate_buckets();
-- DROP TABLE IF EXISTS private_saju.rate_buckets;
-- DROP SCHEMA IF EXISTS private_saju;
