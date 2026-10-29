-- 엽전 결제·원장·초대 보상 — REVIEW ONLY. 실행 금지(미적용). 적용 순서: PRICING_900_COIN_REVIEW_ONLY.sql → 이 파일.
-- 사용자 결정(2026-10-21)
--   · 1닢 = 900원, 가입 보너스 없음
--   · 초대 보상 1닢은 "초대받은 친구가 **처음 결제**했을 때" 지급(가입만으로는 지급 안 함) — 단, 초대한 사람이 먼저 1닢 이상 결제한 적이 있어야 한다
--   · 한도: 한국 시간(Asia/Seoul) 달력 기준 하루 3명·월 10명(보수적 시작)
-- 돈 안전 원칙
--   · 금액은 서버가 정한다(coin_orders.amount_krw = coins × 900, CHECK 로 고정). 클라이언트가 보낸 금액은 신뢰하지 않는다.
--   · 충전·환불·보상은 service_role 전용 함수 한 번의 트랜잭션으로 지갑·결제 기록·원장을 함께 바꾼다. 같은 결제를 두 번 처리해도 한 번만 반영(멱등).
--   · 모든 잔액 변화는 coin_ledger(추가 전용)에 남는다 → 대사·환불 근거.
-- 이 파일의 어떤 것도 결제를 "켜지" 않는다. 앱의 결제 모드는 기본 꺼짐(PAYMENTS_MODE).
-- CREATE OR REPLACE 는 기존 함수의 소유자·ACL 을 유지한다. 새 함수는 public 기본 권한(anon/authenticated 에 자동 부여)을 아래에서 명시적으로 회수한다.
-- 롤백: 운영 스냅샷(R015 0단계)의 이전 함수 본문으로 교체, 새 표는 비어 있을 때만 DROP. 기존 회원의 잔액·이력은 이 파일이 바꾸지 않는다.

-- ───────────── 표 ─────────────
CREATE TABLE IF NOT EXISTS public.coin_orders (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL,
  coins               integer     NOT NULL CHECK (coins BETWEEN 1 AND 4),             -- 팩: 1~4닢(900/1,800/2,700/3,600원)
  amount_krw          integer     NOT NULL CHECK (amount_krw = coins * 900),
  status              text        NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'canceled', 'failed')),
  provider            text,
  provider_payment_id text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz,
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS coin_orders_user_idx ON public.coin_orders (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL UNIQUE REFERENCES public.coin_orders (id),
  user_id             uuid        NOT NULL,
  coins               integer     NOT NULL CHECK (coins >= 1),
  amount_krw          integer     NOT NULL CHECK (amount_krw > 0),
  provider            text        NOT NULL,
  provider_payment_id text        NOT NULL,
  status              text        NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  refunded_at         timestamptz,
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS coin_purchases_user_paid_idx ON public.coin_purchases (user_id) WHERE status = 'paid';

CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid        NOT NULL,
  delta         integer     NOT NULL CHECK (delta <> 0),
  reason        text        NOT NULL CHECK (reason IN ('purchase', 'referral_reward', 'spend', 'refund', 'reward_clawback', 'adjust')),
  ref           text,
  balance_after integer     NOT NULL CHECK (balance_after >= 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coin_ledger_user_idx ON public.coin_ledger (user_id, created_at);

-- 초대 연결(보상 전 단계). 연결만으로는 엽전이 움직이지 않는다.
CREATE TABLE IF NOT EXISTS public.referrals (
  invitee_id  uuid        PRIMARY KEY,
  inviter_id  uuid        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'skipped')),
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 기존 보상 기록 표에 결제 연결·회수 표시를 덧붙인다(데이터 변경 없음, nullable 열 추가만)
ALTER TABLE public.invite_rewards ADD COLUMN IF NOT EXISTS purchase_id uuid;
ALTER TABLE public.invite_rewards ADD COLUMN IF NOT EXISTS clawed_back_at timestamptz;

-- 접근 권한: 결제·주문·연결 표는 클라이언트 전면 차단. 원장은 본인 것만 읽기.
ALTER TABLE public.coin_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coin_orders, public.coin_purchases, public.coin_ledger, public.referrals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coin_orders, public.coin_purchases, public.coin_ledger, public.referrals TO service_role;
GRANT SELECT ON public.coin_ledger TO authenticated;
DROP POLICY IF EXISTS "read own coin ledger" ON public.coin_ledger;
CREATE POLICY "read own coin ledger" ON public.coin_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ───────────── 함수: 회원이 부르는 것 ─────────────
CREATE OR REPLACE FUNCTION public.ensure_user_setup()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  INSERT INTO public.wallets (user_id, coins) VALUES (v_user, 0) ON CONFLICT (user_id) DO NOTHING;   -- 가입 보너스 없음
  INSERT INTO public.invite_codes (code, user_id)
  SELECT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)), v_user
  WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE user_id = v_user);
