-- 0008_coding_and_execution.sql
-- Schema for Coding Assessments, Sessions, Submissions, Execution Jobs, Test Results, and Replay Events

-- 1. Coding Sessions
create table if not exists public.coding_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid references public.assessment_attempts(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  language text not null default 'javascript',
  current_code text,
  status text not null default 'active' check (status in ('active', 'submitted', 'closed', 'recording_incomplete')),
  recording_consent_version text default 'v1',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_event_sequence bigint not null default 0,
  event_stream_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Session Events (for Replay and Integrity Review)
create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coding_sessions(id) on delete cascade,
  sequence_number bigint not null,
  occurred_at timestamptz not null default now(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  client_event_id text,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

-- 3. Code Submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.coding_sessions(id) on delete set null,
  attempt_id uuid references public.assessment_attempts(id) on delete set null,
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  language text not null,
  source_code text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'accepted', 'wrong_answer', 'compile_error', 'runtime_error', 'time_limit', 'memory_limit', 'output_limit', 'infrastructure_error')),
  score numeric default 0,
  max_score numeric default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 4. Execution Jobs
create table if not exists public.execution_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  provider text not null default 'isolated_runner',
  provider_job_id text,
  status text not null default 'queued',
  limits jsonb not null default '{}'::jsonb,
  result_metadata jsonb not null default '{}'::jsonb,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Test Results
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  test_case_id uuid not null references public.coding_test_cases(id) on delete cascade,
  status text not null,
  runtime_ms integer,
  memory_bytes bigint,
  points_awarded numeric default 0,
  diagnostic text,
  is_hidden boolean default true,
  created_at timestamptz not null default now(),
  unique (submission_id, test_case_id)
);

-- Enable RLS
alter table public.coding_sessions enable row level security;
alter table public.session_events enable row level security;
alter table public.submissions enable row level security;
alter table public.execution_jobs enable row level security;
alter table public.test_results enable row level security;

-- Policies for coding_sessions
drop policy if exists "Students can view own coding sessions" on public.coding_sessions;
create policy "Students can view own coding sessions"
  on public.coding_sessions for select
  using (student_id = auth.uid());

drop policy if exists "Trainers and admins can view coding sessions" on public.coding_sessions;
create policy "Trainers and admins can view coding sessions"
  on public.coding_sessions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for session_events
drop policy if exists "Students can view and insert own session events" on public.session_events;
create policy "Students can view and insert own session events"
  on public.session_events for all
  using (
    exists (
      select 1 from public.coding_sessions
      where id = session_id and student_id = auth.uid()
    )
  );

drop policy if exists "Trainers and admins can view session events" on public.session_events;
create policy "Trainers and admins can view session events"
  on public.session_events for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for submissions
drop policy if exists "Students can view own submissions" on public.submissions;
create policy "Students can view own submissions"
  on public.submissions for select
  using (student_id = auth.uid());

drop policy if exists "Trainers and admins can view submissions" on public.submissions;
create policy "Trainers and admins can view submissions"
  on public.submissions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('trainer', 'admin')
    )
  );

-- Policies for execution_jobs
drop policy if exists "Users can view execution jobs for own submissions" on public.execution_jobs;
create policy "Users can view execution jobs for own submissions"
  on public.execution_jobs for select
  using (
    exists (
      select 1 from public.submissions
      where id = submission_id and student_id = auth.uid()
    )
  );

-- Policies for test_results
drop policy if exists "Users can view test results for own submissions" on public.test_results;
create policy "Users can view test results for own submissions"
  on public.test_results for select
  using (
    exists (
      select 1 from public.submissions
      where id = submission_id and student_id = auth.uid()
    )
  );
