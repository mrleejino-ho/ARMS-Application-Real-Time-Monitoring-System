-- Global application policy and student restriction synchronization.
-- Existing rows are preserved; new application_id values are populated by future syncs.

alter table public.applications
  add column if not exists is_restricted boolean not null default false;

alter table public.restricted_apps
  add column if not exists application_id uuid references public.applications(id) on delete cascade;

alter table public.restricted_apps
  add column if not exists updated_at timestamptz not null default now();

-- A student can have one current restriction record per registered application.
alter table public.restricted_apps
  drop constraint if exists restricted_apps_student_application_key;

alter table public.restricted_apps
  add constraint restricted_apps_student_application_key
  unique (student_id, application_id);

create index if not exists restricted_apps_student_id_idx
  on public.restricted_apps(student_id);

create index if not exists restricted_apps_application_id_idx
  on public.restricted_apps(application_id);

create index if not exists restricted_apps_active_idx
  on public.restricted_apps(is_active)
  where is_active = true;

create or replace function public.sync_restricted_apps_for_new_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'::user_role and new.status = 'active'::record_status then
    insert into public.restricted_apps (
      student_id,
      application_id,
      package_name,
      app_label,
      is_active,
      created_at,
      updated_at
    )
    select
      new.id,
      a.id,
      a.package_name,
      a.app_name,
      true,
      now(),
      now()
    from public.applications a
    where a.is_restricted = true
    on conflict (student_id, application_id)
    do update set
      package_name = excluded.package_name,
      app_label = excluded.app_label,
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_restricted_apps_after_student_insert on public.profiles;

create trigger sync_restricted_apps_after_student_insert
after insert on public.profiles
for each row
execute function public.sync_restricted_apps_for_new_student();

revoke all on function public.sync_restricted_apps_for_new_student() from public;
