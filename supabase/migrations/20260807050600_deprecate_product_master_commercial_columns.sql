-- Mark the four columns that moved to commercial_products as deprecated.
-- Not dropped: "avoid destructive changes" / "preserve imported data" --
-- a follow-up cleanup migration can drop them once the team confirms
-- nothing external depends on them. New code must stop writing to these
-- on product_master; commercial_products.{status,assortment_status,
-- content_status,publication_readiness} are now the source of truth.

comment on column public.product_master.status is
  'Deprecated: moved to commercial_products.status. Master Product no longer carries commercial/workflow state.';
comment on column public.product_master.assortment_status is
  'Deprecated: moved to commercial_products.assortment_status.';
comment on column public.product_master.content_status is
  'Deprecated: moved to commercial_products.content_status.';
comment on column public.product_master.publication_readiness is
  'Deprecated: moved to commercial_products.publication_readiness.';
