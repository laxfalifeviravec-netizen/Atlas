-- ============================================================
-- Atlas — Community Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Driving Groups ─────────────────────────────────────────
create table if not exists public.driving_groups (
  id           bigserial primary key,
  name         text    not null,
  description  text,
  region       text,
  banner_url   text,
  created_by   uuid references public.profiles(id) on delete set null,
  member_count integer not null default 1,
  created_at   timestamptz not null default now()
);

create index if not exists groups_created_idx on public.driving_groups(created_at desc);

-- ── Group Members ───────────────────────────────────────────
create table if not exists public.group_members (
  group_id  bigint not null references public.driving_groups(id) on delete cascade,
  user_id   uuid   not null references public.profiles(id)       on delete cascade,
  role      text   not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ── Posts ───────────────────────────────────────────────────
create table if not exists public.posts (
  id          bigserial primary key,
  user_id     uuid    not null references public.profiles(id)       on delete cascade,
  caption     text,
  image_url   text,
  road_id     integer references public.roads(id)                   on delete set null,
  group_id    bigint  references public.driving_groups(id)          on delete set null,
  like_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists posts_user_idx    on public.posts(user_id);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_group_idx   on public.posts(group_id);

-- ── Post Likes ──────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    bigint not null references public.posts(id)    on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── Post Comments ───────────────────────────────────────────
create table if not exists public.post_comments (
  id         bigserial primary key,
  post_id    bigint not null references public.posts(id)    on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  body       text   not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.post_comments(post_id);

-- ── Garage (user cars) ──────────────────────────────────────
create table if not exists public.garages (
  id          bigserial primary key,
  user_id     uuid     not null references public.profiles(id) on delete cascade,
  year        smallint,
  make        text     not null,
  model       text     not null,
  trim_level  text,
  color       text,
  mods        text,
  image_url   text,
  is_primary  boolean  not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists garages_user_idx on public.garages(user_id);

-- ── Triggers: keep like_count synced ────────────────────────
create or replace function fn_increment_likes()
returns trigger language plpgsql as $$
begin
  update public.posts set like_count = like_count + 1 where id = NEW.post_id;
  return NEW;
end $$;

create or replace function fn_decrement_likes()
returns trigger language plpgsql as $$
begin
  update public.posts set like_count = greatest(0, like_count - 1) where id = OLD.post_id;
  return OLD;
end $$;

drop trigger if exists trg_like_inc on public.post_likes;
create trigger trg_like_inc after insert on public.post_likes
  for each row execute function fn_increment_likes();

drop trigger if exists trg_like_dec on public.post_likes;
create trigger trg_like_dec after delete on public.post_likes
  for each row execute function fn_decrement_likes();

-- Keep member_count synced
create or replace function fn_group_member_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.driving_groups set member_count = member_count + 1 where id = NEW.group_id;
  elsif TG_OP = 'DELETE' then
    update public.driving_groups set member_count = greatest(0, member_count - 1) where id = OLD.group_id;
  end if;
  return coalesce(NEW, OLD);
end $$;

drop trigger if exists trg_member_count on public.group_members;
create trigger trg_member_count after insert or delete on public.group_members
  for each row execute function fn_group_member_count();

-- ── Row Level Security ──────────────────────────────────────
alter table public.posts          enable row level security;
alter table public.post_likes     enable row level security;
alter table public.post_comments  enable row level security;
alter table public.garages        enable row level security;
alter table public.driving_groups enable row level security;
alter table public.group_members  enable row level security;

-- Posts
create policy "posts_select"  on public.posts for select using (true);
create policy "posts_insert"  on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_delete"  on public.posts for delete using (auth.uid() = user_id);

-- Likes
create policy "likes_select"  on public.post_likes for select using (true);
create policy "likes_insert"  on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete"  on public.post_likes for delete using (auth.uid() = user_id);

-- Comments
create policy "comments_select" on public.post_comments for select using (true);
create policy "comments_insert" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.post_comments for delete using (auth.uid() = user_id);

-- Garage (public read so others can see your car on posts)
create policy "garages_select" on public.garages for select using (true);
create policy "garages_all"    on public.garages for all   using (auth.uid() = user_id);

-- Groups
create policy "groups_select" on public.driving_groups for select using (true);
create policy "groups_insert" on public.driving_groups for insert with check (auth.uid() = created_by);
create policy "groups_update" on public.driving_groups for update using (auth.uid() = created_by);

-- Group members
create policy "members_select" on public.group_members for select using (true);
create policy "members_insert" on public.group_members for insert with check (auth.uid() = user_id);
create policy "members_delete" on public.group_members for delete using (auth.uid() = user_id);

-- ── Storage bucket (run once) ────────────────────────────────
-- In Supabase dashboard → Storage → New bucket:
--   Name: community-media   Public: true
-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

create policy "community_media_select" on storage.objects
  for select using (bucket_id = 'community-media');
create policy "community_media_insert" on storage.objects
  for insert with check (bucket_id = 'community-media' and auth.uid() is not null);
create policy "community_media_delete" on storage.objects
  for delete using (bucket_id = 'community-media' and auth.uid()::text = (storage.foldername(name))[1]);
