-- ============================================================
-- Atlas — Follows Schema
-- Run this in your Supabase SQL editor
-- ============================================================

create table if not exists follows (
  follower_id uuid references auth.users not null,
  following_id uuid references auth.users not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_idx on follows(following_id);

alter table follows enable row level security;

create policy "Users see all follows"
  on follows for select using (true);

create policy "Users manage own follows"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users delete own follows"
  on follows for delete
  using (auth.uid() = follower_id);

-- Notification when someone follows you
create or replace function fn_notify_follow()
returns trigger language plpgsql security definer as $$
begin
  insert into notifications(user_id, actor_id, type)
    values (NEW.following_id, NEW.follower_id, 'follow')
    on conflict do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_follow on follows;
create trigger trg_notify_follow
  after insert on follows
  for each row execute function fn_notify_follow();
