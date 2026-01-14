-- ENABLE REALTIME
-- Run this script in Supabase SQL Editor.
-- It explicitly enables Realtime events for the messages table.

begin;
  -- Add the messages table to the supabase_realtime publication
  alter publication supabase_realtime add table messages;
commit;
