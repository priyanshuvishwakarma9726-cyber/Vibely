-- FINAL REPAIR SCRIPT 3.0
-- Please run this ENTIRE script in your Supabase SQL Editor.
-- It fixes "infinite recursion", "group_id missing", AND "reply_to missing" errors.

-- 1. Create tables if missing
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  group_icon text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- 2. Add columns if missing (Fixes all "column does not exist" errors)
do $$
begin
    -- Fix for Group Chat
    if not exists (select 1 from information_schema.columns where table_name = 'group_members' and column_name = 'group_id') then
        alter table public.group_members add column group_id uuid references public.groups(id) on delete cascade;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'group_members' and column_name = 'user_id') then
        alter table public.group_members add column user_id uuid references auth.users(id);
    end if;
     if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'group_id') then
        alter table public.messages add column group_id uuid references public.groups(id) on delete cascade;
    end if;

    -- Fix for Replies
    if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'reply_to') then
        alter table public.messages add column reply_to bigint references public.messages(id);
    end if;

    -- Fix for Reactions
    if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'reactions') then
        alter table public.messages add column reactions jsonb default '{}'::jsonb;
    end if;
end $$;

-- 3. Create Secure Function (Fixes "Infinite Recursion" error)
-- We use CASCADE to automatically drop the old policies that depend on this function
drop function if exists public.is_group_member(uuid, uuid) cascade;

create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language plpgsql
security definer -- Vital!
as $$
begin
  return exists (
    select 1
    from public.group_members
    where group_id = _group_id
    and user_id = _user_id
  );
end;
$$;

-- 4. Re-apply Policies
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

-- Clean old policies just in case
drop policy if exists "Group members can read group messages" on messages;
drop policy if exists "Group members can send group messages" on messages;
drop policy if exists "View group members if member" on group_members;

-- New Optimized Policies
create policy "Group members can read group messages"
  on messages for select
  using (
    group_id is not null and
    is_group_member(group_id, auth.uid())
  );

create policy "Group members can send group messages"
  on messages for insert
  with check (
     group_id is not null and
     is_group_member(group_id, auth.uid())
  );
  
create policy "View group members if member"
  on group_members for select
  using (
    auth.uid() = user_id 
    OR
    is_group_member(group_id, auth.uid())
  );
