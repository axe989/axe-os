-- Product Readiness Engine: Documentation dimension needs a real data
-- source, not a guess. required_document_types is per-category (a
-- radiator and, say, an electrical appliance may have different
-- compliance/warranty document requirements) and defaults to an empty
-- array -- absence of a configured requirement means "not applicable",
-- never "missing compliance docs" for a category nobody has reviewed yet.

alter table public.product_categories
  add column if not exists required_document_types jsonb not null default '[]'::jsonb;

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  commercial_product_id uuid not null references public.commercial_products(id) on delete cascade,
  document_type text not null,
  status text not null default 'required' check (status in (
    'required', 'uploaded', 'verified', 'not_applicable'
  )),
  file_reference text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_documents_commercial_product_id_idx
  on public.product_documents(commercial_product_id);
