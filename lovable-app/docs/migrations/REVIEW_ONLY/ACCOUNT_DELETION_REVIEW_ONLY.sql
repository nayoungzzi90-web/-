-- 회원 탈퇴 — REVIEW ONLY. 실행 금지(미적용). 적용 순서: PRICING_900_COIN → COINS_PAYMENTS_REFERRAL → 이 파일.
-- **보관 기간·잔여 엽전 처리 정책은 소유자 승인 + 법무 확인 전까지 "제안값"이다.** 앱에서는 ACCOUNT_DELETION_ENABLED 가 켜져야만 호출된다(기본 꺼짐).
--
-- 원칙
--   · 개인 식별 정보는 즉시 삭제한다: 출생정보(이름·생년월일·시간·성별), 열람 기록, 초대 코드, 지갑.
--   · 결제·원장 기록은 법정 보관 의무가 있을 수 있어(일반적으로 알려진 기준: 대금결제·재화 공급 기록 5년 — 확인 필요) 지우지 않고 남긴다.
--     남기는 행에는 이름·이메일·생년월일이 없고 임의 uuid 와 PG 결제번호만 있다(가명). 계정(auth.users)은 서버가 별도로 삭제한다.
--     → 분쟁 시에는 PG 의 결제 정보와 결제번호로 대조한다.
--   · 보관 기간(retained_until)이 지나면 purge_retained_records() 로 남긴 기록도 삭제한다.
--   · 모든 탈퇴는 account_deletions 에 개인정보 없이 감사 기록을 남긴다.
-- 이 파일은 데이터를 지우는 함수를 "정의"할 뿐 실행하지 않는다. 롤백: 함수·표 DROP(표가 비어 있을 때).

CREATE TABLE IF NOT EXISTS public.account_deletions (
  user_id         uuid        PRIMARY KEY,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  forfeited_coins integer     NOT NULL DEFAULT 0 CHECK (forfeited_coins >= 0),
  retained_until  date        NOT NULL,               -- 결제·원장 기록 보관 만료일(제안: 탈퇴일 + 5년, 확정 전)
  purged_at       timestamptz
);
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deletions TO service_role;

-- 회원 데이터 삭제(서버 전용). 같은 사용자에 두 번 불러도 안전(멱등).
--   p_forfeit=false 인데 엽전이 남아 있으면 COINS_REMAIN 으로 거부 → 화면이 "남은 엽전은 사라져요" 확인을 받은 뒤 true 로 다시 부른다.
CREATE OR REPLACE FUNCTION public.delete_member_data(p_user uuid, p_forfeit boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_balance integer;
  v_done public.account_deletions%ROWTYPE;
  c_retention_years constant integer := 5;     -- 제안값(확정 전)
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'UNKNOWN_USER'; END IF;
  SELECT * INTO v_done FROM public.account_deletions WHERE user_id = p_user FOR UPDATE;
  IF FOUND THEN RETURN jsonb_build_object('deleted', false, 'already_deleted', true); END IF;

  -- 지갑 잔액 확인(잠금). 남은 엽전은 본인이 동의(p_forfeit)한 경우에만 소멸시킨다.
  SELECT coins INTO v_balance FROM public.wallets WHERE user_id = p_user FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_balance > 0 AND NOT p_forfeit THEN RAISE EXCEPTION 'COINS_REMAIN'; END IF;
  IF v_balance > 0 THEN
    INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (p_user, -v_balance, 'adjust', 'account_deleted', 0);
  END IF;

  -- 결제 대기 주문은 취소(승인되면 충전될 주문이 남지 않게)
  UPDATE public.coin_orders SET status = 'canceled' WHERE user_id = p_user AND status = 'created';

  -- 이 사람을 초대자로 하는 대기 중 연결은 닫는다(보상 대상 없음). 이 사람이 초대받은 연결 기록은 삭제.
  UPDATE public.referrals SET status = 'skipped', reason = 'inviter_deleted', resolved_at = now() WHERE inviter_id = p_user AND status = 'pending';
  DELETE FROM public.referrals WHERE invitee_id = p_user;

  -- 개인 식별 정보·이용 기록 삭제
  DELETE FROM public.birth_profiles   WHERE user_id = p_user;
  DELETE FROM public.unlocked_readings WHERE user_id = p_user;
  DELETE FROM public.invite_codes     WHERE user_id = p_user;
  DELETE FROM public.wallets          WHERE user_id = p_user;

  -- 남기는 것: coin_orders, coin_purchases, coin_ledger, invite_rewards(결제·보상 기록, 개인정보 없음)
  INSERT INTO public.account_deletions (user_id, forfeited_coins, retained_until)
  VALUES (p_user, v_balance, (now() AT TIME ZONE 'Asia/Seoul')::date + make_interval(years => c_retention_years));
  RETURN jsonb_build_object('deleted', true, 'forfeited_coins', v_balance);
END;
$$;

-- 보관 기간이 지난 결제·원장·보상 기록 삭제(서버 전용, 스케줄은 별도 승인). 이미 탈퇴한 사용자의 기록만 대상.
CREATE OR REPLACE FUNCTION public.purge_retained_records()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_users uuid[];
  v_ledger integer; v_purch integer; v_orders integer; v_rewards integer;
BEGIN
  SELECT array_agg(user_id) INTO v_users FROM public.account_deletions
   WHERE purged_at IS NULL AND retained_until < (now() AT TIME ZONE 'Asia/Seoul')::date;
  IF v_users IS NULL THEN RETURN jsonb_build_object('purged_users', 0); END IF;

  WITH d AS (DELETE FROM public.coin_ledger WHERE user_id = ANY (v_users) RETURNING 1) SELECT count(*) INTO v_ledger FROM d;
  WITH d AS (DELETE FROM public.coin_purchases WHERE user_id = ANY (v_users) RETURNING 1) SELECT count(*) INTO v_purch FROM d;   -- 주문보다 먼저(외래키)
  WITH d AS (DELETE FROM public.coin_orders WHERE user_id = ANY (v_users) RETURNING 1) SELECT count(*) INTO v_orders FROM d;
  WITH d AS (DELETE FROM public.invite_rewards WHERE invitee_id = ANY (v_users) OR inviter_id = ANY (v_users) RETURNING 1) SELECT count(*) INTO v_rewards FROM d;
  UPDATE public.account_deletions SET purged_at = now() WHERE user_id = ANY (v_users);
  RETURN jsonb_build_object('purged_users', cardinality(v_users), 'ledger', v_ledger, 'purchases', v_purch, 'orders', v_orders, 'rewards', v_rewards);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_member_data(uuid, boolean), public.purge_retained_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_member_data(uuid, boolean), public.purge_retained_records() TO service_role;

-- 적용 후 검증(읽기 전용):
--   SELECT p.proname, p.proacl::text, p.proconfig FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('delete_member_data','purge_retained_records');
--   SELECT relname, relrowsecurity, relacl::text FROM pg_class WHERE relname = 'account_deletions';
