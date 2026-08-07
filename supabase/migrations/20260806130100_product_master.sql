-- Product Catalog Engine: promote the empty, code-unreferenced `products`
-- table into the master product catalog entity. Safe rename: 0 rows, no
-- application code references `public.products` anywhere (confirmed before
-- writing this migration).

alter table public.products rename to product_master;

alter table public.product_master
  rename column sku to internal_sku;

alter table public.product_master
  drop column if exists brand,
  drop column if exists category,
  drop column if exists model,
  drop column if exists kaspi_sku,
  drop column if exists halyk_sku;

alter table public.product_master
  add column if not exists manufacturer_sku text,
  add column if not exists ean text,
  add column if not exists normalized_name text,
  add column if not exists brand_id uuid references public.product_brands(id),
  add column if not exists category_id uuid references public.product_categories(id),
  add column if not exists series text,
  add column if not exists product_type text,
  add column if not exists status text not null default 'discovered',
  add column if not exists assortment_status text not null default 'candidate',
  add column if not exists technical_attributes jsonb not null default '{}'::jsonb,
  add column if not exists content_status text not null default 'missing',
  add column if not exists publication_readiness text not null default 'not_ready';

alter table public.product_master
  drop constraint if exists product_master_status_check;

alter table public.product_master
  add constraint product_master_status_check check (status in (
    'discovered', 'needs_matching', 'draft', 'needs_technical_data',
    'needs_content', 'needs_price', 'review', 'approved',
    'ready_to_publish', 'published', 'needs_update', 'archived'
  ));

alter table public.product_master
  drop constraint if exists product_master_assortment_status_check;

alter table public.product_master
  add constraint product_master_assortment_status_check check (assortment_status in (
    'active', 'order_only', 'candidate', 'excluded', 'archived'
  ));

create index if not exists product_master_brand_id_idx
  on public.product_master(brand_id);

create index if not exists product_master_category_id_idx
  on public.product_master(category_id);

create index if not exists product_master_status_idx
  on public.product_master(status);

create index if not exists product_master_assortment_status_idx
  on public.product_master(assortment_status);

create index if not exists product_master_manufacturer_sku_idx
  on public.product_master(manufacturer_sku);

create index if not exists product_master_ean_idx
  on public.product_master(ean);

-- Product workflow / assortment change history.
create table if not exists public.product_status_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product_master(id) on delete cascade,
  change_type text not null check (change_type in ('status', 'assortment_status')),
  previous_value text,
  new_value text not null,
  reason text,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists product_status_history_product_id_idx
  on public.product_status_history(product_id);

create index if not exists product_status_history_created_at_idx
  on public.product_status_history(created_at desc);
