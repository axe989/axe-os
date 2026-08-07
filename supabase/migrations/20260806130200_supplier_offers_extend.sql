-- Product Catalog Engine: extend supplier_offers into the full
-- supplier-commercial-offer entity. product_id becomes nullable because
-- offers are matched to product_master after import, not at insert time.

alter table public.supplier_offers
  alter column product_id drop not null;

alter table public.supplier_offers
  add column if not exists supplier_sku text,
  add column if not exists supplier_name_raw text,
  add column if not exists supplier_brand_raw text,
  add column if not exists currency text not null default 'KZT',
  add column if not exists available_quantity numeric(14,3),
  add column if not exists product_condition text not null default 'unknown',
  add column if not exists lead_time_days integer,
  add column if not exists is_order_only boolean not null default false,
  add column if not exists source_import_id uuid,
  add column if not exists raw_payload jsonb,
  add column if not exists last_seen_at timestamptz;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_product_condition_check;

alter table public.supplier_offers
  add constraint supplier_offers_product_condition_check check (product_condition in (
    'new', 'discounted', 'damaged', 'incomplete', 'shortage', 'unknown'
  ));

-- Purchase price used to default to 0 on insert; with product_condition
-- and no-price sources (e.g. own-warehouse stock feeds with no price
-- column) that default no longer means "confirmed free", so make it
-- nullable instead of implying a price we don't actually know.
alter table public.supplier_offers
  alter column purchase_price drop not null,
  alter column purchase_price drop default;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_supplier_id_product_id_key;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_supplier_id_supplier_sku_product_condition_key;

alter table public.supplier_offers
  add constraint supplier_offers_supplier_id_supplier_sku_product_condition_key
  unique (supplier_id, supplier_sku, product_condition);

create index if not exists supplier_offers_match_status_idx
  on public.supplier_offers(product_id) where product_id is null;

create index if not exists supplier_offers_source_import_id_idx
  on public.supplier_offers(source_import_id);

create index if not exists supplier_offers_last_seen_at_idx
  on public.supplier_offers(last_seen_at desc);

create index if not exists supplier_offers_supplier_sku_idx
  on public.supplier_offers(supplier_sku);
