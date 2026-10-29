-- 가격표·상품 확장·결제 기록 표 — REVIEW ONLY. 실행 금지(미적용). 사용자 결정(2026-10-21): 1닢 = 900원
--   기본 사주 900원=1닢, 궁합 900원=1닢, 심층 연애운 1,800원=2닢, 택일 1,800원=2닢, 심층 사주 2,700원=3닢
-- 내용
--   1) reading_price_catalog 의 reading_type 허용 목록 확장(basic, compat → + love, taekil, deep)
--   2) 가격 설정(설정 표 갱신 — 회원 데이터 아님). 신규 상품은 active=false 로 만든다. 기존 행의 active 는 건드리지 않는다.
--   (spend_coins 의 새 상품 id 허용, 결제 기록·원장 표는 COINS_PAYMENTS_REFERRAL_REVIEW_ONLY.sql — 이 파일 다음에 적용)
-- 활성화(active=true)는 이 파일에 없다 — 결제·엔진 검증·사용자 승인 뒤 별도 단계.
-- 롤백: 운영 스냅샷(R015 0단계)의 이전 가격표 값과 CHECK 제약으로 되돌린다.

-- 1) 허용 상품 확장
ALTER TABLE public.reading_price_catalog DROP CONSTRAINT IF EXISTS reading_price_catalog_reading_type_check;
ALTER TABLE public.reading_price_catalog
  ADD CONSTRAINT reading_price_catalog_reading_type_check
  CHECK (reading_type = ANY (ARRAY['basic'::text, 'compat'::text, 'love'::text, 'taekil'::text, 'deep'::text]));

-- 2) 가격(닢). active 는 갱신하지 않는다(신규 행은 명시적으로 false, 충돌 시 갱신 목록에 active 가 없어 기존 값 유지)
INSERT INTO public.reading_price_catalog (reading_type, price_coins, active) VALUES
  ('basic', 1, false), ('compat', 1, false), ('love', 2, false), ('taekil', 2, false), ('deep', 3, false)
ON CONFLICT (reading_type) DO UPDATE SET price_coins = EXCLUDED.price_coins, updated_at = now();

-- 적용 후 검증(읽기 전용):
--   SELECT reading_type, price_coins, active FROM public.reading_price_catalog ORDER BY 1;   -- 기대: 1,1,2,2,3 / 전부 active=false
