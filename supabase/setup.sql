-- Выполните этот скрипт один раз: Supabase → SQL Editor → New query → Run.
-- Таблица с данными пользователей: одна строка на человека.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Каждый видит и меняет только свою строку.
drop policy if exists "own select" on public.user_data;
create policy "own select" on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "own insert" on public.user_data;
create policy "own insert" on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "own update" on public.user_data;
create policy "own update" on public.user_data for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Наставник может ЧИТАТЬ все строки (только чтение).
drop policy if exists "mentor read all" on public.user_data;
create policy "mentor read all" on public.user_data for select
  using ((auth.jwt() ->> 'email') = 'asikpro13@flutter-prep.app');
