-- Phase 2: academic core schema

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  created_at timestamptz not null default now()
);

create table public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session text not null,
  term text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (student_id, session, term)
);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 5),
  start_time time not null,
  end_time time not null,
  subject_id uuid references public.subjects(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text,
  created_at timestamptz not null default now()
);

-- Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_subjects TO authenticated;
GRANT ALL ON public.class_subjects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- subjects: everyone signed in can read; admins manage
create policy "subjects_select" on public.subjects for select to authenticated using (true);
create policy "subjects_admin_all" on public.subjects for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- class_subjects: signed-in members can read the timetable/subject mix; admins manage; teachers see own rows
create policy "class_subjects_select" on public.class_subjects for select to authenticated using (true);
create policy "class_subjects_admin_all" on public.class_subjects for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- enrollments: staff/admin see all; a student sees their own; admins manage
create policy "enrollments_select" on public.enrollments for select to authenticated using (
  public.has_role(auth.uid(),'staff')
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.students s where s.id = enrollments.student_id and s.user_id = auth.uid())
);
create policy "enrollments_admin_all" on public.enrollments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- timetable: whole school reads its class timetable; admins manage
create policy "timetable_select" on public.timetable_slots for select to authenticated using (true);
create policy "timetable_admin_all" on public.timetable_slots for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Scale: indexes on every access path
create index enrollments_student_idx on public.enrollments(student_id);
create index enrollments_class_session_idx on public.enrollments(class_id, session, term);
create index class_subjects_class_idx on public.class_subjects(class_id);
create index class_subjects_teacher_idx on public.class_subjects(teacher_id);
create index timetable_slots_class_idx on public.timetable_slots(class_id);
create index subjects_name_idx on public.subjects(name);