-- 엽전 현금 판매 (설계안: 실행 전 검토 필요). 선불 결제수단·환불·약관에 대한 법률 검토가 끝나기 전에는 라이브 결제를 열지 않는다.
-- 1닢 = 900원, 묶음 할인 없음. 가격의 원천은 서버(coin_packs).
create table coin_packs (
  id text primary key, name text not null,
  coins integer not null check (coins > 0), price_krw integer not null check (price_krw > 0),
  active boolean not null default true
);
insert into coin_packs(id,name,coins,price_krw) values
 ('coin_1','한 닢',1,900), ('coin_2','두 닢',2,1800), ('coin_3','세 닢',3,2700), ('coin_4','네 닢',4,3600);
alter table coin_packs enable row level security; alter table coin_packs force row level security;
create policy coin_packs_read on coin_packs for select using (active);

-- 충전 주문은 orders(product_id='coin_pack', subject_id=팩 id)로 기록한다.
insert into products(id,name,price_krw,coin_cost,launch_status) values ('coin_pack','엽전 충전',0,0,'active');

-- PG 승인 확정 뒤 서버(Edge Function)에서만 호출. 같은 주문은 한 번만 적립(멱등키 coin_purchase:<order>), 금액 불일치면 거부.
create function credit_coin_purchase(p_order uuid, p_approved_amount integer) returns integer
language plpgsql security definer set search_path = public as $$
declare v_o orders; v_pack coin_packs; v_bal integer; v_key text;
begin
  select * into v_o from orders where id = p_order and product_id = 'coin_pack' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_pack from coin_packs where id = v_o.subject_id and active;
  if not found then raise exception 'PACK_UNAVAILABLE'; end if;
  if p_approved_amount <> v_pack.price_krw or v_o.amount_krw <> v_pack.price_krw then raise exception 'AMOUNT_MISMATCH'; end if;
  v_key := 'coin_purchase:' || p_order;
  if exists (select 1 from coin_ledger where idempotency_key = v_key) then
    select coalesce(sum(delta),0) into v_bal from coin_ledger where user_id = v_o.user_id; return v_bal;
  end if;
  perform pg_advisory_xact_lock(hashtext(v_o.user_id::text));
  select coalesce(sum(delta),0) into v_bal from coin_ledger where user_id = v_o.user_id;
  insert into coin_ledger(user_id,delta,reason,source_id,balance_after,idempotency_key)
    values (v_o.user_id, v_pack.coins, 'coin_purchase', p_order::text, v_bal + v_pack.coins, v_key);
  update orders set status = 'paid' where id = p_order;
  return v_bal + v_pack.coins;
end $$;
revoke all on function credit_coin_purchase(uuid,integer) from public, anon, authenticated;
