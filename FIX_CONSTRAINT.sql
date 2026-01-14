-- FIX CONSTRAINT SCRIPT
-- Run this in Supabase SQL Editor.
-- It fixes the message_type check constraint to include 'deleted'.

do $$
begin
    -- 1. Drop existing check constraint if possible (name is usually messages_message_type_check)
    alter table public.messages drop constraint if exists messages_message_type_check;

    -- 2. Add new constraint with 'deleted'
    alter table public.messages add constraint messages_message_type_check
    check (message_type in ('text', 'image', 'audio', 'deleted'));
    
end $$;
