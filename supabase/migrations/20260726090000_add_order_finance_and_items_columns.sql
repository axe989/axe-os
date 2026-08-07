alter table public.sales_orders
  add column if not exists purchased boolean not null default false,
  add column if not exists purchased_at timestamptz,
  add column if not exists supplier text,
  add column if not exists purchase_price numeric(14,2) not null default 0,
  add column if not exists logistics_cost numeric(14,2) not null default 0,
  add column if not exists advertising_cost numeric(14,2) not null default 0,
  add column if not exists manager text,
  add column if not exists note text,
  add column if not exists profit numeric(14,2) not null default 0,
  add column if not exists margin numeric(6,2) not null default 0,
  add column if not exists items jsonb;

create index if not exists sales_orders_purchased_idx
  on public.sales_orders(purchased);
