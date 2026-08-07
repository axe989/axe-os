-- One-time backfill: every product_master row created under the old
-- two-level model gets exactly one commercial_products row representing
-- its default/standard commercial packaging, so no assortment/workflow
-- decision already made is lost. product_master.status/assortment_status/
-- content_status/publication_readiness are copied verbatim, not
-- reinterpreted -- those columns are deprecated (kept, not dropped; see
-- migration 20260807050600) rather than migrated destructively.

insert into public.commercial_products (
  master_product_id, commercial_name, status, assortment_status,
  content_status, publication_readiness
)
select
  pm.id, pm.name, pm.status, pm.assortment_status,
  pm.content_status, pm.publication_readiness
from public.product_master pm
where not exists (
  select 1 from public.commercial_products cp
  where cp.master_product_id = pm.id
);
