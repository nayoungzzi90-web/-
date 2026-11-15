-- R-015 공개 사주 미리보기 공유 요청 제한 — REVIEW ONLY. 실행 금지(미적용).
-- 앱 코드 기준: src/lib/rate-limit.server.ts 가 public.saju_rate_limit_hit(p_scope, p_identity_hash) → boolean 호출.
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

  RETURN v_count <= v_max;
END;
$$;
REVOKE ALL ON FUNCTION public.saju_rate_limit_hit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saju_rate_limit_hit(text, text) TO service_role;

-- 보관기간 정리: 10분 지난 버킷 삭제 (service_role/cron 전용)
CREATE OR REPLACE FUNCTION private_saju.cleanup_rate_buckets()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH d AS (DELETE FROM private_saju.rate_buckets WHERE minute_bucket < now() - interval '10 minutes' RETURNING 1)
  SELECT count(*)::integer FROM d;
$$;
REVOKE ALL ON FUNCTION private_saju.cleanup_rate_buckets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_saju.cleanup_rate_buckets() TO service_role;
-- 스케줄(별도 승인): 5분마다 cleanup 호출. 원시 IP는 저장되지 않음(HMAC 64hex만).

-- ROLLBACK (리뷰용): 데이터는 휘발성 카운터뿐이라 삭제 안전.
-- DROP FUNCTION IF EXISTS public.saju_rate_limit_hit(text, text);
-- DROP FUNCTION IF EXISTS private_saju.cleanup_rate_buckets();
-- DROP TABLE IF EXISTS private_saju.rate_buckets;
-- DROP SCHEMA IF EXISTS private_saju;
