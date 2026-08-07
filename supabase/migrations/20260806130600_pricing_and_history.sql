-- Product Catalog Engine: pricing strategies and immutable price/cost
-- history. Core rule: never overwrite a historical price -- every change
-- is a new row with valid_from/valid_to.

create table if not exists public.pricing_strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.product_categories(id),
  sales_channel text,
  target_margin_percent numeric(6,2) not null,
  minimum_margin_percent numeric(6,2) not null,
  minimum_profit_amount numeric(14,2),
  marketplace_commission_percent numeric(6,2) not null default 0,
  default_logistics_cost numeric(14,2) not null default 0,
  default_advertising_percent numeric(6,2) not null default 0,
  other_variable_cost numeric(14,2) not null default 0,
  rounding_rule text not null default 'none' check (rounding_rule in (
    'none', 'nearest_10', 'nearest_100', 'nearest_1000', 'psychological_99'
  )),
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_strategies_category_id_idx
  on public.pricing_strategies(category_id);

create index if not exists pricing_strategies_sales_channel_idx
  on public.pricing_strategies(sales_channel);

create index if not exists pricing_strategies_is_active_idx
  on public.pricing_strategies(is_active);

-- Now that pricing_strategies exists, back-fill the FK deferred from
-- 20260806130000_catalog_taxonomy.sql.
alter table public.product_categories
  add constraint product_categories_pricing_strategy_id_fkey
  foreign key (pricing_strategy_id) references public.pricing_strategies(id);

create table if not exists public.supplier_offer_price_history (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_offers(id) on delete cascade,
  -- Nullable: some stock sources (e.g. own-warehouse feeds) report
  -- availability/condition with no purchase price at all. Such imports
  -- still create a history row for the stock/condition change.
  purchase_price numeric(14,2),
  currency text not null default 'KZT',
  stock_quantity numeric(14,3),
  product_condition text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  source_import_id uuid references public.catalog_imports(id),
  recorded_at timestamptz not null default now()
);

create index if not exists supplier_offer_price_history_supplier_product_id_idx
  on public.supplier_offer_price_history(supplier_product_id, recorded_at desc);

create index if not exists supplier_offer_price_history_source_import_id_idx
  on public.supplier_offer_price_history(source_import_id);

create table if not exists public.channel_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product_master(id) on delete cascade,
  channel_listing_id uuid references public.channel_listings(id),
  sales_channel text not null,
  sale_price numeric(14,2) not null,
  previous_price numeric(14,2),
  -- 'maximum_allowed' is an addition beyond the originally specified enum
  -- (regular/promotional/manual/repricer/recommended/minimum_allowed) to
  -- carry the repricer export's upper price band without overloading
  -- minimum_allowed.
  price_type text not null check (price_type in (
    'regular', 'promotional', 'manual', 'repricer',
    'recommended', 'minimum_allowed', 'maximum_allowed'
  )),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  source text,
  changed_by text,
  change_reason text,
  source_import_id uuid references public.catalog_imports(id),
  recorded_at timestamptz not null default now()
);

create index if not exists channel_price_history_product_id_idx
  on public.channel_price_history(product_id, recorded_at desc);

create index if not exists channel_price_history_channel_listing_id_idx
  on public.channel_price_history(channel_listing_id);

create index if not exists channel_price_history_sales_channel_idx
  on public.channel_price_history(sales_channel);

create index if not exists channel_price_history_source_import_id_idx
  on public.channel_price_history(source_import_id);

create table if not exists public.product_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product_master(id) on delete cascade,
  sales_channel text not null,
  supplier_product_id uuid references public.supplier_offers(id),
  purchase_price numeric(14,2),
  commission_amount numeric(14,2) not null default 0,
  commission_percent numeric(6,2) not null default 0,
  logistics_cost numeric(14,2) not null default 0,
  advertising_cost numeric(14,2) not null default 0,
  other_variable_cost numeric(14,2) not null default 0,
  recommended_price numeric(14,2),
  minimum_price numeric(14,2),
  expected_profit numeric(14,2),
  expected_margin_percent numeric(6,2),
  pricing_strategy_id uuid references public.pricing_strategies(id),
  calculated_at timestamptz not null default now()
);

create index if not exists product_cost_snapshots_product_id_idx
  on public.product_cost_snapshots(product_id, calculated_at desc);

create index if not exists product_cost_snapshots_sales_channel_idx
  on public.product_cost_snapshots(sales_channel);

create index if not exists product_cost_snapshots_supplier_product_id_idx
  on public.product_cost_snapshots(supplier_product_id);
