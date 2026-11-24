-- 이 프로젝트는 새 테이블에 API 역할 권한을 자동으로 주지 않는다. 필요한 것만 authenticated에 준다(행 단위는 RLS가 막음).
grant select on public.rooms, public.members, public.candidates, public.votes to authenticated;
grant insert on public.candidates to authenticated;
grant insert, update on public.votes to authenticated;
