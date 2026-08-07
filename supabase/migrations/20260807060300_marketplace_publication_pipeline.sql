-- Kaspi Publication Pipeline core entities:
--   Commercial Product -> Marketplace Content Variant -> Publication Item
--   -> (batched into) Publication Batch -> CSV export
--   Publication Item -> Publication Event (append-only status log)
--
-- Kaspi CSV is treated as one Publication Engine adapter among future
-- others (WB/Ozon/Website) -- these tables are channel-agnostic; the
-- 32-column Kaspi field mapping lives entirely in the KaspiCsvAdapter
-- code (lib/catalog/publication/adapters/kaspi-csv.ts), not the schema.

-- Level: how a Commercial Product is presented to a specific channel/SEO
-- angle -- title/description/media/positioning can differ per variant
-- while all variants reference the same Commercial Product. sales_channel
-- is nullable: a channel-agnostic variant is reused by every channel that
-- doesn't need its own override.
create table if not exists public.marketplace_content_variants (
  id uuid primary key default gen_random_uuid(),
  commercial_product_id uuid not null references public.commercial_products(id),
  sales_channel text,
  title text not null,
  description text,
  media_set_id uuid references public.media_sets(id),
  seo_strategy jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_content_variants_commercial_product_id_idx
  on public.marketplace_content_variants(commercial_product_id);

create index if not exists marketplace_content_variants_sales_channel_idx
  on public.marketplace_content_variants(sales_channel);

-- At most one default variant per (commercial product, channel).
create unique index if not exists marketplace_content_variants_one_default_uidx
  on public.marketplace_content_variants(
    commercial_product_id, coalesce(sales_channel, '')
  )
  where is_default;

-- One export run of one adapter (e.g. kaspi_csv_v1). template_version
-- lets us detect a stale docs/kaspi-template.xlsm without re-deriving the
-- mapping from scratch every time Kaspi changes their template.
create table if not exists public.marketplace_publication_batches (
  id uuid primary key default gen_random_uuid(),
  sales_channel text not null,
  adapter text not null,
  template_version text,
  file_name text,
  file_hash text,
  row_count integer not null default 0,
  exported_by text,
  exported_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_publication_batches_sales_channel_idx
  on public.marketplace_publication_batches(sales_channel);

-- A single "row" of the publication pipeline: one Commercial Product,
-- shown via one Content Variant, targeting one channel, in one mode.
-- export_snapshot is written exactly once (at export) and is immutable
-- thereafter -- see the trigger below -- so a historical export stays
-- reproducible even if the product/pricing/content/media change later.
create table if not exists public.marketplace_publication_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.marketplace_publication_batches(id),
  commercial_product_id uuid not null references public.commercial_products(id),
  content_variant_id uuid not null references public.marketplace_content_variants(id),
  marketplace_listing_id uuid references public.marketplace_listings(id),
  sales_channel text not null default 'kaspi',
  publication_mode text not null check (publication_mode in (
    'create_new_listing', 'join_existing_listing', 'update_existing_listing'
  )),
  seller_sku text,
  status text not null default 'draft' check (status in (
    'draft', 'content_incomplete', 'needs_review', 'ready_for_export',
    'exported', 'uploaded', 'published', 'publication_error', 'archived'
  )),
  validation_errors jsonb not null default '[]'::jsonb,
  export_snapshot jsonb,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_publication_items_commercial_product_id_idx
  on public.marketplace_publication_items(commercial_product_id);

create index if not exists marketplace_publication_items_content_variant_id_idx
  on public.marketplace_publication_items(content_variant_id);

create index if not exists marketplace_publication_items_batch_id_idx
  on public.marketplace_publication_items(batch_id);

create index if not exists marketplace_publication_items_marketplace_listing_id_idx
  on public.marketplace_publication_items(marketplace_listing_id);

create index if not exists marketplace_publication_items_status_idx
  on public.marketplace_publication_items(status);

-- Duplicate seller SKU risk, enforced at the DB level, not just the
-- validation engine -- deterministic SKU generation can still collide
-- across unrelated commercial products (e.g. same brand+model typo'd
-- into two rows), and this is the last line of defense against silently
-- exporting two rows with the same merchant_sku to Kaspi.
create unique index if not exists marketplace_publication_items_seller_sku_uidx
  on public.marketplace_publication_items(sales_channel, seller_sku)
  where seller_sku is not null;

create or replace function public.prevent_export_snapshot_mutation()
returns trigger as $$
begin
  if old.export_snapshot is not null and new.export_snapshot is distinct from old.export_snapshot then
    raise exception 'export_snapshot on marketplace_publication_items is immutable once set (item %)', old.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists marketplace_publication_items_snapshot_immutable on public.marketplace_publication_items;

create trigger marketplace_publication_items_snapshot_immutable
  before update on public.marketplace_publication_items
  for each row execute function public.prevent_export_snapshot_mutation();

-- Append-only workflow/event log, same rationale as product_status_history.
create table if not exists public.marketplace_publication_events (
  id uuid primary key default gen_random_uuid(),
  publication_item_id uuid not null references public.marketplace_publication_items(id) on delete cascade,
  event_type text not null check (event_type in (
    'status_change', 'export', 'upload_confirmed',
    'reconciliation_match', 'reconciliation_ambiguous', 'validation_failed'
  )),
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_publication_events_publication_item_id_idx
  on public.marketplace_publication_events(publication_item_id, created_at desc);
