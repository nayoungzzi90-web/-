-- 엽전 정책 변경 — REVIEW ONLY. 실행 금지(미적용). 사용자 결정(2026-10-21):
--   1) 초대 보상 2 → 1 엽전   2) 하루·월 한도를 한국 시간(Asia/Seoul) 달력 기준으로 고정   3) 가입 보너스 없음(4 → 0)
-- 범위: 함수 두 개의 본문만 교체(CREATE OR REPLACE). 표·권한·정책·데이터는 건드리지 않는다.
--   · CREATE OR REPLACE 는 기존 함수의 소유자·EXECUTE 권한(ACL)을 그대로 유지한다. 적용 후 권한을 다시 조회해 확인할 것.
--   · 기존 회원의 지갑 잔액·초대 기록은 바뀌지 않는다(이미 받은 엽전은 그대로).
--   · 앱 문구는 src/lib/coins.ts 의 상수(INVITE_REWARD=1, 5, 30, SIGNUP_BONUS=0)와 이 파일의 값이 같아야 한다.
-- 롤백: 운영 스냅샷(R015 0단계)에 저장해 둔 이전 함수 본문(pg_get_functiondef)으로 되돌린다.

CREATE OR REPLACE FUNCTION public.ensure_user_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  -- 가입 보너스 없음: 지갑은 0 으로 만든다(이미 있으면 그대로).
  INSERT INTO public.wallets (user_id, coins) VALUES (v_user, 0) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.invite_codes (code, user_id)
  SELECT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)), v_user
  WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE user_id = v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_invite(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_reward      constant integer := 1;    -- 초대한 사람이 받는 엽전
  c_daily_cap   constant integer := 5;    -- 한국 시간 하루
  c_monthly_cap constant integer := 30;   -- 한국 시간 한 달
  v_user    uuid := auth.uid();
  v_inviter uuid;
  v_created timestamptz;
  -- 한국 시간 달력의 오늘/이번 달 시작 시각(timestamptz). 서버 시간대와 무관하다.
  v_day_start   timestamptz := date_trunc('day',   now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_daily   integer;
  v_monthly integer;
  v_rows    integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  SELECT created_at INTO v_created FROM auth.users WHERE id = v_user;
  IF v_created IS NULL OR v_created < now() - interval '3 days' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.invite_rewards WHERE invitee_id = v_user) THEN RETURN false; END IF;

  -- 초대자 행을 잠가 같은 초대자에 대한 동시 요청을 한 줄로 세운다(한도 확인 → 삽입 사이의 경쟁 방지).
  SELECT user_id INTO v_inviter FROM public.invite_codes WHERE code = upper(trim(p_code)) FOR UPDATE;
  IF v_inviter IS NULL OR v_inviter = v_user THEN RETURN false; END IF;

  SELECT count(*) INTO v_daily FROM public.invite_rewards
    WHERE inviter_id = v_inviter AND created_at >= v_day_start;
  IF v_daily >= c_daily_cap THEN RETURN false; END IF;
  SELECT count(*) INTO v_monthly FROM public.invite_rewards
    WHERE inviter_id = v_inviter AND created_at >= v_month_start;
  IF v_monthly >= c_monthly_cap THEN RETURN false; END IF;

  -- 같은 사람이 동시에 두 번 보내도 한 번만 인정(PK 위반 예외 대신 false).
  INSERT INTO public.invite_rewards (invitee_id, inviter_id) VALUES (v_user, v_inviter)
  ON CONFLICT (invitee_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN false; END IF;

  INSERT INTO public.wallets (user_id, coins) VALUES (v_inviter, c_reward)
  ON CONFLICT (user_id) DO UPDATE SET coins = public.wallets.coins + c_reward, updated_at = now();
  RETURN true;
END;
$$;

-- 적용 후 검증(읽기 전용):
--   SELECT p.proname, p.proacl::text, p.proconfig FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('ensure_user_setup','apply_invite');
--   -- 기대: acl 에 anon/PUBLIC 없음, authenticated·service_role 실행 가능, config = search_path=""
