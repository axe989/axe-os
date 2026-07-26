/**
 * Kaspi exposes two independent order fields that are easy to conflate:
 *
 * - `attributes.state` — the coarse pipeline bucket Kaspi itself queries
 *   orders by (`GET /orders?filter[orders][state]=...`). Persisted in
 *   `sales_orders.status`. Real observed values: NEW, SIGN_REQUIRED,
 *   PICKUP, DELIVERY, KASPI_DELIVERY, ARCHIVE.
 * - `attributes.status` — the finer business disposition. Persisted in
 *   `sales_orders.external_status`. Real observed values: NEW,
 *   SIGN_REQUIRED, ACCEPTED_BY_MERCHANT, APPROVED_BY_BANK, PICKUP,
 *   DELIVERY, KASPI_DELIVERY, COMPLETED, ARCHIVE, CANCELLED, CANCELLING,
 *   RETURNED.
 *
 * These do not move in lockstep: an order can sit in the KASPI_DELIVERY
 * pipeline state while its disposition is already CANCELLING (observed
 * live on 4 real orders) — that order is not "in transit", it's being
 * unwound. Delivery *mode* (courier network vs pickup point) is a third,
 * unrelated dimension and must not be used to decide pipeline stage.
 */

const IN_TRANSIT_PIPELINE_STATES = ["DELIVERY", "KASPI_DELIVERY", "PICKUP"];
const CANCELLED_DISPOSITIONS = ["CANCELLED", "CANCELLING", "RETURNED"];
const COMPLETED_DISPOSITION = "COMPLETED";

export type OrderTransitInput = {
  /** `sales_orders.status` — Kaspi's `attributes.state` pipeline bucket. */
  kaspiState: string | null | undefined;
  /** `sales_orders.external_status` — Kaspi's `attributes.status` disposition. */
  kaspiDisposition: string | null | undefined;
};

export function isOrderInTransit(order: OrderTransitInput): boolean {
  const state = order.kaspiState ?? "";
  const disposition = order.kaspiDisposition ?? "";

  const handedToCourierOrInDelivery =
    IN_TRANSIT_PIPELINE_STATES.includes(state);
  const isCancelled = CANCELLED_DISPOSITIONS.includes(disposition);
  const isClosedOut = disposition === COMPLETED_DISPOSITION;

  return handedToCourierOrInDelivery && !isCancelled && !isClosedOut;
}
