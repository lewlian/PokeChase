-- PokeChase user data: watchlists + value-only portfolio.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → paste → Run).
-- All tables are owner-only via RLS; the app connects with the anon key and
-- the signed-in user's JWT — there is no service-role access.

create table public.watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create unique index watchlists_one_default_uq on public.watchlists (user_id) where is_default;
create index watchlists_user_idx on public.watchlists (user_id);

create table public.watchlist_items (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  product_id   integer not null,
  sub_type     text not null default 'Normal' check (char_length(sub_type) between 1 and 40),
  added_at     timestamptz not null default now(),
  primary key (watchlist_id, product_id, sub_type)
);

create table public.portfolio_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id integer not null,
  sub_type   text not null default 'Normal' check (char_length(sub_type) between 1 and 40),
  quantity   integer not null check (quantity between 1 and 9999),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id, sub_type)
);

alter table public.watchlists      enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolio_items enable row level security;

create policy "own watchlists" on public.watchlists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own watchlist items" on public.watchlist_items
  for all using (exists (select 1 from public.watchlists w
                         where w.id = watchlist_id and w.user_id = (select auth.uid())))
  with check   (exists (select 1 from public.watchlists w
                         where w.id = watchlist_id and w.user_id = (select auth.uid())));

create policy "own portfolio" on public.portfolio_items
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
