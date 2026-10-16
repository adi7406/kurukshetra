-- Migration: 0005_test_series_and_attempts.sql
-- Description: Schema and RLS policies for test series, assessment attempts, and student answers.

-- 1. Test series
create table if not exists public.test_series (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Test series items
create table if not exists public.test_series_items (
  id uuid primary key default gen_random_uuid(),
  test_series_id uuid not null references public.test_series(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (test_series_id, assessment_id),
  unique (test_series_id, position)
);

-- 3. Assessment attempts
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'evaluating', 'completed', 'abandoned', 'failed_infrastructure')),
  score numeric check (score is null or score >= 0),
  max_score numeric check (max_score is null or max_score >= 0),
  passed boolean,
  result_metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  unique (assessment_id, student_id, attempt_number)
);

-- 4. Student answers
create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  answer_payload jsonb not null,
  score numeric,
  max_score numeric,
  is_correct boolean,
  feedback text,
  evaluation_status text not null default 'pending'
    check (evaluation_status in ('pending', 'evaluated', 'needs_review', 'failed')),
  submitted_at timestamptz not null default now(),
  evaluated_at timestamptz,
  unique (attempt_id, question_version_id)
);

-- Enable RLS
alter table public.test_series enable row level security;
alter table public.test_series_items enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.student_answers enable row level security;

-- Test series RLS: Published readable by enrolled students; full management by trainers
create policy "Enrolled students can view published test series"
  on public.test_series for select
  using (
    status = 'published' and exists (
      select 1 from public.enrollments e
      where e.course_id = test_series.course_id and e.student_id = auth.uid() and e.status = 'active'
    )
    or created_by = auth.uid()
    or public.is_trainer()
  );

create policy "Trainers can manage test series"
  on public.test_series for all
  using (public.is_trainer() or public.is_admin());

create policy "Test series items readable according to parent series"
  on public.test_series_items for select
  using (
    exists (
      select 1 from public.test_series ts
      where ts.id = test_series_items.test_series_id and (
        ts.status = 'published' or ts.created_by = auth.uid() or public.is_trainer()
      )
    )
  );

create policy "Trainers can manage test series items"
  on public.test_series_items for all
  using (public.is_trainer() or public.is_admin());

-- Assessment attempts RLS: Students can access their own attempts; trainers can view course attempts
create policy "Students can manage own active attempts"
  on public.assessment_attempts for select
  using (
    student_id = auth.uid()
    or public.is_trainer()
    or public.is_admin()
  );

create policy "Students can insert own attempts"
  on public.assessment_attempts for insert
  with check (student_id = auth.uid());

create policy "Students can update own active attempts"
  on public.assessment_attempts for update
  using (student_id = auth.uid());

-- Student answers RLS: Attempt owner can read/write their answers; trainers can read
create policy "Attempt owner can access their answers"
  on public.student_answers for select
  using (
    exists (
      select 1 from public.assessment_attempts aa
      where aa.id = student_answers.attempt_id and (
        aa.student_id = auth.uid() or public.is_trainer() or public.is_admin()
      )
    )
  );

create policy "Attempt owner can insert and update answers while attempt is in_progress"
  on public.student_answers for all
  using (
    exists (
      select 1 from public.assessment_attempts aa
      where aa.id = student_answers.attempt_id and aa.student_id = auth.uid() and aa.status = 'in_progress'
    )
  );
