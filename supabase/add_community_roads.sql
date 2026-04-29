-- ============================================================
-- Atlas — Add community road submissions
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add source + submitted_by columns to roads
alter table public.roads
  add column if not exists source       text not null default 'official'
    check (source in ('official', 'community')),
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

-- Allow signed-in users to insert community roads
create policy "Authenticated users can submit roads"
  on public.roads for insert
  with check (auth.uid() is not null and submitted_by = auth.uid() and source = 'community');

-- Allow users to update/delete their own submissions
create policy "Users can update own submissions"
  on public.roads for update
  using (auth.uid() = submitted_by);

create policy "Users can delete own submissions"
  on public.roads for delete
  using (auth.uid() = submitted_by);
