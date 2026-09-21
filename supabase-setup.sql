-- ============================================================
-- Atlas — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Users
create table if not exists users (
  id           bigserial primary key,
  name         text not null,
  email        text unique not null,
  password_hash text not null,
  avatar       text,
  bio          text default '',
  plan         text default 'Explorer',
  created_at   timestamptz default now()
);

-- Posts
create table if not exists posts (
  id         bigserial primary key,
  user_id    bigint references users(id) on delete cascade,
  image_url  text not null,
  caption    text default '',
  road_name  text default '',
  region     text default '',
  likes      integer default 0,
  created_at timestamptz default now()
);

-- Post likes (toggle table)
create table if not exists post_likes (
  user_id bigint references users(id) on delete cascade,
  post_id bigint references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- Comments
create table if not exists comments (
  id         bigserial primary key,
  post_id    bigint references posts(id) on delete cascade,
  user_id    bigint references users(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

-- Stories (expire after 24 h — filtered in app, no cron needed)
create table if not exists stories (
  id         bigserial primary key,
  user_id    bigint references users(id) on delete cascade,
  image_url  text not null,
  road_name  text default '',
  created_at timestamptz default now()
);

-- Driving groups
create table if not exists groups (
  id            bigserial primary key,
  creator_id    bigint references users(id) on delete cascade,
  name          text not null,
  description   text default '',
  meeting_point text default '',
  route_name    text default '',
  created_at    timestamptz default now()
);

-- Group members
create table if not exists group_members (
  group_id  bigint references groups(id) on delete cascade,
  user_id   bigint references users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Live GPS locations (upserted every 5 s)
create table if not exists group_locations (
  group_id   bigint references groups(id) on delete cascade,
  user_id    bigint references users(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  heading    double precision default 0,
  updated_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Group routes (drawn on map)
create table if not exists group_routes (
  id         bigserial primary key,
  group_id   bigint references groups(id) on delete cascade,
  user_id    bigint references users(id) on delete cascade,
  name       text not null,
  points     jsonb not null,
  created_at timestamptz default now()
);

-- Marketplace listings
create table if not exists listings (
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,
  title       text not null,
  price       text not null,
  category    text default 'Other',
  description text default '',
  contact     text default '',
  image_url   text,
  created_at  timestamptz default now()
);

-- Community driving roads
create table if not exists roads (
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,
  name        text not null,
  region      text default '',
  description text default '',
  difficulty  text default 'Moderate',
  points      jsonb not null,
  likes       integer default 0,
  created_at  timestamptz default now()
);

-- Follows
create table if not exists follows (
  follower_id  bigint references users(id) on delete cascade,
  following_id bigint references users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ── RPC helpers for like counters ──────────────────────────────
create or replace function increment_likes(pid bigint)
returns void language sql as $$
  update posts set likes = likes + 1 where id = pid;
$$;

create or replace function decrement_likes(pid bigint)
returns void language sql as $$
  update posts set likes = greatest(0, likes - 1) where id = pid;
$$;

create or replace function increment_road_likes(rid bigint)
returns void language sql as $$
  update roads set likes = likes + 1 where id = rid;
$$;

-- ── Disable RLS (server uses service key, handles auth itself) --
alter table users          disable row level security;
alter table posts          disable row level security;
alter table post_likes     disable row level security;
alter table comments       disable row level security;
alter table stories        disable row level security;
alter table groups         disable row level security;
alter table group_members  disable row level security;
alter table group_locations disable row level security;
alter table group_routes   disable row level security;
alter table listings       disable row level security;
alter table roads          disable row level security;
alter table follows        disable row level security;
