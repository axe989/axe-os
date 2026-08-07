-- Architecture change: four-level catalog model (Master Product ->
-- Commercial Product -> Marketplace Listing -> Listing Strategy).
--
-- Master Product must only ever hold objective manufacturer facts.
-- Everything about *how AXE sells* a product -- bundle/service
-- composition, commercial naming, workflow/assortment/content/publication
-- state, pricing-strategy override, preferred supplier -- belongs to the
-- Commercial Product instead. One Master Product can produce many
-- Commercial Products (e.g. "without installation" / "with WiFi module").

create table if not exists public.commercial_products (
  id uuid primary key default gen_random_uuid(),
  master_product_id uuid not null references public.product_master(id),
  commercial_name text not null,
  bundle_components jsonb not null default '{}'::jsonb,
  status text not null default 'discovered',
  assortment_status text not null default 'candidate',
  content_status text not null default 'missing',
  publication_readiness text not null default 'not_ready',
  pricing_strategy_id uuid references public.pricing_strategies(id),
  preferred_supplier_id uuid references public.suppliers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commercial_products
  add constraint commercial_products_status_check check (status in (
    'discovered', 'needs_matching', 'draft', 'needs_technical_data',
    'needs_content', 'needs_price', 'review', 'approved',
    'ready_to_publish', 'published', 'needs_update', 'archived'
  ));

alter table public.commercial_products
  add constraint commercial_products_assortment_status_check check (assortment_status in (
    'active', 'order_only', 'candidate', 'excluded', 'archived'
  ));

create index if not exists commercial_products_master_product_id_idx
  on public.commercial_products(master_product_id);

create index if not exists commercial_products_status_idx
  on public.commercial_products(status);

create index if not exists commercial_products_assortment_status_idx
  on public.commercial_products(assortment_status);

create index if not exists commercial_products_preferred_supplier_id_idx
  on public.commercial_products(preferred_supplier_id);
