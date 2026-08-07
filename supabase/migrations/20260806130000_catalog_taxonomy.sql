-- Product Catalog Engine: brand and category taxonomy.
-- pricing_strategy_id on product_categories is added later, once
-- pricing_strategies exists (see 20260806130600_pricing_and_history.sql).

create table if not exists public.product_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null,
  attribute_schema jsonb not null default '{}'::jsonb,
  required_attributes jsonb not null default '[]'::jsonb,
  title_template text,
  content_template jsonb,
  pricing_strategy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create index if not exists product_categories_parent_id_idx
  on public.product_categories(parent_id);

create index if not exists product_brands_normalized_name_idx
  on public.product_brands(normalized_name);
