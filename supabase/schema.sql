-- ============================================================
-- Tausi Database Schema — run this in the Supabase SQL Editor
-- ============================================================

-- ── Core tables ─────────────────────────────────────────────

create table if not exists profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  full_name            text,
  tier                 text not null default 'free' check (tier in ('free', 'premium')),
  subscription_status  text not null default 'inactive',
  subscription_end     timestamptz,
  usage_month          text,              -- 'YYYY-MM'
  predictions_used     integer not null default 0,
  marking_schemes_used integer not null default 0,
  ai_markings_used     integer not null default 0,
  study_sessions_used  integer not null default 0,
  created_at           timestamptz not null default now()
);

create table if not exists exams (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null default 'Untitled Exam',
  original_filenames text[] not null default '{}',
  pdf_storage_paths  text[] not null default '{}',
  predicted_exam     text not null default '',
  marking_scheme     text not null default '',
  is_public          boolean not null default false,
  created_at         timestamptz not null default now()
);

create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references exams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create table if not exists marking_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null default 'Untitled Marking',
  answer_sheet_paths    text[] not null default '{}',
  question_paper_paths  text[] not null default '{}',
  original_filenames    text[] not null default '{}',
  marking_scheme_text   text not null default '',
  exam_id               uuid references exams(id) on delete set null,
  total_marks           integer,
  max_marks             integer,
  percentage            numeric(5,2),
  raw_feedback          text not null default '',
  created_at            timestamptz not null default now()
);

-- Migration: add question_paper_paths if table already exists
alter table marking_sessions add column if not exists question_paper_paths text[] not null default '{}';

create table if not exists study_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null default 'Study Session',
  document_paths     text[] not null default '{}',
  original_filenames text[] not null default '{}',
  created_at         timestamptz not null default now()
);

create table if not exists study_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────

create index if not exists chat_messages_exam_user_idx
  on chat_messages(exam_id, user_id, created_at asc);

create index if not exists study_messages_session_idx
  on study_messages(session_id, created_at asc);

create index if not exists marking_sessions_user_idx
  on marking_sessions(user_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────

alter table profiles         enable row level security;
alter table exams            enable row level security;
alter table chat_messages    enable row level security;
alter table marking_sessions enable row level security;
alter table study_sessions   enable row level security;
alter table study_messages   enable row level security;

-- profiles
create policy "users manage own profile"   on profiles for all using (auth.uid() = id);

-- exams
create policy "owners manage own exams"    on exams for all using (auth.uid() = user_id);
create policy "anyone views public exams"  on exams for select using (is_public = true);

-- chat_messages
create policy "users manage own chat"      on chat_messages for all using (auth.uid() = user_id);

-- marking_sessions
create policy "users manage own markings"  on marking_sessions for all using (auth.uid() = user_id);

-- study_sessions
create policy "users manage own studies"   on study_sessions for all using (auth.uid() = user_id);

-- study_messages
create policy "users manage own study msgs" on study_messages for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ───────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Token usage tracking ────────────────────────────────────

create table if not exists token_usage_monthly (
  user_id  uuid    not null references auth.users(id) on delete cascade,
  month    text    not null,          -- 'YYYY-MM'
  feature  text    not null,          -- see Feature type in usage.ts
  tokens   bigint  not null default 0,
  primary key (user_id, month, feature)
);

alter table token_usage_monthly enable row level security;
create policy "users read own token usage"
  on token_usage_monthly for select using (auth.uid() = user_id);

-- Atomic upsert used by every AI route
create or replace function increment_token_usage(
  p_user_id uuid,
  p_month   text,
  p_feature text,
  p_tokens  bigint
) returns void as $$
begin
  insert into token_usage_monthly (user_id, month, feature, tokens)
  values (p_user_id, p_month, p_feature, p_tokens)
  on conflict (user_id, month, feature)
  do update set tokens = token_usage_monthly.tokens + excluded.tokens;
end;
$$ language plpgsql security definer;

-- ── Exam papers library ─────────────────────────────────────

create table if not exists exam_papers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  exam_type          text not null,
  year               integer not null,
  subject            text not null,
  file_paths         text[] not null default '{}',
  original_filenames text[] not null default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists exam_papers_user_idx on exam_papers(user_id, created_at desc);
alter table exam_papers enable row level security;
create policy "users manage own papers" on exam_papers for all using (auth.uid() = user_id);

-- ── Write documents ─────────────────────────────────────────

create table if not exists write_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled Document',
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists write_documents_user_idx
  on write_documents(user_id, updated_at desc);

alter table write_documents enable row level security;
create policy "users manage own documents" on write_documents for all using (auth.uid() = user_id);

-- Auto-update updated_at on write_documents
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists write_documents_updated_at on write_documents;
create trigger write_documents_updated_at
  before update on write_documents
  for each row execute function update_updated_at_column();

-- ── Storage ─────────────────────────────────────────────────

-- Create the exam-papers bucket (private, 50 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-papers',
  'exam-papers',
  false,
  52428800,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "authenticated users read files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-papers');

CREATE POLICY "users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


