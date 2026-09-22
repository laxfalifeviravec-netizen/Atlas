-- ============================================================
--  Culture — Supabase Schema
--  Run this once in the Supabase SQL editor.
-- ============================================================

-- Users
create table if not exists users (
  id          bigserial primary key,
  name        text not null,
  email       text unique not null,
  password_hash text not null default '',
  avatar      text,
  bio         text default '',
  plan        text default 'Explorer',
  created_at  timestamptz default now()
);

-- Posts
create table if not exists posts (
  id         bigserial primary key,
  user_id    bigint references users(id) on delete cascade,
  image_url  text not null,
  caption    text default '',
  road_name  text default '',
  region     text default '',
  likes      int default 0,
  created_at timestamptz default now()
);

create index if not exists posts_created_at_idx on posts(created_at desc);
create index if not exists posts_user_id_idx    on posts(user_id);

-- Post likes (toggle)
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

create index if not exists comments_post_id_idx on comments(post_id);

-- Stories (24h expiry — client or cron filters by created_at)
create table if not exists stories (
  id         bigserial primary key,
  user_id    bigint references users(id) on delete cascade,
  image_url  text not null,
  road_name  text default '',
  created_at timestamptz default now()
);

-- Groups
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

-- Group live locations (upserted; ephemeral)
create table if not exists group_locations (
  group_id   bigint references groups(id) on delete cascade,
  user_id    bigint references users(id) on delete cascade,
  lat        float not null,
  lng        float not null,
  heading    float default 0,
  updated_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Group saved routes
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

create index if not exists listings_created_at_idx on listings(created_at desc);

-- Community road submissions
create table if not exists roads (
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,
  name        text not null,
  region      text default '',
  description text default '',
  difficulty  text default 'Moderate',
  points      jsonb not null,
  likes       int default 0,
  created_at  timestamptz default now()
);

-- ── Storage ────────────────────────────────────────────────────
-- Run this in the Supabase dashboard → Storage → New bucket:
--   Name: uploads
--   Public: YES (toggle on)
-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Allow public reads on the uploads bucket
create policy if not exists "Public read uploads"
  on storage.objects for select
  using (bucket_id = 'uploads');

-- Allow authenticated uploads
create policy if not exists "Authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'uploads');
