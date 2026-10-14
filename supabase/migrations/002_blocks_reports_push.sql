-- Migration: blocks, reports, push_subscriptions tables
-- Run this in the Supabase SQL Editor

-- User blocks
create table if not exists blocks (
  blocker_id bigint references users(id) on delete cascade,
  blocked_id bigint references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- Content / user reports
create table if not exists reports (
  id          bigserial primary key,
  reporter_id bigint references users(id) on delete cascade,
  target_type text not null,  -- 'post' or 'user'
  target_id   bigint not null,
  reason      text default '',
  created_at  timestamptz default now()
);

create index if not exists reports_target_idx on reports(target_type, target_id);

-- Web Push subscriptions
create table if not exists push_subscriptions (
  id         bigserial primary key,
  user_id    bigint references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

-- Disable RLS
alter table blocks             disable row level security;
alter table reports            disable row level security;
alter table push_subscriptions disable row level security;
