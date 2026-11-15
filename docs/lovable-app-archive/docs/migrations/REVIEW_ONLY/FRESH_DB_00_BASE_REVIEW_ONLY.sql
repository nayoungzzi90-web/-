-- 새 Supabase 프로젝트용 기본 구조 — REVIEW ONLY. 실행 금지(미적용). 새(빈) DB 전용이다.
-- 출처: src/integrations/supabase/types.ts(앱이 읽는 표 6개) + R015 문서의 권한 모델(birth_profiles 본인 ALL, 나머지 본인 SELECT).
-- 한계: 옛 운영 DB 의 실제 정책·제약은 확인한 적이 없다(스냅샷을 뜨지 않음). 이 파일은 "옛 DB 복제"가 아니라 앱 코드에 맞춘 새 정의다.
-- 적용 순서(새 DB, 한 단계씩 승인):
--   00 이 파일 → PRICING_900_COIN → COINS_PAYMENTS_REFERRAL → R015_SAJU_RATE_LIMIT_v2 → R015_LEAST_PRIVILEGE
--   (선택, 해당 기능을 켤 때) AI_READINGS, ACCOUNT_DELETION
-- birth_input_original 은 R001 보강 컬럼이라 여기서 처음부터 포함한다(R001_BIRTH_INPUT_ORIGINAL 파일은 새 DB 에는 필요 없다).
-- 가입 보너스 없음. 카탈로그는 비워 두고 가격·상품은 PRICING_900_COIN 이 넣는다(전부 active=false).
-- 롤백: 새 DB 이므로 프로젝트를 지우고 다시 만든다.

CREATE TABLE IF NOT EXISTS public.birth_profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name                 text NOT NULL,
  calendar             text NOT NULL DEFAULT 'solar' CHECK (calendar IN ('solar', 'lunar')),
  leap                 boolean NOT NULL DEFAULT false,
  birth_date           date NOT NULL DEFAULT current_date,
  birth_input_original text NULL,
  birth_time           text NULL,
  gender               text NOT NULL DEFAULT 'f' CHECK (gender IN ('f', 'm')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  coins      integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unlocked_readings (
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reading_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reading_id)
);

CREATE TABLE IF NOT EXISTS public.invite_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invite_rewards (
  invitee_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reading_price_catalog (
  reading_type text PRIMARY KEY,
  price_coins  integer NOT NULL,
  active       boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_price_catalog_price_coins_check CHECK (price_coins > 0),
  CONSTRAINT reading_price_catalog_reading_type_check CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text]))
);

ALTER TABLE public.birth_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_readings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_rewards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_price_catalog ENABLE ROW LEVEL SECURITY;   -- 정책 없음 = 클라이언트 접근 불가

DROP POLICY IF EXISTS "own birth profile" ON public.birth_profiles;
CREATE POLICY "own birth profile" ON public.birth_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "read own wallet" ON public.wallets;
CREATE POLICY "read own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read own unlocked" ON public.unlocked_readings;
CREATE POLICY "read own unlocked" ON public.unlocked_readings FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read own invite code" ON public.invite_codes;
CREATE POLICY "read own invite code" ON public.invite_codes FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read own invite rewards" ON public.invite_rewards;
CREATE POLICY "read own invite rewards" ON public.invite_rewards FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
