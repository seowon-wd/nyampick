-- 1) security definer 함수의 search_path를 ''로 두고 모든 이름에 스키마를 붙인다 (Supabase 권장).
-- 2) room_open이 방 행을 FOR SHARE로 잠근다. close_room의 FOR UPDATE와 충돌하므로
--    마감과 투표·후보 추가가 동시에 와도 "마감 후" 표가 남지 않는다.
-- create or replace라 기존 grant와 정책은 그대로 유지된다.

create or replace function public.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where room_id = p_room and user_id = auth.uid());
$$;

-- 잠금을 걸므로 volatile (stable 함수 안에서는 FOR SHARE를 쓸 수 없음)
create or replace function public.room_open(p_room uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_closed timestamptz;
begin
  select closed_at into v_closed from public.rooms where id = p_room for share;
  return found and v_closed is null;
end $$;

create or replace function public._clean_nickname(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p, ''));
begin
  if char_length(v) not between 1 and 20 then raise exception 'bad_nickname'; end if;
  return v;
end $$;

create or replace function public.create_room(nickname text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_nick text := public._clean_nickname(nickname);
  v_code text;
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  for i in 1..10 loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.rooms (code, host_id) values (v_code, auth.uid()) returning id into v_room;
      exit;
    exception when unique_violation then
      v_room := null;
    end;
  end loop;
  if v_room is null then raise exception 'code_exhausted'; end if;
  insert into public.members (room_id, user_id, nickname) values (v_room, auth.uid(), v_nick);
  return v_code;
end $$;

create or replace function public.join_room(code text, nickname text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_nick text := public._clean_nickname(nickname);
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select r.id into v_room from public.rooms r where r.code = join_room.code;
  if v_room is null then raise exception 'room_not_found'; end if;
  insert into public.members (room_id, user_id, nickname) values (v_room, auth.uid(), v_nick)
  on conflict on constraint members_pkey do update set nickname = excluded.nickname;
  return v_room;
end $$;

create or replace function public.close_room(room_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_room public.rooms%rowtype;
  v_winner text;
begin
  select * into v_room from public.rooms r where r.id = close_room.room_id for update;
  if not found or v_room.host_id is distinct from auth.uid() then raise exception 'not_host'; end if;
  if v_room.closed_at is not null then return v_room.winner_menu_id; end if;

  select c.menu_id into v_winner
  from public.candidates c
  left join public.votes v on v.candidate_id = c.id and v.room_id = c.room_id
  where c.room_id = v_room.id
  group by c.id
  order by count(v.user_id) desc, c.created_at asc, c.id asc
  limit 1;
  if v_winner is null then raise exception 'no_candidates'; end if;

  update public.rooms set closed_at = now(), winner_menu_id = v_winner where id = v_room.id;
  return v_winner;
end $$;
