-- Matching engine, Level 3 -> Level 2: Kaspi XML -> marketplace_listings
-- -> listing_matches -> commercial_products. Structurally identical to
-- product_matches (supplier_offers -> product_master), targeting the
-- Commercial Product layer instead. Kept as a separate table rather than
-- overloading product_matches with a polymorphic target, since the two
-- matching contexts have different candidate pools and FK integrity is
-- simpler with a dedicated table.

create table if not exists public.listing_matches (
  id uuid primary key default gen_random_uuid(),
  marketplace_listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  commercial_product_id uuid references public.commercial_products(id),
  match_status text not null check (match_status in (
    'matched', 'probable', 'missing', 'conflict', 'ignored'
  )),
  confidence_score numeric(5,4),
  match_method text not null check (match_method in (
    'exact_ean', 'exact_manufacturer_sku', 'exact_normalized_sku',
    'brand_series_variant', 'probable_name_attributes', 'manual', 'none'
  )),
  match_reasons jsonb not null default '[]'::jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_matches_marketplace_listing_id_idx
  on public.listing_matches(marketplace_listing_id);

create index if not exists listing_matches_commercial_product_id_idx
  on public.listing_matches(commercial_product_id);

create index if not exists listing_matches_match_status_idx
  on public.listing_matches(match_status);

-- One current match row per listing, same rationale as
-- product_matches_supplier_product_id_uidx.
create unique index if not exists listing_matches_marketplace_listing_id_uidx
  on public.listing_matches(marketplace_listing_id);
