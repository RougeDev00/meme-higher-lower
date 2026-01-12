```sql
-- Create the coins table
create table public.coins (
  id text primary key, -- This will be the token address
  name text not null,
  symbol text not null,
  image text,
  market_cap numeric,
  price_usd numeric,
  liquidity numeric,
  volume_24h numeric,
  rank integer,
  data jsonb, -- For any extra flexible data
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.coins enable row level security;

-- Create policy to allow read access to everyone
create policy "Enable read access for all users" on public.coins
  for select using (true);

-- Create policy to allow insert/update only for service role (admin scripts)
-- Note: Service role bypasses RLS, but explicit policies can be useful for documentation
-- or if we later allow authenticated admins. 
-- For now, read-only for public is the key.
```
