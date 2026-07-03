-- شغّل هالكود بالكامل داخل Supabase: SQL Editor -> New query

-- جدول الأهداف/العادات
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz not null default now()
);

-- جدول التسجيلات اليومية (تقييم واحد لكل هدف لكل يوم)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  entry_date date not null,
  text text not null,
  score int not null check (score >= 0 and score <= 10),
  feedback text default '',
  created_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create index if not exists entries_user_date_idx on entries (user_id, entry_date);
create index if not exists habits_user_idx on habits (user_id);

-- تفعيل أمان الصفوف (كل مستخدم يشوف بياناته فقط)
alter table habits enable row level security;
alter table entries enable row level security;

create policy "select own habits" on habits
  for select using (auth.uid() = user_id);
create policy "insert own habits" on habits
  for insert with check (auth.uid() = user_id);
create policy "update own habits" on habits
  for update using (auth.uid() = user_id);
create policy "delete own habits" on habits
  for delete using (auth.uid() = user_id);

create policy "select own entries" on entries
  for select using (auth.uid() = user_id);
create policy "insert own entries" on entries
  for insert with check (auth.uid() = user_id);
create policy "update own entries" on entries
  for update using (auth.uid() = user_id);
create policy "delete own entries" on entries
  for delete using (auth.uid() = user_id);
