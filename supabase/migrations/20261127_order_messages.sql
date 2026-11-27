-- Messages between the buyer (order page) and the owner (admin page or Claude) on one order.
create table public.messages (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  sender text not null check (sender in ('buyer', 'owner')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_order_id_idx on public.messages (order_id, id);
create index messages_unread_idx on public.messages (order_id) where read_at is null;

-- Same lock-down as the other tables: RLS on, no policies, only the service role gets in.
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;

-- Buyer sends a message from their order page. Rate limited per order.
create or replace function public.buyer_send_message(p_token text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o record;
  m record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  select id, ref, name, startup into o from orders where token = p_token;
  if not found then raise exception 'no_order'; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception 'bad_body'; end if;
  if (select count(*) from messages
      where order_id = o.id and sender = 'buyer' and created_at > now() - interval '10 minutes') >= 8 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from messages where order_id = o.id) >= 500 then raise exception 'thread_full'; end if;
  insert into messages (order_id, sender, body) values (o.id, 'buyer', v_body) returning id, created_at into m;
  return jsonb_build_object('ref', o.ref, 'name', o.name, 'startup', o.startup,
    'message', jsonb_build_object('id', m.id, 'from', 'buyer', 'body', v_body, 'at', m.created_at));
end $$;

-- Buyer's page polls this. Returns messages after p_after, marks the owner's ones as read,
-- and says how far the owner has read the buyer's messages.
create or replace function public.buyer_messages(p_token text, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  select id into v_order from orders where token = p_token;
  if not found then return null; end if;
  update messages set read_at = now() where order_id = v_order and sender = 'owner' and read_at is null;
  return jsonb_build_object(
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender, 'body', m.body, 'at', m.created_at) order by m.id)
                          from messages m where m.order_id = v_order and m.id > coalesce(p_after, 0)), '[]'::jsonb),
    'seen_upto', coalesce((select max(m.id) from messages m where m.order_id = v_order and m.sender = 'buyer' and m.read_at is not null), 0)
  );
end $$;

-- Owner replies (admin page, or Claude: select public.owner_send_message('IMTP-XXXXX', 'text');).
create or replace function public.owner_send_message(p_ref text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o record;
  m record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  select id, ref into o from orders where ref = p_ref;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception 'Message must be 1 to 2000 characters'; end if;
  insert into messages (order_id, sender, body) values (o.id, 'owner', v_body) returning id, created_at into m;
  update messages set read_at = now() where order_id = o.id and sender = 'buyer' and read_at is null;
  return jsonb_build_object('id', m.id, 'from', 'owner', 'body', v_body, 'at', m.created_at);
end $$;

-- Owner reads the thread (admin page, or Claude: select public.owner_messages('IMTP-XXXXX');).
-- Marks the buyer's messages as read.
create or replace function public.owner_messages(p_ref text, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  select id into v_order from orders where ref = p_ref;
  if not found then raise exception 'Order % not found', p_ref; end if;
  update messages set read_at = now() where order_id = v_order and sender = 'buyer' and read_at is null;
  return jsonb_build_object(
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender, 'body', m.body, 'at', m.created_at) order by m.id)
                          from messages m where m.order_id = v_order and m.id > coalesce(p_after, 0)), '[]'::jsonb),
    'seen_upto', coalesce((select max(m.id) from messages m where m.order_id = v_order and m.sender = 'owner' and m.read_at is not null), 0)
  );
end $$;

revoke all on function public.buyer_send_message(text, text) from public, anon, authenticated;
revoke all on function public.buyer_messages(text, bigint) from public, anon, authenticated;
revoke all on function public.owner_send_message(text, text) from public, anon, authenticated;
revoke all on function public.owner_messages(text, bigint) from public, anon, authenticated;
grant execute on function public.buyer_send_message(text, text) to service_role;
grant execute on function public.buyer_messages(text, bigint) to service_role;
grant execute on function public.owner_send_message(text, text) to service_role;
grant execute on function public.owner_messages(text, bigint) to service_role;
