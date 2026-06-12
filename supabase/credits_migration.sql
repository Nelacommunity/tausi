-- ── Credits migration ─────────────────────────────────────────
-- Run this after the base schema.sql migration.
-- Adds the credits-based payment system on top of the existing schema.

-- Add credits column to profiles
alter table profiles add column if not exists credits integer not null default 0;

-- credit_purchases table for audit trail
create table if not exists credit_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  snippe_ref   text not null unique,
  pack         text not null,
  credits      integer not null,
  amount_tzs   integer not null,
  status       text not null default 'pending',
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists credit_purchases_user_idx on credit_purchases(user_id, created_at desc);
create index if not exists credit_purchases_ref_idx  on credit_purchases(snippe_ref);
alter table credit_purchases enable row level security;
create policy "users view own purchases" on credit_purchases for select using (auth.uid() = user_id);

-- Atomic deduction RPC (returns true if deducted, false if insufficient)
create or replace function deduct_credits(p_user_id uuid, p_credits integer)
returns boolean as $$
declare v_credits integer;
begin
  select credits into v_credits from profiles where id = p_user_id for update;
  if v_credits < p_credits then return false; end if;
  update profiles set credits = credits - p_credits where id = p_user_id;
  return true;
end;
$$ language plpgsql security definer;

-- Atomic addition RPC (used by webhook)
create or replace function add_credits(p_user_id uuid, p_credits integer)
returns void as $$
begin
  update profiles set credits = credits + p_credits where id = p_user_id;
end;
$$ language plpgsql security definer;

-- Give new users 5 starter credits on signup (update the existing trigger function)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 5)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
