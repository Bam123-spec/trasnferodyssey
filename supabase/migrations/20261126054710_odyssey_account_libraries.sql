create table public.odyssey_libraries (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  library jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  constraint odyssey_library_shape check (
    jsonb_typeof(library) = 'object'
    and library @> '{"version": 1}'::jsonb
    and (jsonb_typeof(library -> 'universities') = 'array') is true
    and (jsonb_typeof(library -> 'collections') = 'array') is true
    and (library ->> 'view' in ('grid', 'list')) is true
    and (jsonb_typeof(library -> 'sidebarCollapsed') = 'boolean') is true
  )
);

alter table public.odyssey_libraries enable row level security;

revoke all on table public.odyssey_libraries from public, anon, authenticated;
grant select on table public.odyssey_libraries to authenticated;
grant insert (owner_id, library), update (library, revision) on table public.odyssey_libraries to authenticated;

create policy "Read own Odyssey library"
on public.odyssey_libraries for select to authenticated
using (owner_id = (select auth.uid()));

create policy "Create own Odyssey library"
on public.odyssey_libraries for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "Update own Odyssey library"
on public.odyssey_libraries for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
