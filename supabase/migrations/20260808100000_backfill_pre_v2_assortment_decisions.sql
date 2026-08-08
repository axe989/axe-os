-- Product Center v2's Opportunity Queue introduced an explicit, recorded
-- assortment decision on supplier_offers (see
-- 20260808090000_product_center_v2_status_and_decisions.sql). Offers that
-- already had a Base Product linked from before that existed have no such
-- record, so the Launch Checklist's "business decision confirmed" item
-- (correctly, per its own logic) reads them as still pending -- even
-- though the product was, in fact, already accepted into the assortment
-- under the old workflow. This one-time backfill makes that historical
-- reality explicit instead of leaving a phantom "not yet decided" on
-- products that have been live for a while.
--
-- Scope is deliberately narrow: only rows that already have product_id
-- set (an actual accepted linkage) and are still at the 'pending' default
-- -- never touches a real decision made through the Opportunity Queue.

update public.supplier_offers
set
  assortment_decision = 'accepted',
  assortment_decision_reason = 'Обратное заполнение: товар был принят в ассортимент до появления Product Center v2 (Очереди возможностей)',
  assortment_decision_at = now(),
  updated_at = now()
where product_id is not null
  and assortment_decision = 'pending';
