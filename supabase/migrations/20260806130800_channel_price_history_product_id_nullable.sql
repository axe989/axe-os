-- channel_listings.product_id is nullable (a listing may not be matched to
-- a product_master row yet), so channel_price_history -- which records a
-- price observed for a listing at import time -- must allow the same:
-- most repricer-export rows arrive with no product match at all.

alter table public.channel_price_history
  alter column product_id drop not null;
