-- Add commercial_product_id to the tables that used to reference
-- product_master directly for margin/price-history/status-history
-- purposes. All additive; backfilled where real data exists.

alter table public.product_cost_snapshots
  add column if not exists commercial_product_id uuid references public.commercial_products(id);

create index if not exists product_cost_snapshots_commercial_product_id_idx
  on public.product_cost_snapshots(commercial_product_id);

-- 0 rows exist yet (verified live), so no backfill needed here.

alter table public.channel_price_history
  add column if not exists commercial_product_id uuid references public.commercial_products(id);

create index if not exists channel_price_history_commercial_product_id_idx
  on public.channel_price_history(commercial_product_id);

-- 440 existing rows all have product_id = NULL (verified live) -- nothing
-- to backfill; new writes populate commercial_product_id going forward.

alter table public.product_status_history
  add column if not exists commercial_product_id uuid references public.commercial_products(id);

create index if not exists product_status_history_commercial_product_id_idx
  on public.product_status_history(commercial_product_id);

-- Backfill the 3 existing rows via the 1:1 product_master ->
-- commercial_products mapping created in
-- 20260807050100_backfill_commercial_products.sql.
update public.product_status_history psh
set commercial_product_id = cp.id
from public.commercial_products cp
where cp.master_product_id = psh.product_id
  and psh.commercial_product_id is null;
