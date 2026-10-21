-- 가격표·상품 확장·결제 기록 표 — REVIEW ONLY. 실행 금지(미적용). 사용자 결정(2026-10-21): 1닢 = 900원
--   기본 사주 900원=1닢, 궁합 900원=1닢, 심층 연애운 1,800원=2닢, 택일 1,800원=2닢, 심층 사주 2,700원=3닢
-- 내용
--   1) reading_price_catalog 의 reading_type 허용 목록 확장(basic, compat → + love, taekil, deep)
--   2) 가격 설정(설정 표 갱신 — 회원 데이터 아님). 신규 상품은 active=false 로 만든다. 기존 행의 active 는 건드리지 않는다.
--   3) spend_coins 가 새 상품 id 를 받도록 교체(로직·검증·잠금은 기존과 동일, 허용 id 만 늘어남)
--   4) coin_purchases(결제 기록) 표 신설 — 클라이언트 접근 없음, service_role 만. 결제 연동(4단계)이 이 표에 기록하고 같은 트랜잭션에서 지갑을 충전한다.
-- 활성화(active=true)는 이 파일에 없다 — 결제·엔진 검증·사용자 승인 뒤 별도 단계.
-- 롤백: 운영 스냅샷(R015 0단계)의 이전 spend_coins 본문과 가격표 값으로 되돌린다. coin_purchases 는 비어 있을 때만 DROP.

-- 1) 허용 상품 확장
ALTER TABLE public.reading_price_catalog DROP CONSTRAINT IF EXISTS reading_price_catalog_reading_type_check;
ALTER TABLE public.reading_price_catalog
  ADD CONSTRAINT reading_price_catalog_reading_type_check
  CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text, 'love'::text, 'taekil'::text, 'deep'::text]));

-- 2) 가격(닢). active 는 갱신하지 않는다(기존 행은 그대로, 신규는 기본값 false)
INSERT INTO public.reading_price_catalog (reading_type, price_coins) VALUES
  ('basic', 1), ('compat', 1), ('love', 2), ('taekil', 2), ('deep', 3)
ON CONFLICT (reading_type) DO UPDATE SET price_coins = EXCLUDED.price_coins, updated_at = now();

-- 3) spend_coins — 허용 id 만 확장. 나머지(가격 재검증, 지갑 행 잠금, 이미 연 풀이는 재차감 없음)는 기존과 같다.
CREATE OR REPLACE FUNCTION public.spend_coins(p_reading_id text, p_cost integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  RETURN v_balance - v_expected;
END;
$$;

-- 4) 결제 기록. 클라이언트(anon/authenticated)는 접근 불가. public 스키마 기본 권한이 새 표에 anon/authenticated 를 자동 부여하므로 명시적으로 회수한다.
CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL,
  coins               integer     NOT NULL CHECK (coins >= 1),
  amount_krw          integer     NOT NULL CHECK (amount_krw > 0),
  provider            text        NOT NULL,
  provider_payment_id text        NOT NULL,
  status              text        NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS coin_purchases_user_paid_idx ON public.coin_purchases (user_id) WHERE status = 'paid';
ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;   -- 정책 없음 = 클라이언트 전면 차단
REVOKE ALL ON public.coin_purchases FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coin_purchases TO service_role;

-- 적용 후 검증(읽기 전용):
--   SELECT reading_type, price_coins, active FROM public.reading_price_catalog ORDER BY 1;   -- 기대: 1,1,2,2,3 / 전부 active=false
--   SELECT relacl::text FROM pg_class WHERE relname = 'coin_purchases';                       -- 기대: postgres, service_role 만
