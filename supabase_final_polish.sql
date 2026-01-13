-- Add reply_to column for threading
alter table public.messages
add column reply_to bigint references public.messages(id) on delete set null;

-- Add reactions column for emoji reactions
-- Stored as JSONB: { "🚀": ["user_id_1", "user_id_2"], "❤️": ["user_id_3"] }
alter table public.messages
add column reactions jsonb default '{}'::jsonb;

-- Adjust Realtime to listen to these changes? 
-- Realtime listens to table changes automatically if enabled.
-- Need to ensure SELECT policies allow reading these (they do, select *).
