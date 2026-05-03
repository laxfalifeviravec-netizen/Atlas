-- ============================================================
-- Atlas — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
--    Auto-created when a user signs up via trigger below.
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique,
  full_name        text,
  avatar_url       text,
  subscription_tier text not null default 'explorer'
                     check (subscription_tier in ('explorer','enthusiast','track_day')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user.';

-- ────────────────────────────────────────────────────────────
-- 2. ROADS
--    Seeded from seed.sql; drives the map and road list pages.
-- ────────────────────────────────────────────────────────────
create table if not exists public.roads (
  id           serial primary key,
  name         text    not null,
  designation  text,                       -- e.g. "US-129", "CA-1"
  state        text    not null,
  region       text    not null
                 check (region in ('West Coast','Mountain West','Southwest',
                                   'Southeast','Northeast','Midwest')),
  type         text    not null
                 check (type in ('Mountain','Coastal','Technical','Scenic',
                                 'Desert','Historic','Canyon','Off-road')),
  length_mi    numeric(7,1),
  difficulty   text    check (difficulty in ('Easy','Moderate','Challenging','Expert')),
  best_season  text,
  highlight    text,
  lat          double precision not null,
  lng          double precision not null,
  avg_rating   numeric(3,2) not null default 0,
  review_count integer      not null default 0,
  created_at   timestamptz  not null default now()
);

create index if not exists roads_region_idx on public.roads(region);
create index if not exists roads_type_idx   on public.roads(type);
create index if not exists roads_state_idx  on public.roads(state);

comment on table public.roads is 'All mapped US driving roads.';

-- ────────────────────────────────────────────────────────────
-- 3. ROAD REVIEWS
-- ────────────────────────────────────────────────────────────
create table if not exists public.road_reviews (
  id         bigserial primary key,
  road_id    integer     not null references public.roads(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  rating     smallint    not null check (rating between 1 and 5),
  condition  text        check (condition in ('Excellent','Good','Fair','Poor','Closed')),
  body       text,
  drive_date date,
  created_at timestamptz not null default now(),
  unique (road_id, user_id)              -- one review per road per user
);

create index if not exists reviews_road_idx on public.road_reviews(road_id);
create index if not exists reviews_user_idx on public.road_reviews(user_id);

comment on table public.road_reviews is 'Community reviews for each road.';

-- ────────────────────────────────────────────────────────────
-- 4. SAVED ROUTES
-- ────────────────────────────────────────────────────────────
create table if not exists public.saved_routes (
  id         bigserial primary key,
  user_id    uuid    not null references public.profiles(id) on delete cascade,
  road_id    integer not null references public.roads(id)    on delete cascade,
  notes      text,
  saved_at   timestamptz not null default now(),
  unique (user_id, road_id)
);

create index if not exists saved_routes_user_idx on public.saved_routes(user_id);

comment on table public.saved_routes is 'Roads bookmarked by a user.';

-- ────────────────────────────────────────────────────────────
-- 5. CONTACT MESSAGES
-- ────────────────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id         bigserial primary key,
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

comment on table public.contact_messages is 'Inbound contact form submissions.';

-- ────────────────────────────────────────────────────────────
-- 6. ROAD CONDITIONS
--    Short-lived crowdsourced alerts (e.g. snow, construction).
-- ────────────────────────────────────────────────────────────
create table if not exists public.road_conditions (
  id             bigserial primary key,
  road_id        integer not null references public.roads(id) on delete cascade,
  user_id        uuid    references public.profiles(id) on delete set null,
  condition_type text    not null
                   check (condition_type in ('Snow','Ice','Construction','Flooding',
                                             'Rockslide','Closure','Clear')),
  description    text,
  reported_at    timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '7 days')
);

create index if not exists conditions_road_idx on public.road_conditions(road_id);
create index if not exists conditions_expires_idx on public.road_conditions(expires_at);

comment on table public.road_conditions is 'Crowdsourced real-time road condition reports.';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.roads           enable row level security;
alter table public.road_reviews    enable row level security;
alter table public.saved_routes    enable row level security;
alter table public.contact_messages enable row level security;
alter table public.road_conditions  enable row level security;

-- ── profiles ──────────────────────────────────────────────────
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── roads ─────────────────────────────────────────────────────
create policy "Roads are publicly readable"
  on public.roads for select using (true);

-- ── road_reviews ──────────────────────────────────────────────
create policy "Reviews are publicly readable"
  on public.road_reviews for select using (true);

create policy "Authenticated users can insert reviews"
  on public.road_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.road_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.road_reviews for delete
  using (auth.uid() = user_id);

-- ── saved_routes ───────────────────────────────────────────────
create policy "Users can view own saved routes"
  on public.saved_routes for select
  using (auth.uid() = user_id);

create policy "Users can save routes"
  on public.saved_routes for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave routes"
  on public.saved_routes for delete
  using (auth.uid() = user_id);

-- ── contact_messages ──────────────────────────────────────────
create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  with check (true);

-- ── road_conditions ────────────────────────────────────────────
create policy "Road conditions are publicly readable"
  on public.road_conditions for select using (true);

create policy "Authenticated users can report conditions"
  on public.road_conditions for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: keep avg_rating + review_count up to date
-- ============================================================
create or replace function public.update_road_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_road_id integer;
begin
  -- Works for INSERT, UPDATE, and DELETE
  v_road_id := coalesce(new.road_id, old.road_id);

  update public.roads
  set
    avg_rating   = coalesce((
      select round(avg(rating)::numeric, 2)
      from   public.road_reviews
      where  road_id = v_road_id
    ), 0),
    review_count = (
      select count(*)
      from   public.road_reviews
      where  road_id = v_road_id
    )
  where id = v_road_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_review_change on public.road_reviews;
create trigger on_review_change
  after insert or update or delete on public.road_reviews
  for each row execute procedure public.update_road_rating();

-- ============================================================
-- FUNCTION: get roads with optional filters (for JS RPC)
-- ============================================================
create or replace function public.get_roads(
  p_region text default null,
  p_type   text default null,
  p_search text default null
)
returns setof public.roads
language sql
stable
as $$
  select *
  from   public.roads
  where  (p_region is null or region = p_region)
    and  (p_type   is null or type   = p_type)
    and  (p_search is null or name ilike '%' || p_search || '%'
                           or state ilike '%' || p_search || '%'
                           or designation ilike '%' || p_search || '%')
  order by name;
$$;
