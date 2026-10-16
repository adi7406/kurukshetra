-- Migration: 0004_question_bank_and_assessments.sql
-- Description: Schema and RLS policies for questions, question versions, answers, rubrics, coding test cases, and assessments.

-- 1. Stable question identity
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Immutable question versions
create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  question_type text not null
    check (question_type in ('mcq_single', 'mcq_multiple', 'short_answer', 'numeric', 'theory', 'coding', 'debugging')),
  title text,
  prompt text not null,
  difficulty text not null default 'intermediate'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  marks numeric not null default 1 check (marks >= 0),
  negative_marks numeric not null default 0 check (negative_marks >= 0),
  explanation text,
  review_status text not null default 'approved'
    check (review_status in ('draft', 'in_review', 'approved', 'rejected', 'archived')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (question_id, version_number)
);

-- 3. Concept association
create table if not exists public.question_concepts (
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  weight numeric not null default 1.0 check (weight > 0),
  primary key (question_version_id, concept_id)
);

-- 4. Options for objective questions
create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  order_index integer not null default 0,
  is_correct boolean not null default false,
  unique (question_version_id, option_key)
);

-- 5. Protected answers (Inaccessible to students; used solely by server evaluation)
create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade unique,
  answer_type text not null,
  answer_payload jsonb not null,
  evaluation_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. Coding test cases (Hidden test cases protected from learner access)
create table if not exists public.coding_test_cases (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  input_payload text not null,
  expected_output text not null,
  is_hidden boolean not null default true,
  weight numeric not null default 1.0,
  time_limit_ms integer not null default 2000,
  memory_limit_mb integer not null default 256,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- 7. Assessments
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  assessment_type text not null default 'practice'
    check (assessment_type in ('practice', 'adaptive_practice', 'fixed_test', 'test_series')),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  passing_percentage numeric not null default 60.0 check (passing_percentage >= 0 and passing_percentage <= 100),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Assessment questions mapping
create table if not exists public.assessment_questions (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  position integer not null check (position >= 0),
  marks_override numeric check (marks_override is null or marks_override >= 0),
  primary key (assessment_id, position),
  unique (assessment_id, question_version_id)
);

-- Enable RLS
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_concepts enable row level security;
alter table public.question_options enable row level security;
alter table public.question_answers enable row level security;
alter table public.coding_test_cases enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;

-- RLS: Questions and versions readable by trainers
create policy "Trainers and admins can read question bank"
  on public.questions for select
  using (public.is_trainer() or public.is_admin());

create policy "Trainers can manage questions"
  on public.questions for all
  using (public.is_trainer() or public.is_admin());

create policy "Trainers can read question versions"
  on public.question_versions for select
  using (public.is_trainer() or public.is_admin());

-- Students can read approved question versions linked to active assessments
create policy "Students can read published question prompts in assessments"
  on public.question_versions for select
  using (
    review_status = 'approved' and exists (
      select 1 from public.assessment_questions aq
      join public.assessments a on a.id = aq.assessment_id
      join public.enrollments e on e.course_id = a.course_id
      where aq.question_version_id = question_versions.id
        and a.status = 'published'
        and e.student_id = auth.uid()
        and e.status = 'active'
    )
  );

-- Question answers: STRICTLY restricted to service role / trainers; NEVER students
create policy "Trainers and admins can read answers"
  on public.question_answers for select
  using (public.is_trainer() or public.is_admin());

create policy "Trainers and admins can manage answers"
  on public.question_answers for all
  using (public.is_trainer() or public.is_admin());

-- Coding test cases: Hidden test cases only readable by trainers/admins
create policy "Trainers can read all test cases"
  on public.coding_test_cases for all
  using (public.is_trainer() or public.is_admin());

create policy "Students can read sample public test cases only"
  on public.coding_test_cases for select
  using (not is_hidden);

-- Assessments: Published assessments readable by enrolled learners
create policy "Learners can read published assessments"
  on public.assessments for select
  using (
    status = 'published' and exists (
      select 1 from public.enrollments e
      where e.course_id = assessments.course_id and e.student_id = auth.uid() and e.status = 'active'
    )
    or created_by = auth.uid()
    or public.is_trainer()
  );

create policy "Trainers can manage assessments"
  on public.assessments for all
  using (public.is_trainer() or public.is_admin());
