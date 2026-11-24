-- 2단계 함께 고르기: 방, 참여자, 후보, 투표
-- 설계: docs/superpowers/specs/2026-11-24-together-design.md

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- shortcut: 코드 공간 100만 개를 닫힌 방도 계속 차지함, 방이 수십만 개 쌓이면 진행 중인 방만 유일하게 바꾼다
  code text not null unique check (code ~ '^[0-9]{6}$'),
  host_id uuid not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  winner_menu_id text
);

create table public.members (
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null,
  nickname text not null check (char_length(nickname) between 1 and 20),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.candidates (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms on delete cascade,
  menu_id text not null check (menu_id ~ '^m[0-9]{2,3}$'),
  added_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (room_id, menu_id),
  unique (room_id, id)
);

create table public.votes (
  room_id uuid not null,
  user_id uuid not null default auth.uid(),
  candidate_id bigint not null,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id),
  -- 다른 방의 후보에 투표하지 못하게 복합 FK
  foreign key (room_id, candidate_id) references public.candidates (room_id, id) on delete cascade
);

alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

-- 로그인 안 한 요청(anon)은 아무것도 못 한다. 익명 로그인 사용자는 authenticated.
revoke all on public.rooms, public.members, public.candidates, public.votes from anon;

-- ── 권한 확인 함수 (RLS 안에서 members/rooms를 재귀 없이 보려고 security definer)
create function public.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where room_id = p_room and user_id = auth.uid());
$$;

create function public.room_open(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rooms where id = p_room and closed_at is null);
$$;

-- ── 정책
create policy rooms_select on public.rooms for select to authenticated using (is_member(id));
create policy members_select on public.members for select to authenticated using (is_member(room_id));
create policy candidates_select on public.candidates for select to authenticated using (is_member(room_id));
create policy candidates_insert on public.candidates for insert to authenticated
  with check (is_member(room_id) and room_open(room_id) and added_by = auth.uid());
create policy votes_select on public.votes for select to authenticated using (is_member(room_id));
create policy votes_insert on public.votes for insert to authenticated
  with check (user_id = auth.uid() and is_member(room_id) and room_open(room_id));
create policy votes_update on public.votes for update to authenticated
  using (user_id = auth.uid() and is_member(room_id) and room_open(room_id))
  with check (user_id = auth.uid() and is_member(room_id) and room_open(room_id));

-- ── RPC
create function public._clean_nickname(p text) returns text
language plpgsql immutable as $$
declare v text := btrim(coalesce(p, ''));
begin
  if char_length(v) not between 1 and 20 then raise exception 'bad_nickname'; end if;
  return v;
end $$;

create function public.create_room(nickname text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_nick text := _clean_nickname(nickname);
  v_code text;
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  for i in 1..10 loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into rooms (code, host_id) values (v_code, auth.uid()) returning id into v_room;
      exit;
    exception when unique_violation then
      v_room := null;
    end;
  end loop;
  if v_room is null then raise exception 'code_exhausted'; end if;
  insert into members (room_id, user_id, nickname) values (v_room, auth.uid(), v_nick);
  return v_code;
end $$;

create function public.join_room(code text, nickname text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_nick text := _clean_nickname(nickname);
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select r.id into v_room from rooms r where r.code = join_room.code;
  if v_room is null then raise exception 'room_not_found'; end if;
  insert into members (room_id, user_id, nickname) values (v_room, auth.uid(), v_nick)
  on conflict on constraint members_pkey do update set nickname = excluded.nickname;
  return v_room;
end $$;

create function public.close_room(room_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
  v_winner text;
begin
  -- 동시에 두 번 불려도 같은 결과가 나오게 방 행을 잠근다
  select * into v_room from rooms r where r.id = close_room.room_id for update;
  if not found or v_room.host_id is distinct from auth.uid() then raise exception 'not_host'; end if;
  if v_room.closed_at is not null then return v_room.winner_menu_id; end if;

  -- 득표 내림차순, 동점이면 먼저 추가된 후보
  select c.menu_id into v_winner
  from candidates c
  left join votes v on v.candidate_id = c.id and v.room_id = c.room_id
  where c.room_id = v_room.id
  group by c.id
  order by count(v.user_id) desc, c.created_at asc, c.id asc
  limit 1;
  if v_winner is null then raise exception 'no_candidates'; end if;

  update rooms set closed_at = now(), winner_menu_id = v_winner where id = v_room.id;
  return v_winner;
end $$;

revoke execute on function public.is_member(uuid), public.room_open(uuid), public._clean_nickname(text),
  public.create_room(text), public.join_room(text, text), public.close_room(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.room_open(uuid), public._clean_nickname(text),
  public.create_room(text), public.join_room(text, text), public.close_room(uuid) to authenticated;

-- ── Realtime
alter publication supabase_realtime add table public.rooms, public.members, public.candidates, public.votes;
