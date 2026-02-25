-- OllinChat: optional Supabase persistence
-- Run this in the Supabase SQL editor when using remote sync.
-- Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local

create table if not exists app_state (
  id text not null,
  key text not null check (key in ('board', 'profile', 'scans', 'timeclock')),
  value jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (id, key)
);

-- Optional: RLS (use a single user id like 'default' until auth is added)
-- alter table app_state enable row level security;
-- create policy "Allow all for default user" on app_state for all using (id = 'default');
