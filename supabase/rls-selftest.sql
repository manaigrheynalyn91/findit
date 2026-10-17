-- FindIt access-control self-test (OWASP WSTG-ATHZ-02 / -03 style checks).
-- Creates two temporary students, tries allowed and forbidden actions as each
-- of them and as a logged-out visitor, then ROLLS EVERYTHING BACK.
-- Run in the Supabase SQL Editor; read the results in the error message.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  r1 uuid; r2 uuid; n int; t text := ''; v text; ok boolean;
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (a, 'selftest-a@findit.invalid', 'authenticated', 'authenticated', '{"full_name":"Alice Tester"}'),
         (b, 'selftest-b@findit.invalid', 'authenticated', 'authenticated', '{"full_name":"Bob Tester"}');
  select count(*) into n from public.profiles where id in (a,b);
  t := t || format(E'01 profiles auto-created on registration: %s\n', case when n=2 then 'PASS' else 'FAIL' end);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  insert into public.reports (report_type,item_name,category,description,location,item_date)
    values ('lost','Blue tumbler','Bottles & Tumblers','Blue with stickers','Library',current_date) returning id into r1;
  insert into public.reports (report_type,item_name,category,description,location,item_date)
    values ('found','Black umbrella','Umbrellas','Folding umbrella','Canteen',current_date) returning id into r2;
  t := t || E'02 A creates a lost and a found report: PASS\n';

  begin
    insert into public.reports (user_id,report_type,item_name,category,description,location,item_date)
      values (b,'lost','Spoofed','Keys','pretending to be B','Main Gate',current_date);
    t := t || E'03 A creates a report owned by B: FAIL (allowed)\n';
  exception when others then t := t || format(E'03 A creates a report owned by B: PASS (blocked %s)\n', sqlstate); end;

  begin
    insert into public.reports (report_type,item_name,category,description,location,item_date)
      values ('lost','Future','Keys','date in the future','Main Gate',current_date + 10);
    t := t || E'04 future date rejected: FAIL (allowed)\n';
  exception when others then t := t || format(E'04 future date rejected: PASS (%s)\n', sqlstate); end;

  insert into public.report_contacts (report_id, contact) values (r1, 'Messenger: Alice T.');
  t := t || E'05 A adds contact note to own report: PASS\n';

  update public.reports set status='resolved' where id=r1;
  select (resolved_at is not null) into ok from public.reports where id=r1;
  t := t || format(E'06 A resolves own report: %s\n', case when ok then 'PASS' else 'FAIL' end);
  update public.reports set status='open' where id=r1;
  select (resolved_at is null) into ok from public.reports where id=r1;
  t := t || format(E'07 A reopens own report: %s\n', case when ok then 'PASS' else 'FAIL' end);
  update public.reports set item_name='Blue Aquaflask tumbler' where id=r1;
  get diagnostics n = row_count;
  t := t || format(E'08 A edits own report: %s\n', case when n=1 then 'PASS' else 'FAIL' end);
  update public.reports set user_id=b where id=r1;
  select (user_id=a) into ok from public.reports where id=r1;
  t := t || format(E'09 A tries to transfer ownership to B: %s\n', case when ok then 'PASS (owner unchanged)' else 'FAIL' end);

  perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
  select count(*) into n from public.reports where id=r1;
  t := t || format(E'10 B can view A''s report: %s\n', case when n=1 then 'PASS' else 'FAIL' end);
  update public.reports set item_name='HACKED' where id=r1;
  get diagnostics n = row_count;
  t := t || format(E'11 B edits A''s report: %s\n', case when n=0 then 'PASS (0 rows changed)' else 'FAIL' end);
  update public.reports set status='resolved' where id=r2;
  get diagnostics n = row_count;
  t := t || format(E'12 B resolves A''s report: %s\n', case when n=0 then 'PASS (0 rows changed)' else 'FAIL' end);
  delete from public.reports where id=r1;
  get diagnostics n = row_count;
  t := t || format(E'13 B deletes A''s report: %s\n', case when n=0 then 'PASS (0 rows deleted)' else 'FAIL' end);
  begin
    insert into public.report_contacts (report_id, contact) values (r2, 'B hijacks contact');
    t := t || E'14 B attaches contact to A''s report: FAIL\n';
  exception when others then t := t || format(E'14 B attaches contact to A''s report: PASS (blocked %s)\n', sqlstate); end;
  update public.report_contacts set contact='changed' where report_id=r1;
  get diagnostics n = row_count;
  t := t || format(E'15 B edits A''s contact note: %s\n', case when n=0 then 'PASS (0 rows changed)' else 'FAIL' end);
  select contact into v from public.report_contacts where report_id=r1;
  t := t || format(E'16 B (signed in) can read contact note: %s\n', case when v is not null then 'PASS' else 'FAIL' end);
  select full_name into v from public.profiles where id=a;
  t := t || format(E'17 B can see reporter name: %s\n', case when v='Alice Tester' then 'PASS' else 'FAIL' end);

  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.reports where id in (r1,r2);
  t := t || format(E'18 logged-out visitor can browse reports: %s\n', case when n=2 then 'PASS' else 'FAIL' end);
  begin
    insert into public.reports (report_type,item_name,category,description,location,item_date)
      values ('lost','Anon post','Keys','no login','Main Gate',current_date);
    t := t || E'19 logged-out create: FAIL\n';
  exception when others then t := t || format(E'19 logged-out create: PASS (blocked %s)\n', sqlstate); end;
  begin
    update public.reports set item_name='x' where id=r1;
    t := t || E'20 logged-out edit: FAIL\n';
  exception when others then t := t || format(E'20 logged-out edit: PASS (blocked %s)\n', sqlstate); end;
  begin
    delete from public.reports where id=r1;
    t := t || E'21 logged-out delete: FAIL\n';
  exception when others then t := t || format(E'21 logged-out delete: PASS (blocked %s)\n', sqlstate); end;
  begin
    select contact into v from public.report_contacts limit 1;
    t := t || E'22 logged-out reads contact notes: FAIL\n';
  exception when others then t := t || format(E'22 logged-out reads contact notes: PASS (blocked %s)\n', sqlstate); end;
  begin
    select full_name into v from public.profiles limit 1;
    t := t || E'23 logged-out reads student names: FAIL\n';
  exception when others then t := t || format(E'23 logged-out reads student names: PASS (blocked %s)\n', sqlstate); end;
  select total_count::int into n from public.report_stats();
  t := t || format(E'24 logged-out can read totals: %s\n', case when n>=2 then 'PASS' else 'FAIL' end);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  delete from public.reports where id=r1;
  get diagnostics n = row_count;
  t := t || format(E'25 A deletes own report: %s\n', case when n=1 then 'PASS' else 'FAIL' end);
  perform set_config('role','postgres',true);
  select count(*) into n from public.report_contacts where report_id=r1;
  t := t || format(E'26 contact note deleted with its report: %s\n', case when n=0 then 'PASS' else 'FAIL' end);

  raise exception using message = E'SELFTEST RESULTS (all test data rolled back)\n' || t;
end $$;
