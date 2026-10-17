-- =====================================================================
-- FindIt — School Lost and Found Management System
-- Supabase database setup: run once in the Supabase SQL Editor.
-- Security model: row-level security (RLS) on every table.
--   * Anyone can browse reports (no personal data in that table).
--   * Only signed-in students can create reports, and only as themselves.
--   * Only the student who created a report can edit/resolve/reopen/delete it.
--   * Names and contact notes are visible to signed-in students only.
-- =====================================================================

-- ---------- Profiles: one row per student account ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Signed-in students can view profiles" on public.profiles;
create policy "Signed-in students can view profiles"
  on public.profiles for select to authenticated using (true);
drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Create the profile automatically when a student registers
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Student'), 80));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in ('lost','found')),
  item_name text not null check (char_length(btrim(item_name)) between 2 and 80),
  category text not null check (category in ('Electronics','IDs & Cards','Bags & Wallets','Keys','Books & Notes','Clothing & Accessories','Bottles & Tumblers','Umbrellas','Others')),
  description text not null check (char_length(btrim(description)) between 5 and 600),
  location text not null check (location in ('Main Building','Library','Canteen','Gymnasium','Covered Court','Computer Laboratory','Classroom','Main Gate','Parking Area','Restroom','Other')),
  location_detail text check (location_detail is null or char_length(location_detail) <= 80),
  item_date date not null check (item_date >= date '2020-01-01' and item_date <= (now() at time zone 'Asia/Manila')::date + 1),
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_filters_idx on public.reports (status, report_type, category, location);

alter table public.reports enable row level security;

drop policy if exists "Anyone can view reports" on public.reports;
create policy "Anyone can view reports"
  on public.reports for select to anon, authenticated using (true);
drop policy if exists "Students create their own reports" on public.reports;
create policy "Students create their own reports"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Students update their own reports" on public.reports;
create policy "Students update their own reports"
  on public.reports for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Students delete their own reports" on public.reports;
create policy "Students delete their own reports"
  on public.reports for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Ownership and timestamps can't be tampered with; resolved_at is stamped automatically
create or replace function public.reports_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.updated_at := now();
  if new.status = 'resolved' and (tg_op = 'INSERT' or old.status <> 'resolved') then
    new.resolved_at := now();
  elsif new.status = 'open' then
    new.resolved_at := null;
  end if;
  return new;
end; $$;
drop trigger if exists reports_before_write on public.reports;
create trigger reports_before_write
  before insert or update on public.reports
  for each row execute function public.reports_before_write();

-- ---------- Optional contact note (signed-in students only) ----------
create table if not exists public.report_contacts (
  report_id uuid primary key references public.reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact text not null check (char_length(btrim(contact)) between 3 and 120)
);
create index if not exists report_contacts_user_id_idx on public.report_contacts (user_id);
alter table public.report_contacts enable row level security;

drop policy if exists "Signed-in students can view contact notes" on public.report_contacts;
create policy "Signed-in students can view contact notes"
  on public.report_contacts for select to authenticated using (true);
drop policy if exists "Owners add contact notes to their own reports" on public.report_contacts;
create policy "Owners add contact notes to their own reports"
  on public.report_contacts for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.reports r where r.id = report_id and r.user_id = (select auth.uid())));
drop policy if exists "Owners update their contact notes" on public.report_contacts;
create policy "Owners update their contact notes"
  on public.report_contacts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Owners delete their contact notes" on public.report_contacts;
create policy "Owners delete their contact notes"
  on public.report_contacts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- Campus-wide totals for the home page ----------
create or replace function public.report_stats()
returns table (open_count bigint, resolved_count bigint, total_count bigint)
language sql stable security invoker set search_path = '' as $$
  select count(*) filter (where status = 'open'),
         count(*) filter (where status = 'resolved'),
         count(*)
  from public.reports;
$$;

-- ---------- Grants: least privilege ----------
revoke all on public.reports, public.report_contacts, public.profiles from anon;
grant select on public.reports to anon;
grant select, insert, update, delete on public.reports, public.report_contacts to authenticated;
grant select, update on public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.reports_before_write() from public, anon, authenticated;
grant execute on function public.report_stats() to anon, authenticated;

select 'FindIt database is ready' as status;
