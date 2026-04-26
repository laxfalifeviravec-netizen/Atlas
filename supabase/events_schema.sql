-- ============================================================
-- Atlas — Events Schema
-- Run this in your Supabase SQL editor
-- ============================================================

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references driving_groups(id) on delete cascade,
  created_by  uuid references auth.users not null,
  title       text not null,
  description text,
  road_id     uuid references roads(id) on delete set null,
  event_date  date not null,
  meet_lat    float,
  meet_lng    float,
  meet_location text,
  created_at  timestamptz not null default now()
);

create table if not exists event_rsvps (
  event_id uuid references events(id) on delete cascade,
  user_id  uuid references auth.users not null,
  status   text not null default 'going', -- 'going' | 'maybe' | 'not_going'
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists events_group_idx on events(group_id, event_date);
create index if not exists events_date_idx  on events(event_date);

alter table events      enable row level security;
alter table event_rsvps enable row level security;

create policy "Anyone can view events"      on events      for select using (true);
create policy "Auth users can create events" on events     for insert with check (auth.uid() = created_by);
create policy "Creator can delete events"   on events      for delete using (auth.uid() = created_by);

create policy "Anyone can view RSVPs"       on event_rsvps for select using (true);
create policy "Users manage own RSVP"       on event_rsvps for insert with check (auth.uid() = user_id);
create policy "Users update own RSVP"       on event_rsvps for update using (auth.uid() = user_id);
create policy "Users delete own RSVP"       on event_rsvps for delete using (auth.uid() = user_id);
