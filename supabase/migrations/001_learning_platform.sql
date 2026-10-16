-- ============================================================
-- Tausi — learning diagnosis & teacher practice platform
-- Run after schema.sql (Supabase SQL Editor or psql).
--
-- Access model: the Next.js API routes read/write these tables with the
-- service-role client after doing their own authorisation checks. RLS is
-- enabled everywhere; the only policies below exist so Supabase Realtime
-- (postgres_changes) can deliver row events to browsers.
-- ============================================================

-- ── Roles ───────────────────────────────────────────────────
alter table profiles add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher'));
alter table profiles add column if not exists display_name text;

-- New users pick a role at signup (passed as auth user metadata).
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
create unique index if not exists session_participants_user_uq
  on session_participants(session_id, user_id) where user_id is not null;
create unique index if not exists session_participants_guest_uq
  on session_participants(session_id, guest_token) where guest_token is not null;

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
create unique index if not exists answers_participant_question_uq
  on answers(participant_id, question_id) where participant_id is not null;
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
