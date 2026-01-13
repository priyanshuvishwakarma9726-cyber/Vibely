-- 1. Create blocked_users table
create table public.blocked_users (
  blocker_id uuid references auth.users(id) not null,
  blocked_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "Users can see who they blocked"
  on blocked_users for select
  using ( auth.uid() = blocker_id );

create policy "Users can block others"
  on blocked_users for insert
  with check ( auth.uid() = blocker_id );

create policy "Users can unblock others"
  on blocked_users for delete
  using ( auth.uid() = blocker_id );

-- We also need to allow users to know IF they are blocked (to hide status/input)
-- So we allow reading if you are the blocked_id
create policy "Users can see who blocked them"
  on blocked_users for select
  using ( auth.uid() = blocked_id );


-- 2. Update messages table for "Delete for Me"
-- We add a column to store IDs of users who deleted the message for themselves
alter table public.messages 
add column deleted_by uuid[] default '{}';

-- Allow users to update the deleted_by array (append their ID)
-- This requires a policy update or we use a Postgres function to append safely. 
-- For simplicity in this agent context, we'll allow update if the user is receiver or sender.
-- (Note: 'Recipients can update messages' policy already exists for receiver_id)
-- We might need a generic update policy for participants?
create policy "Participants can update messages (for deletion)"
  on messages for update
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );
