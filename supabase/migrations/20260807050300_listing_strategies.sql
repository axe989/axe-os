-- Level 4: Listing Strategy. Marketplace listings belong to a strategy
-- (primary/alternative/premium/seasonal/experiment/...). `purpose` is
-- free text with suggested values rather than a hard enum -- the business
-- will invent new experiment types faster than migrations can track them.
--
-- Performance metrics (CTR, orders, revenue, conversion) are measured
-- facts over time, not configuration, so they're a separate append-only
-- snapshot table rather than mutable columns on listing_strategies --
-- consistent with the immutable price/cost history pattern already used
-- elsewhere in this schema.

create table if not exists public.listing_strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text,
  priority integer,
  is_ab_test boolean not null default false,
  expected_audience text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_strategies_is_active_idx
  on public.listing_strategies(is_active);

alter table public.marketplace_listings
  add column if not exists listing_strategy_id uuid references public.listing_strategies(id);

create index if not exists marketplace_listings_listing_strategy_id_idx
  on public.marketplace_listings(listing_strategy_id);

create table if not exists public.listing_strategy_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  listing_strategy_id uuid not null references public.listing_strategies(id) on delete cascade,
  snapshot_date date not null,
  impressions integer,
  clicks integer,
  ctr numeric(6,3),
  orders_count integer,
  revenue numeric(14,2),
  conversion_rate numeric(6,3),
  recorded_at timestamptz not null default now()
);

create index if not exists listing_strategy_performance_snapshots_strategy_id_idx
  on public.listing_strategy_performance_snapshots(listing_strategy_id, snapshot_date desc);
