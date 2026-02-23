-- Create the 'portals' table
create table public.portals (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  client_name text not null,
  html_content text not null,
  password text not null,
  expires_at bigint not null,
  website_url text,
  context_text text,
  sections jsonb,
  brand_data jsonb,
  constraint portals_pkey primary key (id)
) tablespace pg_default;

-- Enable Row Level Security (RLS)
alter table public.portals enable row level security;

-- Create a policy that allows anyone to select (read) portals
create policy "Enable read access for all users"
on public.portals
for select
to public
using (true);

-- Create a policy that allows anyone to insert (create) portals
create policy "Enable insert access for all users"
on public.portals
for insert
to public
with check (true);

-- Create a policy that allows anyone to update portals
create policy "Enable update access for all users"
on public.portals
for update
to public
using (true);

-- Create a policy that allows anyone to delete portals
create policy "Enable delete access for all users"
on public.portals
for delete
to public
using (true);
