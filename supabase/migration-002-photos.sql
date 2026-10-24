-- =====================================================================
-- FindIt migration 002: optional item photos
-- Run once in the Supabase SQL Editor (after schema.sql).
-- * Photos live in a public Storage bucket so anyone browsing can see them.
-- * Each student can upload, replace, or delete files only inside a folder
--   named after their own user id.
-- * A report may only point to a photo in its owner's folder.
-- =====================================================================

alter table public.reports add column if not exists photo_path text;

alter table public.reports drop constraint if exists reports_photo_path_check;
alter table public.reports add constraint reports_photo_path_check check (
  photo_path is null or (
    photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$'
    and split_part(photo_path, '/', 1) = user_id::text
  )
);

-- Bucket: public read, 2 MB limit, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage rules: students manage only their own folder
drop policy if exists "FindIt: students read own photo objects" on storage.objects;
create policy "FindIt: students read own photo objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "FindIt: students upload to own folder" on storage.objects;
create policy "FindIt: students upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "FindIt: students update own photos" on storage.objects;
create policy "FindIt: students update own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "FindIt: students delete own photos" on storage.objects;
create policy "FindIt: students delete own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

select 'FindIt photos are ready' as status;
