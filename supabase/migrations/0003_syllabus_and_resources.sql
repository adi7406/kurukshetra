-- Migration: 0003_syllabus_and_resources.sql
-- Description: Schema and RLS policies for source documents and learning resources.

-- 1. Source Documents (uploaded syllabi and course assets)
create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  storage_path text not null,
  extraction_status text not null default 'uploaded'
    check (extraction_status in ('uploaded', 'processing', 'extracted', 'failed')),
  source_metadata jsonb not null default '{}'::jsonb,
  extracted_text text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Learning Resources (associated with concepts)
create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  title text not null,
  resource_type text not null
    check (resource_type in ('article', 'notes', 'video', 'link', 'example', 'document', 'interactive')),
  content text,
  url text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  source_type text not null default 'trainer'
    check (source_type in ('trainer', 'imported', 'ai_generated')),
  review_status text not null default 'approved'
    check (review_status in ('draft', 'in_review', 'approved', 'rejected', 'archived')),
  version_number integer not null default 1 check (version_number > 0),
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.source_documents enable row level security;
alter table public.learning_resources enable row level security;

-- Source Documents RLS: Trainers/admins managing the course can access; never public
create policy "Trainers and admins can read course source documents"
  on public.source_documents for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.course_trainers ct
      where ct.course_id = source_documents.course_id and ct.trainer_id = auth.uid()
    )
    or exists (
      select 1 from public.courses c
      where c.id = source_documents.course_id and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "Trainers and admins can upload course source documents"
  on public.source_documents for insert
  with check (
    public.is_trainer() and (
      exists (
        select 1 from public.courses c
        where c.id = source_documents.course_id and (c.created_by = auth.uid() or public.is_admin())
      )
    )
  );

-- Learning Resources RLS: Approved resources readable if course is visible; draft/edit restricted to trainers
create policy "Approved learning resources readable by enrolled learners"
  on public.learning_resources for select
  using (
    review_status = 'approved'
    or created_by = auth.uid()
    or public.is_trainer()
  );

create policy "Trainers and admins can manage learning resources"
  on public.learning_resources for all
  using (public.is_trainer());
