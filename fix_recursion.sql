-- Comprehensive Schema Repair Script
-- Run this in your Supabase SQL Editor to fix the schema and infinite recursion error

-- 1. Ensure `groups` table exists
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  group_icon text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ensure `group_members` table exists with correct structure
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- Helper block to add columns if they are missing (e.g. if table existed but was empty/wrong)
do $$
begin
    -- Add group_id if missing
    if not exists (select 1 from information_schema.columns where table_name = 'group_members' and column_name = 'group_id') then
        alter table public.group_members add column group_id uuid references public.groups(id) on delete cascade;
    end if;

    -- Add user_id if missing
    if not exists (select 1 from information_schema.columns where table_name = 'group_members' and column_name = 'user_id') then
        alter table public.group_members add column user_id uuid references auth.users(id);
    end if;

    -- Add role if missing
    if not exists (select 1 from information_schema.columns where table_name = 'group_members' and column_name = 'role') then
        alter table public.group_members add column role text default 'member' check (role in ('admin', 'member'));
    end if;
end $$;

-- 3. Ensure `messages` table supports groups
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'group_id') then
        alter table public.messages add column group_id uuid references public.groups(id) on delete cascade;
    end if;
end $$;

-- 4. Create the secure helper function (DROP first to be sure)
drop function if exists public.is_group_member(uuid, uuid);

create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language plpgsql
security definer
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

-- 5. Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- 6. Re-apply Policies (Drop existing to avoid conflicts)

-- Groups
drop policy if exists "View groups if member" on public.groups;
create policy "View groups if member" on groups for select using ( is_group_member(id, auth.uid()) );

drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups" on groups for insert with check ( auth.uid() = created_by );

-- Group Members
drop policy if exists "View group members if member" on public.group_members;
create policy "View group members if member" on group_members for select using ( auth.uid() = user_id OR is_group_member(group_id, auth.uid()) );

drop policy if exists "Admins can add members" on public.group_members;
create policy "Admins can add members" on group_members for insert with check ( exists ( select 1 from group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin' ) OR exists ( select 1 from groups g where g.id = group_id and g.created_by = auth.uid() ) );

drop policy if exists "Admins can manage members" on public.group_members;
create policy "Admins can manage members" on group_members for delete using ( exists ( select 1 from group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin' ) );

-- Messages
drop policy if exists "Group members can read group messages" on public.messages;
create policy "Group members can read group messages" on messages for select using ( group_id is not null and is_group_member(group_id, auth.uid()) );

drop policy if exists "Group members can send group messages" on public.messages;
create policy "Group members can send group messages" on messages for insert with check ( group_id is not null and is_group_member(group_id, auth.uid()) );
