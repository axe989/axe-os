create extension if not exists pgcrypto;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  bin text,
  contact_name text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  brand text,
  category text,
  model text,
  unit text not null default 'шт',
  kaspi_sku text,
  halyk_sku text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  product_id uuid not null references public.products(id),
  supplier_sku text,
  purchase_price numeric(14,2) not null default 0,
  stock_quantity numeric(14,3),
  is_available boolean not null default false,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  external_order_id text,
  sales_channel text not null,
  order_date timestamptz not null,
  status text not null default 'new',
  customer_name text,
  sale_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sales_channel, external_order_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity numeric(14,3) not null default 1,
  sale_price numeric(14,2) not null default 0,
  purchase_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.order_costs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  cost_type text not null,
  amount numeric(14,2) not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create index supplier_offers_supplier_id_idx
  on public.supplier_offers(supplier_id);

create index supplier_offers_product_id_idx
  on public.supplier_offers(product_id);

create index sales_orders_order_date_idx
  on public.sales_orders(order_date);

create index sales_orders_channel_idx
  on public.sales_orders(sales_channel);

create index order_items_order_id_idx
  on public.order_items(order_id);

create index order_costs_order_id_idx
  on public.order_costs(order_id);