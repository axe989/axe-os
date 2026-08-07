-- channel_listings -> marketplace_listings: the new model gives listings
-- formal domain status as Level 3 (Kaspi XML is a listing source, never a
-- master-catalog source). Rename preserves all rows and FKs automatically.
--
-- product_id (-> product_master) is kept but deprecated: verified live
-- that all 532 existing rows already have product_id = NULL (the old
-- pipeline never auto-matched channel listings), so there is nothing to
-- remap. New code links through commercial_product_id instead.

alter table public.channel_listings rename to marketplace_listings;

alter table public.marketplace_listings
  add column if not exists commercial_product_id uuid references public.commercial_products(id);

create index if not exists marketplace_listings_commercial_product_id_idx
  on public.marketplace_listings(commercial_product_id);

comment on column public.marketplace_listings.product_id is
  'Deprecated: superseded by commercial_product_id. Kept for backward compatibility, always NULL as of this migration.';
