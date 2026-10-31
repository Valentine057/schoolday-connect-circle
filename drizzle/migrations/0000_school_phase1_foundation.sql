-- School platform: Phase 1 foundation schema

create type public.app_role as enum ('student', 'staff', 'parent', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon, service_role;

create table public.school_settings (
  id integer primary key default 1 check (id = 1),
  school_name text not null default 'Greenfield Academy',
  motto text not null default 'Knowledge · Character · Service',
  currency_code text not null default 'GHS',
  currency_symbol text not null default 'GH₵',
  grading_scale jsonb not null default '[{"grade":"A","min":80},{"grade":"B","min":70},{"grade":"C","min":60},{"grade":"D","min":50},{"grade":"E","min":45},{"grade":"F","min":0}]'::jsonb,
  current_session text not null default '2025/2026',
  current_term text not null default 'First Term',
  updated_at timestamptz not null default now()
);

insert into public.school_settings (id) values (1) on conflict do nothing;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level text not null,
  created_at timestamptz not null default now()
);

insert into public.classes (name, level) values
  ('Primary 1','Primary'),('Primary 2','Primary'),('Primary 3','Primary'),
  ('Primary 4','Primary'),('Primary 5','Primary'),('Primary 6','Primary'),
  ('Junior Secondary 1','Junior Secondary'),('Junior Secondary 2','Junior Secondary'),('Junior Secondary 3','Junior Secondary'),
  ('Senior Secondary 1','Senior Secondary'),('Senior Secondary 2','Senior Secondary'),('Senior Secondary 3','Senior Secondary')
on conflict do nothing;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  admission_no text unique,
  class_id uuid references public.classes(id),
  class_requested text,
  date_of_birth date,
  gender text,
  guardian_name text,
  guardian_phone text,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cls uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict do nothing;

  insert into public.students (
    user_id, class_requested, date_of_birth, gender,
    guardian_name, guardian_phone
  ) values (
    new.id,
    nullif(new.raw_user_meta_data->>'class_requested', ''),
    nullif(new.raw_user_meta_data->>'date_of_birth', '')::date,
    nullif(new.raw_user_meta_data->>'gender', ''),
    nullif(new.raw_user_meta_data->>'guardian_name', ''),
    nullif(new.raw_user_meta_data->>'guardian_phone', '')
  );

  return new;
exception
  when others then
    return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
GRANT SELECT ON public.classes TO authenticated, anon;
GRANT ALL ON public.classes TO service_role;
GRANT SELECT, UPDATE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_admin_select" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "user_roles_admin_all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "students_select_own_or_staff" on public.students for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin'));
create policy "students_insert_own" on public.students for insert to authenticated with check (user_id = auth.uid());
create policy "students_update_own" on public.students for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "students_admin_all" on public.students for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (true);

create policy "classes_read_authenticated" on public.classes for select to authenticated using (true);
create policy "classes_read_anon" on public.classes for select to anon using (true);
create policy "classes_admin_all" on public.classes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "settings_read" on public.school_settings for select to authenticated using (true);
create policy "settings_admin_update" on public.school_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create index students_user_id_idx on public.students(user_id);
create index user_roles_user_id_idx on public.user_roles(user_id);
create index students_class_id_idx on public.students(class_id);