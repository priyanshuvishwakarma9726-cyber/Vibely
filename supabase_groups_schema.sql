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

-- 5. Policies

-- Groups: View if you are a member
create policy "View groups if member"
  on groups for select
  using (
    exists (
      select 1 from group_members gm 
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

-- Groups: Insert (Anyone can create a group)
create policy "Users can create groups"
  on groups for insert
  with check ( auth.uid() = created_by );

-- Group Members: View membership
create policy "View group members if member"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm 
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

-- Group Members: Insert (Admins or Creator can add members)
-- For simplicity, we'll allow the creator to insert initial members during creation
-- or any admin. 
create policy "Admins can add members"
  on group_members for insert
  with check (
    -- Case 1: Self-insert (joining? usually not for private groups) - Skip
    -- Case 2: Current user is an admin of the group
    exists (
       select 1 from group_members gm
       where gm.group_id = group_id 
       and gm.user_id = auth.uid() 
       and gm.role = 'admin'
    )
    OR
    -- Case 3: New group creation (db trigger or client side flow ensures creator is added first?)
    -- We can just allow insert if the group was created by user.
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
-- Existing 'Users can read their own messages' checks sender/receiver.
-- We need a new policy for Group Messages.
create policy "Group members can read group messages"
  on messages for select
  using (
    group_id is not null and
    exists (
      select 1 from group_members gm
      where gm.group_id = group_id
      and gm.user_id = auth.uid()
    )
  );

-- Allow sending to group
create policy "Group members can send group messages"
  on messages for insert
  with check (
     group_id is not null and
     exists (
       select 1 from group_members gm
       where gm.group_id = group_id
       and gm.user_id = auth.uid()
     )
  );
