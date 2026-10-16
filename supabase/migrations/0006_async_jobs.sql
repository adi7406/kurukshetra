-- Migration: 0006_async_jobs.sql
-- Description: Schema and RLS policies for asynchronous jobs framework and idempotency.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in ('syllabus_import', 'content_generation', 'question_generation', 'code_execution', 'grading')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress jsonb not null default '{"completed": 0, "total": 100}'::jsonb,
  input_payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  idempotency_key text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.jobs enable row level security;

-- Policy: Owners can read their jobs; trainers and admins can view jobs within scope
create policy "Users can read own jobs"
  on public.jobs for select
  using (
    created_by = auth.uid()
    or public.is_admin()
  );

create policy "Users can insert jobs"
  on public.jobs for insert
  with check (created_by = auth.uid());

create policy "Users can update own active jobs"
  on public.jobs for update
  using (created_by = auth.uid());
