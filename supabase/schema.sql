-- ============================================================
-- Tausi — complete database schema
-- Run this whole file once in the Supabase SQL Editor. It is safe to re-run.
--
-- Access model: Next.js API routes read/write the learning-platform tables
-- with the service-role client after doing their own authorisation checks.
-- RLS is enabled everywhere; policies exist for user-owned data and so that
-- Supabase Realtime (postgres_changes) can deliver live-session events.
-- ============================================================

-- ── Core tables ─────────────────────────────────────────────

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  display_name text,
  role         text not null default 'student' check (role in ('student', 'teacher')),
  tier         text not null default 'free' check (tier in ('free', 'premium')),  -- only drives the PDF watermark
  created_at   timestamptz not null default now()
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

-- Upgrade a profiles table created by an older version of this file.
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher'));
alter table profiles add column if not exists tier text not null default 'free'
  check (tier in ('free', 'premium'));
alter table marking_sessions add column if not exists question_paper_paths text[] not null default '{}';

-- ── Remove retired features (credits/payments, token metering, AI Writer) ──

drop table if exists credit_purchases;
drop table if exists token_usage_monthly;
drop table if exists write_documents;
drop function if exists update_updated_at_column();
drop function if exists deduct_credits(uuid, integer);
drop function if exists add_credits(uuid, integer);
drop function if exists increment_token_usage(uuid, text, text, bigint);
alter table profiles
  drop column if exists credits,
  drop column if exists subscription_status,
  drop column if exists subscription_end,
  drop column if exists usage_month,
  drop column if exists predictions_used,
  drop column if exists marking_schemes_used,
  drop column if exists ai_markings_used,
  drop column if exists study_sessions_used;

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
drop policy if exists "users manage own profile" on profiles;
create policy "users manage own profile" on profiles for all using (auth.uid() = id);

-- exams
drop policy if exists "owners manage own exams" on exams;
create policy "owners manage own exams" on exams for all using (auth.uid() = user_id);
drop policy if exists "anyone views public exams" on exams;
create policy "anyone views public exams" on exams for select using (is_public = true);

-- chat_messages
drop policy if exists "users manage own chat" on chat_messages;
create policy "users manage own chat" on chat_messages for all using (auth.uid() = user_id);

-- marking_sessions
drop policy if exists "users manage own markings" on marking_sessions;
create policy "users manage own markings" on marking_sessions for all using (auth.uid() = user_id);

-- study_sessions
drop policy if exists "users manage own studies" on study_sessions;
create policy "users manage own studies" on study_sessions for all using (auth.uid() = user_id);

-- study_messages
drop policy if exists "users manage own study msgs" on study_messages;
create policy "users manage own study msgs" on study_messages for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ───────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

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
  exam_structure     text,                 -- cached structure for fast practice-paper generation
  created_at         timestamptz not null default now()
);
alter table exam_papers add column if not exists exam_structure text;

create index if not exists exam_papers_user_idx on exam_papers(user_id, created_at desc);
alter table exam_papers enable row level security;
drop policy if exists "users manage own papers" on exam_papers;
create policy "users manage own papers" on exam_papers for all using (auth.uid() = user_id);

-- ── Paper chat messages ─────────────────────────────────────

create table if not exists paper_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid not null references exam_papers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists paper_chat_messages_paper_idx
  on paper_chat_messages(paper_id, user_id, created_at asc);

