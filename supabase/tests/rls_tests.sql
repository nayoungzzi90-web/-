-- RLS 통과/거부 테스트 (Supabase SQL Editor 또는 psql 에서 마이그레이션 후 실행). 모두 NOTICE 'PASS' 가 나와야 한다.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); r uuid; n int;
begin
  insert into auth.users(id,email) values (a,'a@t.io'),(b,'b@t.io');
  insert into orders(id,user_id,product_id,subject_id,amount_krw,method,status,idempotency_key) values (gen_random_uuid(),a,'basic','c',990,'cash','paid','k-a');
  insert into reports(id,user_id,product_id,subject_id) values (gen_random_uuid(),a,'basic','c') returning id into r;

  set local role authenticated; perform set_config('request.jwt.claim.sub', b::text, true);
  select count(*) into n from reports where id = r;            assert n = 0, 'FAIL: B 가 A 의 리포트를 읽음';
  select count(*) into n from orders;                          assert n = 0, 'FAIL: B 가 A 의 주문을 읽음';
  begin insert into coin_ledger(user_id,delta,reason,source_id,balance_after,idempotency_key) values (b,100,'x','x',100,'hack'); assert false, 'FAIL: 클라이언트가 원장 INSERT';
  exception when insufficient_privilege or others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform redeem_coins(b,'basic','c'); assert false, 'FAIL: 클라이언트가 redeem_coins 호출';
  exception when insufficient_privilege or others then if sqlerrm like 'FAIL%' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', a::text, true);
  select count(*) into n from reports where id = r;            assert n = 1, 'FAIL: A 가 자기 리포트를 못 읽음';
  reset role;
  raise exception 'PASS: RLS 허용/거부 확인 (테스트 데이터 롤백을 위한 의도된 예외)';
end $$;
