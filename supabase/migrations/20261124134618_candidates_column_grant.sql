-- 후보 추가는 room_id, menu_id만 쓸 수 있다. created_at(동점 순서)과 added_by는 서버 기본값으로만 채운다.
revoke insert on public.candidates from authenticated;
grant insert (room_id, menu_id) on public.candidates to authenticated;
