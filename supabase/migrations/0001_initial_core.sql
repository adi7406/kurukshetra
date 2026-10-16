-- Migration: 0001_initial_core.sql
-- Description: Core schema for identity, profiles, courses, modules, and concepts.

create extension if not exists pgcrypto;

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student'
    check (role in ('student', 'trainer', 'admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Course Versions
create table if not exists public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  learning_audience text,
  learning_goals jsonb not null default '[]'::jsonb,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, version_number)
);

-- 4. Course Trainers
create table if not exists public.course_trainers (
  course_id uuid not null references public.courses(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  permission_level text not null default 'editor'
    check (permission_level in ('owner', 'editor', 'reviewer')),
  created_at timestamptz not null default now(),
  primary key (course_id, trainer_id)
);

-- 5. Enrollments
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, student_id)
);

-- 6. Modules
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (course_version_id, order_index)
);

-- 7. Concepts
create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0 check (order_index >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, name)
);

-- 8. Concept Prerequisites
create table if not exists public.concept_prerequisites (
  concept_id uuid not null references public.concepts(id) on delete cascade,
  prerequisite_concept_id uuid not null references public.concepts(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (concept_id, prerequisite_concept_id),
  check (concept_id <> prerequisite_concept_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.course_trainers enable row level security;
alter table public.enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_prerequisites enable row level security;

-- Basic RLS Policies for Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own display_name and metadata only"
  on public.profiles for update
  using (auth.uid() = id);
