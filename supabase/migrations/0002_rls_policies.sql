-- Migration: 0002_rls_policies.sql
-- Description: Authoritative Row Level Security policies for core entities.

-- Helper function to check if caller is an admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper function to check if caller is a trainer
create or replace function public.is_trainer()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('trainer', 'admin')
  );
$$;

-- ==========================================
-- COURSES POLICIES
-- ==========================================
create policy "Courses are readable if published or owned or admin"
  on public.courses for select
  using (
    status = 'published'
    or created_by = auth.uid()
    or exists (
      select 1 from public.course_trainers ct
      where ct.course_id = courses.id and ct.trainer_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "Trainers and admins can create courses"
  on public.courses for insert
  with check (
    public.is_trainer() and created_by = auth.uid()
  );

create policy "Course creators, assigned editors, and admins can update courses"
  on public.courses for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.course_trainers ct
      where ct.course_id = courses.id
        and ct.trainer_id = auth.uid()
        and ct.permission_level in ('owner', 'editor')
    )
    or public.is_admin()
  );

-- ==========================================
-- ENROLLMENTS POLICIES
-- ==========================================
create policy "Students can view own enrollments; trainers see course enrollments"
  on public.enrollments for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id
        and (c.created_by = auth.uid() or public.is_admin())
    )
    or exists (
      select 1 from public.course_trainers ct
      where ct.course_id = enrollments.course_id and ct.trainer_id = auth.uid()
    )
  );

create policy "Students can enroll in published courses; admins/trainers can manage"
  on public.enrollments for insert
  with check (
    (student_id = auth.uid() and exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.status = 'published'
    ))
    or public.is_trainer()
  );

-- ==========================================
-- MODULES & CONCEPTS POLICIES
-- ==========================================
create policy "Modules are readable if course is visible"
  on public.modules for select
  using (
    exists (
      select 1 from public.course_versions cv
      join public.courses c on c.id = cv.course_id
      where cv.id = modules.course_version_id
        and (c.status = 'published' or c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "Concepts are readable if module is visible"
  on public.concepts for select
  using (
    exists (
      select 1 from public.modules m
      join public.course_versions cv on cv.id = m.course_version_id
      join public.courses c on c.id = cv.course_id
      where m.id = concepts.module_id
        and (c.status = 'published' or c.created_by = auth.uid() or public.is_admin())
    )
  );
