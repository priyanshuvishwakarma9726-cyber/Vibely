-- 1. Create status_updates table
create table public.status_updates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  media_url text, -- optional if just text status
  caption text,
  background_color text default '#00a884', -- for text-only status
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Indexes
-- We query by user_id and created_at often (to filter < 24h)
create index status_updates_user_id_idx on status_updates(user_id);
create index status_updates_created_at_idx on status_updates(created_at);

-- 3. RLS
alter table public.status_updates enable row level security;

-- Policies

-- VIEW: Authenticated users can view statuses of people they have chatted with? 
-- Or easier: Authenticated users can view ALL public statuses for now (Vibely is open network for this demo).
-- In real app, it would be "contacts only".
create policy "Authenticated users can view statuses"
  on status_updates for select
  to authenticated
  using ( true );

-- INSERT: Users can create their own status
create policy "Users can create their own status"
  on status_updates for insert
  with check ( auth.uid() = user_id );

-- DELETE: Users can delete their own status
create policy "Users can delete their own status"
  on status_updates for delete
  using ( auth.uid() = user_id );
