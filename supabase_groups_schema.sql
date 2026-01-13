-- 1. Create groups table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  group_icon text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create group_members table
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- 3. Update messages table to support groups
alter table public.messages 
add column group_id uuid references public.groups(id) on delete cascade;

-- 4. Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Helper function to avoid recursion
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

-- 5. Policies

-- Groups: View if you are a member
create policy "View groups if member"
  on groups for select
  using (
    is_group_member(id, auth.uid())
  );

-- Groups: Insert (Anyone can create a group)
create policy "Users can create groups"
  on groups for insert
  with check ( auth.uid() = created_by );

-- Group Members: View membership
create policy "View group members if member"
  on group_members for select
  using (
    -- Avoid recursion: Check self OR check using security definer function
    auth.uid() = user_id 
    OR
    is_group_member(group_id, auth.uid())
  );

-- Group Members: Insert (Admins or Creator can add members)
create policy "Admins can add members"
  on group_members for insert
  with check (
    -- Case 1: Current user is an admin of the group
    exists (
       select 1 from group_members gm
       where gm.group_id = group_id 
       and gm.user_id = auth.uid() 
       and gm.role = 'admin'
    )
    OR
    -- Case 2: New group creation (allow creator to add initial members)
    exists (
       select 1 from groups g
       where g.id = group_id
       and g.created_by = auth.uid()
    )
  );

-- Group Members: Update/Delete (Admins)
create policy "Admins can manage members"
  on group_members for delete
  using (
      exists (
       select 1 from group_members gm
       where gm.group_id = group_id 
       and gm.user_id = auth.uid() 
       and gm.role = 'admin'
    )
  );

-- Update Messages Policy for Groups
create policy "Group members can read group messages"
  on messages for select
  using (
    group_id is not null and
    is_group_member(group_id, auth.uid())
  );

-- Allow sending to group
create policy "Group members can send group messages"
  on messages for insert
  with check (
     group_id is not null and
     is_group_member(group_id, auth.uid())
  );
