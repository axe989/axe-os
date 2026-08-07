-- Product Catalog Engine: sales-channel representations of a product
-- (Kaspi, website, future marketplaces). Distinct from product_master
-- (canonical identity) and supplier_offers (purchase-side commercial offer).

create table if not exists public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.product_master(id),
  sales_channel text not null,
  external_listing_id text,
  external_sku text,
  title text,
  listing_status text not null default 'draft' check (listing_status in (
    'draft', 'active', 'inactive', 'archived'
  )),
  current_sale_price numeric(14,2),
  raw_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists channel_listings_channel_external_sku_uidx
  on public.channel_listings(sales_channel, external_sku)
  where external_sku is not null;

create index if not exists channel_listings_product_id_idx
  on public.channel_listings(product_id);

create index if not exists channel_listings_sales_channel_idx
  on public.channel_listings(sales_channel);

create index if not exists channel_listings_listing_status_idx
  on public.channel_listings(listing_status);
