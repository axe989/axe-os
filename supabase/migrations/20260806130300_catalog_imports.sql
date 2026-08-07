-- Product Catalog Engine: generic import pipeline audit trail.

create table if not exists public.catalog_imports (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in (
    'supplier_stock', 'supplier_price', 'current_catalog', 'repricer', 'channel_listing'
  )),
  source_name text not null,
  supplier_id uuid references public.suppliers(id),
  file_name text not null,
  file_hash text not null,
  worksheet_name text,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'completed', 'completed_with_errors', 'failed'
  )),
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_rejected integer not null default 0,
  imported_by text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Prevents accidentally re-processing the exact same file+worksheet twice
-- while it is still pending/processing; a completed import CAN be
-- re-uploaded deliberately (idempotent row-level upsert handles that),
-- so the uniqueness only guards in-flight duplicates.
create unique index if not exists catalog_imports_inflight_file_hash_uidx
  on public.catalog_imports(file_hash, worksheet_name)
  where status in ('pending', 'processing');

create index if not exists catalog_imports_file_hash_idx
  on public.catalog_imports(file_hash);

create index if not exists catalog_imports_import_type_idx
  on public.catalog_imports(import_type);

create index if not exists catalog_imports_supplier_id_idx
  on public.catalog_imports(supplier_id);

create index if not exists catalog_imports_status_idx
  on public.catalog_imports(status);

alter table public.supplier_offers
  add constraint supplier_offers_source_import_id_fkey
  foreign key (source_import_id) references public.catalog_imports(id);

create table if not exists public.catalog_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.catalog_imports(id) on delete cascade,
  source_row_number integer not null,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  import_status text not null default 'pending' check (import_status in (
    'pending', 'imported', 'rejected', 'skipped_unchanged'
  )),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists catalog_import_rows_import_id_idx
  on public.catalog_import_rows(import_id);

create index if not exists catalog_import_rows_import_status_idx
  on public.catalog_import_rows(import_status);
