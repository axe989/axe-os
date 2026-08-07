-- Media inheritance: Master Product -> Commercial Product -> Content
-- Variant. Each level may reuse the level above (leave null) or override
-- with its own media_sets row -- never duplicate assets. Resolution order
-- is implemented in lib/catalog/media/resolve-media-set.ts.
--
-- Also adds the short, human-readable codes needed by the deterministic
-- seller SKU generator (AXE-{brand_code}-{model_code}-{variant_suffix}):
-- product_brands.short_code and commercial_products.bundle_code.

alter table public.product_brands
  add column if not exists short_code text;

create unique index if not exists product_brands_short_code_uidx
  on public.product_brands(short_code)
  where short_code is not null;

alter table public.product_master
  add column if not exists default_media_set_id uuid references public.media_sets(id);

alter table public.commercial_products
  add column if not exists media_set_id uuid references public.media_sets(id),
  add column if not exists bundle_code text;

create index if not exists product_master_default_media_set_id_idx
  on public.product_master(default_media_set_id);

create index if not exists commercial_products_media_set_id_idx
  on public.commercial_products(media_set_id);
