insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('odyssey-campus-covers', 'odyssey-campus-covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Read own Odyssey campus covers"
on storage.objects for select to authenticated
using (bucket_id = 'odyssey-campus-covers' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Upload own Odyssey campus covers"
on storage.objects for insert to authenticated
with check (bucket_id = 'odyssey-campus-covers' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Delete own Odyssey campus covers"
on storage.objects for delete to authenticated
using (bucket_id = 'odyssey-campus-covers' and (storage.foldername(name))[1] = (select auth.uid()::text));
