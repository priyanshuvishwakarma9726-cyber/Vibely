-- Add discriminator column if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'discriminator') then
        alter table profiles add column discriminator text default '0000';
    end if;
end $$;

-- Update existing users with random discriminators
update profiles
set discriminator = floor(1000 + random() * 8999)::text
where discriminator = '0000' or discriminator is null;
