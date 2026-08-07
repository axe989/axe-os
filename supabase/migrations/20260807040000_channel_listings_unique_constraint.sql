-- The partial unique index from 20260806130500_channel_listings.sql
-- (unique on (sales_channel, external_sku) WHERE external_sku IS NOT NULL)
-- cannot be used as an ON CONFLICT arbiter by a plain upsert onConflict
-- column list -- Postgres only infers against partial indexes when the
-- conflict clause repeats the same WHERE predicate, which batched
-- upserts here don't specify. Every listing we import always carries an
-- external_sku, so a full unique constraint is safe and simpler.

drop index if exists public.channel_listings_channel_external_sku_uidx;

alter table public.channel_listings
  add constraint channel_listings_sales_channel_external_sku_key
  unique (sales_channel, external_sku);
