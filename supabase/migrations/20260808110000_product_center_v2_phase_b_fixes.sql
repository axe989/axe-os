-- Product Center v2 rework, Phase B: data integrity fixes + storage
-- foundation identified during the audit (see mandate Section 10).

-- 1) "Собственный склад (Термо)" is not an external vendor -- traced via
-- catalog_imports to a stock file ("Остатки 17.07.2026.xlsx", sheet
-- "Термо") of AXE's own warehouse holdings of Royal Thermo goods
-- (supplier_brand_raw = "Royal Thermo" on 697/706 of these offers). The
-- name was real but underspecified, not a mapping bug: fixing it at the
-- data layer (the actual suppliers.name column the UI joins against),
-- not just relabeling in a component.
update public.suppliers
set name = 'Royal Thermo — собственный склад'
where id = '35b17142-9259-42b7-b1ac-c6b02fd68249'
  and name = 'Собственный склад (Термо)';

-- 2) Storage bucket for real product media/document uploads (Section 5:
-- Медиа/Документы tabs need genuine upload, not placeholders). None
-- existed at all prior to this migration. Public read is acceptable here
-- -- these are product photos and compliance documents that are either
-- already public-facing (marketplace images) or non-sensitive technical
-- paperwork (passport/certificate/manual/warranty), not customer data.
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

-- 3) Launch Checklist item model gains completed_at (Section 6: "status,
-- blocking/non-blocking, responsible role/person, completed_at, blocking
-- reason, action/link" per item). blocking_note already covers "blocking
-- reason"; target_date/status_override/updated_by already exist.
-- completed_at is set by the API route when a manual override moves an
-- item to 'done' (see app/api/catalog/launch-tasks/route.ts), and cleared
-- if it moves away from 'done'.
alter table public.commercial_product_launch_tasks
  add column if not exists completed_at timestamptz;