alter table paper_chat_messages enable row level security;
drop policy if exists "users manage own paper chat" on paper_chat_messages;
create policy "users manage own paper chat" on paper_chat_messages for all using (auth.uid() = user_id);

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
drop policy if exists "users upload to own folder" on storage.objects;
create policy "users upload to own folder" on storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users read only their own folder. (This used to allow any signed-in user to
-- read every file — other students' answer sheets included.) Public exams'
-- source papers are served by the server after it checks the exam is public.
drop policy if exists "authenticated users read files" on storage.objects;
drop policy if exists "users read own files" on storage.objects;
create policy "users read own files" on storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own files" on storage.objects;
create policy "users update own files" on storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own files" on storage.objects;
create policy "users delete own files" on storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- Learning platform: curricula, question bank, classes, live sessions, mastery
-- ============================================================

-- ── Curriculum engine: curriculum → level → knowledge point ─
create table if not exists curricula (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  subject     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists curriculum_levels (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  code          text not null,
  name          text not null,
  ordinal       integer not null default 0,
  unique (curriculum_id, code)
);

create table if not exists knowledge_points (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references curriculum_levels(id) on delete cascade,
  code        text not null,
  name        text not null,
  category    text not null default 'general',
  description text not null default '',
  is_core     boolean not null default true,
  ordinal     integer not null default 0,
  unique (level_id, code)
);

-- ── Question bank ───────────────────────────────────────────
-- type:       mcq | true_false | fill_blank (all auto-gradable)
-- answer:     the exact correct option text (mcq/true_false) or accepted text (fill_blank)
-- provenance: seed | ai_draft | ai_edited | teacher  — feeds the AI-usage disclosure
-- status:     draft | approved | rejected
create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  level_id      uuid not null references curriculum_levels(id) on delete cascade,
  type          text not null check (type in ('mcq', 'true_false', 'fill_blank')),
  prompt        text not null,
  options       jsonb not null default '[]'::jsonb,
  answer        text not null,
  difficulty    smallint not null default 2 check (difficulty between 1 and 3),
  provenance    text not null default 'seed' check (provenance in ('seed', 'ai_draft', 'ai_edited', 'teacher')),
  status        text not null default 'approved' check (status in ('draft', 'approved', 'rejected')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists questions_level_idx on questions(level_id, status);

create table if not exists question_kps (
  question_id uuid not null references questions(id) on delete cascade,
  kp_id       uuid not null references knowledge_points(id) on delete cascade,
  primary key (question_id, kp_id)
);
create index if not exists question_kps_kp_idx on question_kps(kp_id);

-- Explanations are generated once per (question, language) and cached here.
create table if not exists question_explanations (
  question_id  uuid not null references questions(id) on delete cascade,
  lang         text not null check (lang in ('en', 'sw', 'zh')),
  explanation  text not null,
  cultural_note text,
  created_at   timestamptz not null default now(),
  primary key (question_id, lang)
);

-- ── Classes ─────────────────────────────────────────────────
create table if not exists classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  join_code  text not null unique,
  curriculum_id uuid references curricula(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists class_members (
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists class_members_student_idx on class_members(student_id);

-- ── Teacher-built practice exams ────────────────────────────
create table if not exists assessments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled practice exam',
  curriculum_id uuid not null references curricula(id) on delete cascade,
  level_id      uuid not null references curriculum_levels(id) on delete cascade,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists assessments_owner_idx on assessments(owner_id, created_at desc);

create table if not exists assessment_items (
  assessment_id uuid not null references assessments(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  position      integer not null,
  primary key (assessment_id, question_id)
);

-- ── Live sessions ───────────────────────────────────────────
-- mode exam: all questions at once, timed, no leaderboard.  status lobby → active → finished
-- mode game: teacher paces one question at a time.          status lobby → question ⇄ reveal → finished
create table if not exists live_sessions (
  id                  uuid primary key default gen_random_uuid(),
  assessment_id       uuid not null references assessments(id) on delete cascade,
  host_id             uuid not null references auth.users(id) on delete cascade,
  class_id            uuid references classes(id) on delete set null,
  mode                text not null check (mode in ('exam', 'game')),
  require_login       boolean not null default false,
  join_code           text not null unique,
  status              text not null default 'lobby' check (status in ('lobby', 'active', 'question', 'reveal', 'finished')),
  current_index       integer not null default -1,
  question_started_at timestamptz,
  question_seconds    integer not null default 20,
  time_limit_seconds  integer not null default 900,
  started_at          timestamptz,
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists live_sessions_host_idx on live_sessions(host_id, created_at desc);

create table if not exists session_participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references live_sessions(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  guest_token  text,
  display_name text not null,
  score        integer not null default 0,
  streak       integer not null default 0,
  joined_at    timestamptz not null default now(),
  submitted_at timestamptz
);
-- NULLs are distinct in unique indexes, so guests (no user_id) never collide.
create unique index if not exists session_participants_user_uq
  on session_participants(session_id, user_id);
create unique index if not exists session_participants_guest_uq
  on session_participants(session_id, guest_token);

-- ── Answers (live + self-practice) — the source of truth for mastery ─
create table if not exists answers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  session_id     uuid references live_sessions(id) on delete cascade,
  participant_id uuid references session_participants(id) on delete cascade,
  question_id    uuid not null references questions(id) on delete cascade,
  response       text not null default '',
  is_correct     boolean not null,
  time_ms        integer,
  points         integer not null default 0,
  source         text not null default 'live' check (source in ('live', 'practice')),
  created_at     timestamptz not null default now()
);
-- Practice answers have no participant (NULL), so only live answers are unique.
create unique index if not exists answers_participant_question_uq
  on answers(participant_id, question_id);
create index if not exists answers_user_idx on answers(user_id, created_at desc);
create index if not exists answers_session_idx on answers(session_id);

-- Materialised mastery per (student, KP); recomputed from answers by app/lib/mastery.ts
create table if not exists kp_mastery (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kp_id      uuid not null references knowledge_points(id) on delete cascade,
  mastery    real not null,
  attempts   integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kp_id)
);

-- ── RLS ─────────────────────────────────────────────────────
alter table curricula             enable row level security;
alter table curriculum_levels     enable row level security;
alter table knowledge_points      enable row level security;
alter table questions             enable row level security;
alter table question_kps          enable row level security;
alter table question_explanations enable row level security;
alter table classes               enable row level security;
alter table class_members         enable row level security;
alter table assessments           enable row level security;
alter table assessment_items      enable row level security;
alter table live_sessions         enable row level security;
alter table session_participants  enable row level security;
alter table answers               enable row level security;
alter table kp_mastery            enable row level security;

-- Realtime: session state is public (code, status, index — no answers).
drop policy if exists "anyone reads live session state" on live_sessions;
create policy "anyone reads live session state" on live_sessions
  for select to anon, authenticated using (true);

-- Realtime: the host sees participants and answers arrive.
drop policy if exists "host reads participants" on session_participants;
create policy "host reads participants" on session_participants
  for select to authenticated
  using (exists (select 1 from live_sessions s where s.id = session_id and s.host_id = auth.uid()));

drop policy if exists "host reads answers" on answers;
create policy "host reads answers" on answers
  for select to authenticated
  using (exists (select 1 from live_sessions s where s.id = session_id and s.host_id = auth.uid()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table live_sessions;        exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table session_participants; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table answers;              exception when duplicate_object then null; end;
  end if;
end $$;

-- ── Teaching resources (notes, slides, documents) ───────────
-- Each processed resource becomes a level in its owner's private
-- "class materials" curriculum, with AI-extracted topics as knowledge points,
-- so questions from notes feed the same mastery model as any curriculum.

alter table curricula add column if not exists owner_id uuid references auth.users(id) on delete cascade;  -- null = public curriculum

-- ai_practice: generated from a resource for self-practice, not teacher-reviewed
alter table questions drop constraint if exists questions_provenance_check;
alter table questions add constraint questions_provenance_check
  check (provenance in ('seed', 'ai_draft', 'ai_edited', 'teacher', 'ai_practice'));

create table if not exists resources (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  class_id     uuid references classes(id) on delete set null,  -- null = private to the owner
  level_id     uuid references curriculum_levels(id) on delete set null,
  title        text not null,
  file_name    text not null,
  file_path    text not null,
  mime_type    text not null,
  size_bytes   integer not null default 0,
  kind         text not null check (kind in ('pdf', 'docx', 'pptx', 'text')),
  status       text not null default 'uploading' check (status in ('uploading', 'processing', 'ready', 'failed')),
  error        text,
  summary      text,
  content_text text,
  created_at   timestamptz not null default now()
);
create index if not exists resources_owner_idx on resources(owner_id, created_at desc);
create index if not exists resources_class_idx on resources(class_id, created_at desc);
alter table resources enable row level security;

-- Private bucket; the API uploads via signed URLs and serves signed download links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources', 'resources', false, 26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/markdown'
  ]
)
on conflict (id) do nothing;

-- ── Class access & notifications ────────────────────────────
-- Private classes (default): only members may join the class's live exams.
-- Public classes: anyone with the code/link/QR may join their exams.
alter table classes add column if not exists is_public boolean not null default false;

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'session' check (kind in ('session', 'class', 'resource')),
  title      text not null,
  body       text not null default '',
  link       text,
  session_id uuid references live_sessions(id) on delete cascade,
  class_id   uuid references classes(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
alter table notifications enable row level security;

-- Realtime: a user receives their own notifications live.
drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications" on notifications
  for select to authenticated using (auth.uid() = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table notifications; exception when duplicate_object then null; end;
  end if;
end $$;

-- ── Performance indexes ─────────────────────────────────────
create index if not exists live_sessions_class_idx on live_sessions(class_id, created_at desc);
create index if not exists classes_teacher_idx on classes(teacher_id, created_at desc);
create index if not exists answers_question_idx on answers(question_id);

-- ── Shared rate limiting ────────────────────────────────────
-- The app's in-memory limiter is per server instance; when the host runs
-- several instances, this shared fixed-window counter caps the expensive
-- (AI) endpoints across all of them. Called only with the service role.
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null
);
alter table rate_limits enable row level security;

create or replace function rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean as $$
declare
  v_now  timestamptz := now();
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, v_now, 1)
  on conflict (key) do update set
    hits = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                then 1 else rate_limits.hits + 1 end,
    window_start = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                then v_now else rate_limits.window_start end
  returning hits into v_hits;
  -- Opportunistic cleanup so the table stays small.
  if random() < 0.01 then
    delete from rate_limits where window_start < v_now - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function rate_limit_hit(text, integer, integer) from public, anon, authenticated;

-- Make the API pick up new tables immediately.
notify pgrst, 'reload schema';
