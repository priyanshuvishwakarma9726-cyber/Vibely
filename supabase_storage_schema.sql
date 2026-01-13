-- 1. Create the storage bucket 'chat-media'
-- Note: verification or creation of buckets is often done in dashboard, but this SQL attempts to insert it.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- 2. Storage Policies

-- Allow authenticated users to upload files to 'chat-media'
create policy "Authenticated users can upload media"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'chat-media' );

-- Allow public access to view files in 'chat-media'
create policy "Public Access to chat media"
on storage.objects for select
to public
using ( bucket_id = 'chat-media' );
