-- AI 풀이 저장·생성 관리 — REVIEW ONLY. 실행 금지(미적용). 운영 적용은 사용자 승인 후, staging 검증을 먼저 한다.
-- 목적
--   · 한 사람의 같은 풀이(열람 id + 버전)는 한 번만 만든다(재방문·새로고침·이중 클릭에도 AI 를 다시 부르지 않음).
--   · 같은 풀이의 재시도는 최대 3번. 오래 멈춘 작업(stale)만 다시 시작할 수 있다.
--   · 한 사람의 하루(한국 시간) 새 AI 풀이 개수 상한, 서비스 전체의 하루 AI 원가 상한(진행 중 작업은 예약 금액으로 미리 뺀다).
-- 권한
--   · 회원은 자기 행을 읽기만 한다(RLS). 쓰기는 service_role 전용 함수(ai_reading_begin / ai_reading_finish)로만.
--   · 본문(sections)에는 고객 이름이 들어가지 않는다({{이름}} 자리표시로 저장, 화면에서 바꿈). 출생정보 원문도 저장하지 않는다(열람 id 는 해시).
-- 회원 탈퇴: user_id 가 auth.users 를 참조하고 ON DELETE CASCADE 라 계정 삭제와 함께 지워진다.
-- 롤백: 비어 있을 때 DROP FUNCTION 2개, DROP TABLE public.ai_readings. 다른 표·함수는 건드리지 않는다.

CREATE TABLE IF NOT EXISTS public.ai_readings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reading_id   text        NOT NULL CHECK (reading_id ~ '^(basic|love|deep|compat|taekil):[0-9a-f]{14}$'),
  version_key  text        NOT NULL CHECK (length(version_key) BETWEEN 1 AND 200),
  status       text        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ready', 'needs_review', 'blocked', 'failed')),
  attempts     integer     NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  sections     jsonb,
  review       jsonb,
  model        text        CHECK (model IS NULL OR length(model) <= 100),
  cost_usd     numeric(10, 5) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  error_code   text        CHECK (error_code IS NULL OR length(error_code) <= 60),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reading_id, version_key)
);
CREATE INDEX IF NOT EXISTS ai_readings_started_idx ON public.ai_readings (started_at);

ALTER TABLE public.ai_readings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_readings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_readings TO authenticated;
GRANT ALL ON public.ai_readings TO service_role;
DROP POLICY IF EXISTS ai_readings_select_own ON public.ai_readings;
CREATE POLICY ai_readings_select_own ON public.ai_readings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 생성 시작. 반환 state:
--   done(ready·needs_review·blocked: 이미 있음) / running(다른 요청이 만드는 중) / start(지금 만들어도 됨, id 포함)
--   exhausted(재시도 3번 다 씀) / user_limit(오늘 새 풀이 개수 초과) / budget(오늘 전체 원가 상한)
CREATE OR REPLACE FUNCTION public.ai_reading_begin(
  p_user uuid, p_reading text, p_version text,
  p_user_daily integer, p_daily_usd numeric, p_reserve_usd numeric, p_stale_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  r public.ai_readings%ROWTYPE;
  day_start timestamptz := (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul');
  spent numeric;
  reserved numeric;
  mine integer;
BEGIN
  IF p_user IS NULL OR p_reading IS NULL OR p_version IS NULL THEN RAISE EXCEPTION 'BAD_INPUT'; END IF;
  IF p_user_daily < 0 OR p_daily_usd < 0 OR p_reserve_usd < 0 OR p_stale_seconds < 60 THEN RAISE EXCEPTION 'BAD_INPUT'; END IF;
  -- 같은 사용자의 시작 요청을 줄 세운다(동시에 두 번 눌러도 하나만 start)
  PERFORM pg_advisory_xact_lock(hashtext('ai_reading:' || p_user::text));

  SELECT * INTO r FROM public.ai_readings WHERE user_id = p_user AND reading_id = p_reading AND version_key = p_version FOR UPDATE;
  IF FOUND THEN
    IF r.status IN ('ready', 'needs_review', 'blocked') THEN RETURN jsonb_build_object('state', 'done', 'id', r.id, 'status', r.status); END IF;
    IF r.status = 'running' AND r.started_at > now() - make_interval(secs => p_stale_seconds) THEN RETURN jsonb_build_object('state', 'running', 'id', r.id); END IF;
    IF r.attempts >= 3 THEN RETURN jsonb_build_object('state', 'exhausted', 'id', r.id); END IF;
  ELSE
    SELECT count(*) INTO mine FROM public.ai_readings WHERE user_id = p_user AND created_at >= day_start;
    IF mine >= p_user_daily THEN RETURN jsonb_build_object('state', 'user_limit'); END IF;
  END IF;

  -- 서비스 전체 하루 원가: 오늘 쓴 금액 + 진행 중인 다른 작업 수 × 예약 금액 + 이번 작업 예약 금액
  SELECT coalesce(sum(cost_usd), 0) INTO spent FROM public.ai_readings WHERE started_at >= day_start OR finished_at >= day_start;
  SELECT count(*) * p_reserve_usd INTO reserved FROM public.ai_readings
    WHERE status = 'running' AND started_at > now() - make_interval(secs => p_stale_seconds) AND NOT (user_id = p_user AND reading_id = p_reading AND version_key = p_version);
  IF spent + reserved + p_reserve_usd > p_daily_usd THEN RETURN jsonb_build_object('state', 'budget'); END IF;

  IF r.id IS NOT NULL THEN -- 실패했거나 멈춘 작업을 다시 시작
    UPDATE public.ai_readings SET status = 'running', attempts = attempts + 1, started_at = now(), finished_at = NULL, error_code = NULL WHERE id = r.id;
    RETURN jsonb_build_object('state', 'start', 'id', r.id, 'attempt', r.attempts + 1);
  END IF;
  INSERT INTO public.ai_readings (user_id, reading_id, version_key) VALUES (p_user, p_reading, p_version) RETURNING * INTO r;
  RETURN jsonb_build_object('state', 'start', 'id', r.id, 'attempt', 1);
END;
$$;

-- 생성 끝. running 인 행만 바꾼다(늦게 도착한 옛 요청이 새 결과를 덮지 못하게 시도 번호도 맞춘다). 원가는 누적한다.
CREATE OR REPLACE FUNCTION public.ai_reading_finish(
  p_id uuid, p_attempt integer, p_status text, p_sections jsonb, p_review jsonb, p_model text, p_cost_usd numeric, p_error text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE n integer;
BEGIN
  IF p_status NOT IN ('ready', 'needs_review', 'blocked', 'failed') THEN RAISE EXCEPTION 'BAD_STATUS'; END IF;
  IF p_cost_usd IS NULL OR p_cost_usd < 0 THEN RAISE EXCEPTION 'BAD_COST'; END IF;
  IF p_status <> 'failed' AND p_sections IS NULL THEN RAISE EXCEPTION 'NO_SECTIONS'; END IF;
  UPDATE public.ai_readings
     SET status = p_status, sections = CASE WHEN p_status = 'failed' THEN sections ELSE p_sections END,
         review = p_review, model = p_model, cost_usd = cost_usd + p_cost_usd, error_code = left(p_error, 60), finished_at = now()
   WHERE id = p_id AND status = 'running' AND attempts = p_attempt;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_reading_begin(uuid, text, text, integer, numeric, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_reading_finish(uuid, integer, text, jsonb, jsonb, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_reading_begin(uuid, text, text, integer, numeric, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_reading_finish(uuid, integer, text, jsonb, jsonb, text, numeric, text) TO service_role;
