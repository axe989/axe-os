-- bundle_components was originally defaulted to '{}'::jsonb (an empty
-- OBJECT) back in 20260807050000_commercial_products.sql, before the
-- Kaspi Publication Pipeline defined it as an ARRAY of BundleComponent
-- entries (see lib/catalog/types.ts). Discovered by actually running the
-- app against real data: every existing commercial_products row still
-- carries the old {} default, which breaks
-- resolveEquipmentFromBundle's .map() call. Normalize existing rows and
-- fix the default so new rows don't regress.

update public.commercial_products
set bundle_components = '[]'::jsonb
where bundle_components = '{}'::jsonb;

alter table public.commercial_products
  alter column bundle_components set default '[]'::jsonb;
