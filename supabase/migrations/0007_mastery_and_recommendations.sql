-- 0007_mastery_and_recommendations.sql
-- Schema for Mastery Evidence Pipeline, Mastery Estimation, and Adaptive Recommendations

-- 1. Normalized learning evidence records (idempotent evidence ingestion)
create table if not exists public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  question_version_id uuid references public.question_versions(id) on delete set null,
  student_answer_id uuid references public.student_answers(id) on delete set null,
  attempt_id uuid references public.assessment_attempts(id) on delete cascade,
  is_correct boolean not null,
  score numeric not null default 0,
  max_score numeric not null default 0,
  difficulty text default 'medium',
  hints_used integer not null default 0 check (hints_used >= 0),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  evidence_type text not null default 'assessment_answer',
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_answer_id, concept_id)
);

-- 2. Current student mastery per concept
create table if not exists public.student_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  mastery_probability numeric(6,5) not null default 0.10000 check (mastery_probability >= 0 and mastery_probability <= 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  model_name text not null default 'rule_based_baseline',
  model_version text not null default 'v1',
  last_evidence_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, concept_id)
);

-- 3. Append-only mastery history
create table if not exists public.mastery_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  previous_probability numeric(6,5) check (previous_probability is null or (previous_probability >= 0 and previous_probability <= 1)),
  new_probability numeric(6,5) not null check (new_probability >= 0 and new_probability <= 1),
  evidence_source_type text not null default 'learning_attempt',
  evidence_source_id uuid,
  model_name text not null default 'rule_based_baseline',
  model_version text not null default 'v1',
  reason jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Personalized learning recommendations
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  learning_resource_id uuid references public.learning_resources(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  activity_type text not null check (activity_type in ('read', 'watch', 'quiz', 'coding', 'review', 'practice')),
  reason text not null,
  priority integer not null default 1,
  status text not null default 'recommended' check (status in ('recommended', 'accepted', 'completed', 'dismissed', 'expired')),
  model_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.learning_attempts enable row level security;
alter table public.student_mastery enable row level security;
alter table public.mastery_history enable row level security;
alter table public.recommendations enable row level security;

-- Policies for learning_attempts
create policy "Students can view own learning attempts"
  on public.learning_attempts for select
  using (student_id = auth.uid());

create policy "Trainers and admins can view learning attempts"
  on public.learning_attempts for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for student_mastery
create policy "Students can view own mastery"
  on public.student_mastery for select
  using (student_id = auth.uid());

create policy "Trainers and admins can view student mastery"
  on public.student_mastery for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for mastery_history (Append-only: select only for users)
create policy "Students can view own mastery history"
  on public.mastery_history for select
  using (student_id = auth.uid());

create policy "Trainers and admins can view mastery history"
  on public.mastery_history for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for recommendations
create policy "Students can view own recommendations"
  on public.recommendations for select
  using (student_id = auth.uid());

create policy "Students can update own recommendation status"
  on public.recommendations for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Trainers and admins can view all recommendations"
  on public.recommendations for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );
