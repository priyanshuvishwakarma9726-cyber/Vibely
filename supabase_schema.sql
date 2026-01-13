-- 1. Create the profiles table
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  about text default 'Hey there! I am using Vibely.',
  status text default 'offline',
  last_seen timestamp with time zone default timezone('utc'::text, now()),
  
  primary key (id),
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create Policies
-- Allow anyone to view profiles (needed for user search)
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

-- Allow authenticated users to insert their *own* profile
-- This is necessary since we are creating the profile from the client side after signup
create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );
