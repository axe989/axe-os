-- Product Catalog Engine: immutable per-order-item cost/margin snapshots,
-- so historical order profitability never changes when catalog prices do.
--
-- Additive only. `order_items` and `sales_orders` are otherwise untouched;
-- the live Kaspi sync (lib/integrations/kaspi/kaspi-orders-sync.ts) keeps
-- writing to sales_orders.items jsonb as it does today. Populating these
-- new columns from real orders (via the matching engine) is follow-up
-- integration work, tracked as a known limitation, not done in this
-- migration.

alter table public.order_items
  add column if not exists product_master_id uuid references public.product_master(id),
  add column if not exists sale_price_snapshot numeric(14,2),
  add column if not exists purchase_price_snapshot numeric(14,2),
  add column if not exists supplier_snapshot text,
  add column if not exists commission_snapshot numeric(14,2),
  add column if not exists logistics_snapshot numeric(14,2),
  add column if not exists advertising_snapshot numeric(14,2),
  add column if not exists other_cost_snapshot numeric(14,2),
  add column if not exists expected_profit_snapshot numeric(14,2),
  add column if not exists expected_margin_snapshot numeric(6,2),
  add column if not exists actual_purchase_cost numeric(14,2),
  add column if not exists actual_commission numeric(14,2),
  add column if not exists actual_logistics_cost numeric(14,2),
  add column if not exists actual_advertising_cost numeric(14,2),
  add column if not exists actual_profit numeric(14,2),
  add column if not exists actual_margin numeric(6,2);

create index if not exists order_items_product_master_id_idx
  on public.order_items(product_master_id);
