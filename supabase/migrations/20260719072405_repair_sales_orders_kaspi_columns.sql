alter table public.sales_orders
  add column if not exists external_id text,
  add column if not exists external_code text,
  add column if not exists external_status text,
  add column if not exists delivery_type text,
  add column if not exists delivery_cost numeric(14,2) not null default 0,
  add column if not exists payment_mode text,
  add column if not exists customer_phone text,
  add column if not exists recipient_name text,
  add column if not exists source_payload jsonb,
  add column if not exists synced_at timestamptz;

create unique index if not exists sales_orders_channel_external_id_uidx
  on public.sales_orders(sales_channel, external_id)
  where external_id is not null;

create index if not exists sales_orders_external_status_idx
  on public.sales_orders(external_status);

create index if not exists sales_orders_synced_at_idx
  on public.sales_orders(synced_at desc);
