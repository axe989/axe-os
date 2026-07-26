alter table public.sales_orders
  add column if not exists courier_handover_at timestamptz,
  add column if not exists planned_delivery_at timestamptz;

create index if not exists sales_orders_courier_handover_at_idx
  on public.sales_orders(courier_handover_at);