END;
$$;

-- 초대 링크 적용 = 연결만. 보상은 초대받은 사람의 첫 결제 때 credit_purchase 가 판단한다.
CREATE OR REPLACE FUNCTION public.apply_invite(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inviter uuid;
  v_created timestamptz;
  v_rows integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  SELECT created_at INTO v_created FROM auth.users WHERE id = v_user;
  IF v_created IS NULL OR v_created < now() - interval '3 days' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invitee_id = v_user) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.invite_rewards WHERE invitee_id = v_user) THEN RETURN false; END IF;
  SELECT user_id INTO v_inviter FROM public.invite_codes WHERE code = upper(trim(p_code));
  IF v_inviter IS NULL OR v_inviter = v_user THEN RETURN false; END IF;
  INSERT INTO public.referrals (invitee_id, inviter_id) VALUES (v_user, v_inviter) ON CONFLICT (invitee_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

-- spend_coins: 허용 id 확장 + 원장 기록. 나머지(가격 재검증, 지갑 행 잠금, 이미 연 풀이 재차감 없음)는 기존과 같다.
CREATE OR REPLACE FUNCTION public.spend_coins(p_reading_id text, p_cost integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_type text;
  v_expected integer;
  v_balance integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF p_reading_id IS NULL OR length(p_reading_id) > 50 THEN RAISE EXCEPTION 'UNKNOWN_READING'; END IF;
  IF p_reading_id IN ('basic', 'love', 'deep') THEN v_type := p_reading_id;
  ELSIF p_reading_id ~ '^compat:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN v_type := 'compat';
  ELSIF p_reading_id ~ '^taekil:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN v_type := 'taekil';  -- 택일 id 형식은 예약(상품 설계 시 확정)
  ELSE RAISE EXCEPTION 'UNKNOWN_READING'; END IF;
  IF p_cost IS NULL OR p_cost <= 0 THEN RAISE EXCEPTION 'INVALID_PURCHASE_PRICE'; END IF;
  SELECT price_coins INTO v_expected FROM public.reading_price_catalog WHERE reading_type = v_type AND active;
  IF v_expected IS NULL THEN RAISE EXCEPTION 'READING_DISABLED'; END IF;
  IF p_cost <> v_expected THEN RAISE EXCEPTION 'PRICE_MISMATCH'; END IF;
  PERFORM public.ensure_user_setup();
  SELECT coins INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'WALLET_MISSING'; END IF;
  IF EXISTS (SELECT 1 FROM public.unlocked_readings WHERE user_id = v_user AND reading_id = p_reading_id) THEN RETURN v_balance; END IF;
  IF v_balance < v_expected THEN RAISE EXCEPTION 'INSUFFICIENT_COINS'; END IF;
  UPDATE public.wallets SET coins = coins - v_expected, updated_at = now() WHERE user_id = v_user;
  INSERT INTO public.unlocked_readings (user_id, reading_id) VALUES (v_user, p_reading_id);
  INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (v_user, -v_expected, 'spend', p_reading_id, v_balance - v_expected);
  RETURN v_balance - v_expected;
END;
$$;

-- ───────────── 함수: 서버(service_role) 전용 ─────────────
-- 주문 생성: 금액은 팩 크기에서 서버가 계산한다. 로그인 확인은 서버 함수가 JWT 로 한 뒤 사용자 id 를 넘긴다.
CREATE OR REPLACE FUNCTION public.create_coin_order(p_user uuid, p_coins integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN RAISE EXCEPTION 'UNKNOWN_USER'; END IF;
  IF p_coins IS NULL OR p_coins < 1 OR p_coins > 4 THEN RAISE EXCEPTION 'INVALID_PACK'; END IF;
  IF (SELECT count(*) FROM public.coin_orders WHERE user_id = p_user AND status = 'created' AND created_at > now() - interval '1 hour') >= 20
    THEN RAISE EXCEPTION 'TOO_MANY_ORDERS'; END IF;
  INSERT INTO public.coin_orders (user_id, coins, amount_krw) VALUES (p_user, p_coins, p_coins * 900) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 결제 확정 → 충전. 같은 결제를 두 번 처리해도 한 번만 반영. 첫 결제면 초대 보상까지 같은 트랜잭션에서 판단한다.
CREATE OR REPLACE FUNCTION public.credit_purchase(p_order_id uuid, p_provider text, p_provider_payment_id text, p_amount_krw integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  c_reward      constant integer := 1;
  c_daily_cap   constant integer := 3;
  c_monthly_cap constant integer := 10;
  v_day_start   timestamptz := date_trunc('day',   now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_order public.coin_orders%ROWTYPE;
  v_purchase uuid;
  v_balance integer;
  v_inviter uuid;
  v_ibalance integer;
  v_referral text := 'none';
  v_reason text;
BEGIN
  IF p_provider IS NULL OR p_provider_payment_id IS NULL OR length(p_provider_payment_id) < 1 THEN RAISE EXCEPTION 'INVALID_PAYMENT'; END IF;
  SELECT * INTO v_order FROM public.coin_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status = 'paid' THEN
    IF v_order.provider = p_provider AND v_order.provider_payment_id = p_provider_payment_id
      THEN RETURN jsonb_build_object('credited', false, 'already_credited', true);
    END IF;
    RAISE EXCEPTION 'ORDER_ALREADY_PAID_DIFFERENT_PAYMENT';
  END IF;
  IF v_order.status <> 'created' THEN RAISE EXCEPTION 'ORDER_NOT_PAYABLE'; END IF;
  IF p_amount_krw IS DISTINCT FROM v_order.amount_krw THEN RAISE EXCEPTION 'AMOUNT_MISMATCH'; END IF;

  UPDATE public.coin_orders SET status = 'paid', provider = p_provider, provider_payment_id = p_provider_payment_id, paid_at = now() WHERE id = v_order.id;
  INSERT INTO public.coin_purchases (order_id, user_id, coins, amount_krw, provider, provider_payment_id)
  VALUES (v_order.id, v_order.user_id, v_order.coins, v_order.amount_krw, p_provider, p_provider_payment_id) RETURNING id INTO v_purchase;
  INSERT INTO public.wallets (user_id, coins) VALUES (v_order.user_id, v_order.coins)
  ON CONFLICT (user_id) DO UPDATE SET coins = public.wallets.coins + EXCLUDED.coins, updated_at = now() RETURNING coins INTO v_balance;
  INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (v_order.user_id, v_order.coins, 'purchase', v_purchase::text, v_balance);

  -- 초대 보상: 이 사람의 첫 결제이고 보류 중인 초대 연결이 있을 때만
  SELECT inviter_id INTO v_inviter FROM public.referrals WHERE invitee_id = v_order.user_id AND status = 'pending' FOR UPDATE;
  IF v_inviter IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.coin_purchases WHERE user_id = v_order.user_id AND status = 'paid' AND id <> v_purchase
  ) THEN
    PERFORM 1 FROM public.invite_codes WHERE user_id = v_inviter FOR UPDATE;   -- 같은 초대자의 동시 보상 직렬화
    IF NOT EXISTS (SELECT 1 FROM public.coin_purchases WHERE user_id = v_inviter AND status = 'paid' AND coins >= 1) THEN v_reason := 'inviter_not_paid';
    ELSIF (SELECT count(*) FROM public.invite_rewards WHERE inviter_id = v_inviter AND created_at >= v_day_start) >= c_daily_cap THEN v_reason := 'daily_cap';
    ELSIF (SELECT count(*) FROM public.invite_rewards WHERE inviter_id = v_inviter AND created_at >= v_month_start) >= c_monthly_cap THEN v_reason := 'monthly_cap';
    END IF;
    IF v_reason IS NULL THEN
      INSERT INTO public.invite_rewards (invitee_id, inviter_id, purchase_id) VALUES (v_order.user_id, v_inviter, v_purchase);
      INSERT INTO public.wallets (user_id, coins) VALUES (v_inviter, c_reward)
      ON CONFLICT (user_id) DO UPDATE SET coins = public.wallets.coins + c_reward, updated_at = now() RETURNING coins INTO v_ibalance;
      INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (v_inviter, c_reward, 'referral_reward', v_purchase::text, v_ibalance);
      UPDATE public.referrals SET status = 'rewarded', resolved_at = now() WHERE invitee_id = v_order.user_id;
      v_referral := 'rewarded';
    ELSE
      UPDATE public.referrals SET status = 'skipped', reason = v_reason, resolved_at = now() WHERE invitee_id = v_order.user_id;
      v_referral := 'skipped:' || v_reason;
    END IF;
  END IF;
  RETURN jsonb_build_object('credited', true, 'balance', v_balance, 'purchase_id', v_purchase, 'referral', v_referral);
END;
$$;

-- 환불: 충전한 엽전이 아직 남아 있을 때만 자동 처리(이미 썼으면 수동 처리). 이 결제로 나간 초대 보상은 회수한다.
-- ※ 환불 가능 조건·기간은 약관/전자상거래법상 청약철회 고지와 맞아야 한다(법무 확인 필요) — 이 함수는 기술적 안전장치일 뿐이다.
CREATE OR REPLACE FUNCTION public.refund_purchase(p_provider text, p_provider_payment_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_p public.coin_purchases%ROWTYPE;
  v_balance integer;
  v_rw public.invite_rewards%ROWTYPE;
  v_ibalance integer;
  v_clawed boolean := false;
BEGIN
  SELECT * INTO v_p FROM public.coin_purchases WHERE provider = p_provider AND provider_payment_id = p_provider_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  IF v_p.status = 'refunded' THEN RETURN jsonb_build_object('refunded', false, 'already_refunded', true); END IF;
  SELECT coins INTO v_balance FROM public.wallets WHERE user_id = v_p.user_id FOR UPDATE;
  -- 엽전은 종류 구분 없이 한 잔액이라 "잔액이 충분한가"만으로는 유상분 사용 여부를 알 수 없다(보상으로 받은 엽전이 섞이면 이미 쓴 결제도 환불될 수 있음).
  -- 그래서 이 결제 이후 풀이 열람(spend)이 한 번이라도 있으면 사용 시작으로 보고 자동 환불하지 않는다(수동 처리). 환불 기간(예: 7일)은 정책 확정 후 추가.
  IF EXISTS (SELECT 1 FROM public.coin_ledger WHERE user_id = v_p.user_id AND reason = 'spend' AND created_at >= v_p.created_at)
    THEN RAISE EXCEPTION 'COINS_ALREADY_USED'; END IF;
  IF v_balance IS NULL OR v_balance < v_p.coins THEN RAISE EXCEPTION 'COINS_ALREADY_USED'; END IF;
  UPDATE public.wallets SET coins = coins - v_p.coins, updated_at = now() WHERE user_id = v_p.user_id;
  INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (v_p.user_id, -v_p.coins, 'refund', v_p.id::text, v_balance - v_p.coins);
  UPDATE public.coin_purchases SET status = 'refunded', refunded_at = now() WHERE id = v_p.id;
  UPDATE public.coin_orders SET status = 'canceled' WHERE id = v_p.order_id;

  SELECT * INTO v_rw FROM public.invite_rewards WHERE purchase_id = v_p.id AND clawed_back_at IS NULL FOR UPDATE;
  IF FOUND THEN
    SELECT coins INTO v_ibalance FROM public.wallets WHERE user_id = v_rw.inviter_id FOR UPDATE;
    IF v_ibalance IS NOT NULL AND v_ibalance >= 1 THEN
      UPDATE public.wallets SET coins = coins - 1, updated_at = now() WHERE user_id = v_rw.inviter_id;
      INSERT INTO public.coin_ledger (user_id, delta, reason, ref, balance_after) VALUES (v_rw.inviter_id, -1, 'reward_clawback', v_p.id::text, v_ibalance - 1);
      v_clawed := true;
    END IF;
    UPDATE public.invite_rewards SET clawed_back_at = now() WHERE invitee_id = v_rw.invitee_id;   -- 이미 쓴 경우에도 표시(수동 확인 대상)
  END IF;
  RETURN jsonb_build_object('refunded', true, 'balance', v_balance - v_p.coins, 'reward_clawed_back', v_clawed);
END;
$$;

-- ───────────── 권한 ─────────────
REVOKE ALL ON FUNCTION public.create_coin_order(uuid, integer), public.credit_purchase(uuid, text, text, integer), public.refund_purchase(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_coin_order(uuid, integer), public.credit_purchase(uuid, text, text, integer), public.refund_purchase(text, text)
  TO service_role;
-- 아래 세 함수는 CREATE OR REPLACE 로 교체했으므로 기존 ACL 이 유지된다(적용 후 재조회로 확인):
--   ensure_user_setup(), apply_invite(text), spend_coins(text, integer) → authenticated·service_role 실행 가능, anon 불가

-- 적용 후 검증(읽기 전용):
--   SELECT p.proname, p.proacl::text, p.proconfig FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
--    AND p.proname IN ('ensure_user_setup','apply_invite','spend_coins','create_coin_order','credit_purchase','refund_purchase') ORDER BY 1;
--   SELECT relname, relrowsecurity, relacl::text FROM pg_class WHERE relname IN ('coin_orders','coin_purchases','coin_ledger','referrals');
