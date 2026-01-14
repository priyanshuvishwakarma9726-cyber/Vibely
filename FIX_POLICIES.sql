-- COMPLETE POLICY RESET (ROBUST VERSION)
-- Run this script in Supabase SQL Editor.
-- It works even if you run it multiple times (idempotent).

alter table public.messages enable row level security;

-- 1. Remove ALL existing policies (Old and New names)
drop policy if exists "Users can read their own messages" on messages;
drop policy if exists "Users can send messages" on messages;
drop policy if exists "Recipients can update messages" on messages;
drop policy if exists "Group members can read group messages" on messages;
drop policy if exists "Group members can send group messages" on messages;

-- Remove policies created by previous run of this script to avoid "already exists" error
drop policy if exists "DM: Read access" on messages;
drop policy if exists "DM: Send access" on messages;
drop policy if exists "DM: Update access" on messages;
drop policy if exists "Group: Read access" on messages;
drop policy if exists "Group: Send access" on messages;

-- 2. Policy for 1:1 Direct Messages (DMs)
create policy "DM: Read access"
  on messages for select
  using (
    group_id is null 
    and (auth.uid() = sender_id or auth.uid() = receiver_id)
  );

create policy "DM: Send access"
  on messages for insert
  with check (
    group_id is null
    and auth.uid() = sender_id
  );

-- 3. Policy for Group Messages
create policy "Group: Read access"
  on messages for select
  using (
    group_id is not null 
    and public.is_group_member(group_id, auth.uid())
  );

create policy "Group: Send access"
  on messages for insert
  with check (
    group_id is not null
    and public.is_group_member(group_id, auth.uid())
  );

-- 4. Policy for Updates (e.g. marking as read in DMs)
create policy "DM: Update access"
  on messages for update
  using (
      auth.uid() = receiver_id
  );
