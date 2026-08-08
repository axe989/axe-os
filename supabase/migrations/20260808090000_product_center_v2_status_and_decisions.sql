-- Product Center v2.0 (approved business architecture, see chat history):
-- the 9-stage Product Development Kanban maps almost 1:1 onto the existing
-- commercial_products.status enum -- it was only missing a distinct
-- "Images" stage (currently lumped into needs_content) and a post-launch
-- "Optimization" stage. Both are additive: every existing row stays valid.

alter table public.commercial_products
  drop constraint if exists commercial_products_status_check;

alter table public.commercial_products
  add constraint commercial_products_status_check check (status in (
    'discovered', 'needs_matching', 'draft', 'needs_technical_data',
    'needs_content', 'needs_images', 'needs_price', 'review', 'approved',
    'ready_to_publish', 'published', 'needs_update', 'optimization', 'archived'
  ));

-- Opportunity Queue: today "accept" only exists implicitly (a Base
-- Product gets created); Reject and Postpone have no representation at
-- all. Make all four decisions (Accept/Reject/Postpone/Ignore) real,
-- visible, filterable state on the offer itself, decided by the
-- Commercial Director (Marketplace Division) per the approved business
-- architecture.

alter table public.supplier_offers
  add column if not exists assortment_decision text not null default 'pending',
  add column if not exists assortment_decision_reason text,
  add column if not exists assortment_decision_by text,
  add column if not exists assortment_decision_at timestamptz;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_assortment_decision_check;

alter table public.supplier_offers
  add constraint supplier_offers_assortment_decision_check check (assortment_decision in (
    'pending', 'accepted', 'rejected', 'ignored', 'postponed'
  ));

create index if not exists supplier_offers_assortment_decision_idx
  on public.supplier_offers(assortment_decision);

-- Product Launch Checklist (Chapter 7 of the approved business
-- architecture): status for most checklist items is auto-computed from
-- signals the system already resolves (same signals the Readiness Engine
-- uses -- see lib/catalog/readiness/), so this table stores ONLY the
-- operational overlay that can't be derived automatically: a target
-- date, a human note on what's blocking, and an optional manual status
-- override for cases where a person needs to force a state the automatic
-- signals don't capture (e.g. "verbally confirmed with supplier, paperwork
-- pending"). One row per (commercial product, checklist item key); the
-- set of valid item keys is defined in code
-- (lib/catalog/checklist/items.ts), not a second database table, since
-- it's a fixed business policy, not user-editable configuration.

create table if not exists public.commercial_product_launch_tasks (
  id uuid primary key default gen_random_uuid(),
  commercial_product_id uuid not null references public.commercial_products(id) on delete cascade,
  item_key text not null,
  target_date date,
  status_override text check (status_override in ('done', 'blocked', 'not_applicable')),
  blocking_note text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commercial_product_id, item_key)
);

create index if not exists commercial_product_launch_tasks_commercial_product_id_idx
  on public.commercial_product_launch_tasks(commercial_product_id);
