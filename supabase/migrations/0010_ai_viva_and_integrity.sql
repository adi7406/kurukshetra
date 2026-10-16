-- 0010_ai_viva_and_integrity.sql
-- Schema for AI Viva sessions, questions, answers, integrity signals, and human review

-- 1. Viva Sessions
create table if not exists public.viva_sessions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'in_progress', 'completed', 'cancelled')),
  current_question_index integer not null default 0,
  total_questions integer not null default 3,
  duration_seconds integer not null default 600,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  model_version text not null default 'viva-gpt-4o-mini-v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Viva Questions
create table if not exists public.viva_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.viva_sessions(id) on delete cascade,
  order_index integer not null default 0,
  question_text text not null,
  topic text,
  difficulty text not null default 'intermediate',
  rubric jsonb not null default '[]'::jsonb,
  max_score numeric not null default 10,
  status text not null default 'pending' check (status in ('pending', 'active', 'answered', 'skipped')),
  created_at timestamptz not null default now()
);

-- 3. Viva Answers
create table if not exists public.viva_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.viva_sessions(id) on delete cascade,
  question_id uuid not null references public.viva_questions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answer_text text not null,
  score numeric,
  max_score numeric not null default 10,
  rubric_evaluation jsonb not null default '{}'::jsonb,
  is_provisional boolean not null default true,
  review_status text not null default 'evaluated' check (review_status in ('evaluated', 'needs_review', 'reviewed')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 4. Integrity Signals (for Review Leads)
create table if not exists public.integrity_signals (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('rapid_paste', 'multiple_focus_loss', 'excessive_blur', 'unusual_timeline_gap', 'time_anomaly')),
  confidence numeric not null default 0.5,
  evidence jsonb not null default '{}'::jsonb,
  detector_version text not null default 'rule-detector-v1',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 5. Human Integrity Reviews
create table if not exists public.integrity_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'cleared', 'flagged_misconduct', 'inconclusive')),
  outcome_notes text,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.viva_sessions enable row level security;
alter table public.viva_questions enable row level security;
alter table public.viva_answers enable row level security;
alter table public.integrity_signals enable row level security;
alter table public.integrity_reviews enable row level security;

-- Policies for viva_sessions
create policy "Students can view and update own viva sessions"
  on public.viva_sessions for all
  using (student_id = auth.uid());

create policy "Trainers and admins can view viva sessions"
  on public.viva_sessions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for viva_questions
create policy "Students can view viva questions in own sessions"
  on public.viva_questions for select
  using (
    exists (
      select 1 from public.viva_sessions
      where id = session_id and student_id = auth.uid()
    )
  );

create policy "Trainers and admins can view viva questions"
  on public.viva_questions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for viva_answers
create policy "Students can view and insert own viva answers"
  on public.viva_answers for all
  using (student_id = auth.uid());

create policy "Trainers and admins can view and update viva answers"
  on public.viva_answers for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for integrity_signals
create policy "Trainers and admins can view integrity signals"
  on public.integrity_signals for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for integrity_reviews
create policy "Trainers and admins can view and manage integrity reviews"
  on public.integrity_reviews for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );
