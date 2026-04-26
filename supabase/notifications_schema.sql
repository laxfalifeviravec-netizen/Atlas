-- ============================================================
-- Atlas — Notifications Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Notifications table
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,   -- recipient
  actor_id   uuid references auth.users,             -- who triggered it
  type       text not null,                          -- 'like' | 'comment' | 'group_join'
  post_id    uuid references posts(id)    on delete cascade,
  group_id   uuid references driving_groups(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notif_user_idx on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy "Users see own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "System can insert notifications"
  on notifications for insert
  with check (true);

create policy "Users mark own notifications read"
  on notifications for update
  using (auth.uid() = user_id);

-- ── Trigger: like → notification ────────────────────────────

create or replace function fn_notify_like()
returns trigger language plpgsql security definer as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from posts where id = NEW.post_id;
  -- Don't notify yourself
  if post_owner is not null and post_owner <> NEW.user_id then
    insert into notifications(user_id, actor_id, type, post_id)
      values (post_owner, NEW.user_id, 'like', NEW.post_id)
      on conflict do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_like on post_likes;
create trigger trg_notify_like
  after insert on post_likes
  for each row execute function fn_notify_like();

-- ── Trigger: comment → notification ─────────────────────────

create or replace function fn_notify_comment()
returns trigger language plpgsql security definer as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from posts where id = NEW.post_id;
  if post_owner is not null and post_owner <> NEW.user_id then
    insert into notifications(user_id, actor_id, type, post_id)
      values (post_owner, NEW.user_id, 'comment', NEW.post_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_comment on post_comments;
create trigger trg_notify_comment
  after insert on post_comments
  for each row execute function fn_notify_comment();

-- ── Trigger: group join → notification (to group creator) ───

create or replace function fn_notify_group_join()
returns trigger language plpgsql security definer as $$
declare
  group_creator uuid;
begin
  select created_by into group_creator from driving_groups where id = NEW.group_id;
  if group_creator is not null and group_creator <> NEW.user_id then
    insert into notifications(user_id, actor_id, type, group_id)
      values (group_creator, NEW.user_id, 'group_join', NEW.group_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_group_join on group_members;
create trigger trg_notify_group_join
  after insert on group_members
  for each row execute function fn_notify_group_join();
