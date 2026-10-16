-- 0011_reports_and_audit.sql
-- Schema for private authorized data exports, reports, and administrative audit trails

-- 1. Reports and Exports Table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('student_assessment_history', 'student_mastery_report', 'course_gradebook', 'assessment_item_analysis')),
  format text not null default 'json' check (format in ('csv', 'json')),
  status text not null default 'ready' check (status in ('pending', 'ready', 'failed')),
  parameters jsonb not null default '{}'::jsonb,
  record_count integer not null default 0,
  payload text not null,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Privileged Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 3. Indexes
create index if not exists idx_reports_requester_id on public.reports(requester_id);
create index if not exists idx_reports_expires_at on public.reports(expires_at);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- 4. Row Level Security Policies
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- Reports RLS: Users can only see their own requested exports; admins see all
drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports"
  on public.reports for select
  using (
    auth.uid() = requester_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = requester_id);

-- Audit Logs RLS: Only admins and trainers can view audit logs
drop policy if exists "Privileged users can view audit logs" on public.audit_logs;
create policy "Privileged users can view audit logs"
  on public.audit_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('trainer', 'admin'))
  );

drop policy if exists "Authenticated users can append audit logs" on public.audit_logs;
create policy "Authenticated users can append audit logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);
