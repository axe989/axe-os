-- Product Catalog Engine: explainable supplier-offer <-> product_master
-- matching results, subject to human review for anything non-exact.

create table if not exists public.product_matches (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_offers(id) on delete cascade,
  product_id uuid references public.product_master(id),
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

create index if not exists product_matches_supplier_product_id_idx
  on public.product_matches(supplier_product_id);

create index if not exists product_matches_product_id_idx
  on public.product_matches(product_id);

create index if not exists product_matches_match_status_idx
  on public.product_matches(match_status);

-- One current match row per supplier offer; re-matching updates it rather
-- than accumulating duplicates (history of match decisions is preserved
-- via reviewed_by/reviewed_at + product_status_history-style auditing at
-- the application layer, not by keeping stale match rows here).
create unique index if not exists product_matches_supplier_product_id_uidx
  on public.product_matches(supplier_product_id);
