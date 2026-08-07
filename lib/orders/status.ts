/**
 * Kaspi exposes several order fields that are easy to conflate:
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
 * - `attributes.kaspiDelivery.courierTransmissionDate` — the actual
 *   epoch-ms timestamp the parcel was handed to a courier. Persisted in
 *   `sales_orders.courier_handover_at`.
 *
 * These do not move in lockstep, and `state=KASPI_DELIVERY` is the one
 * most likely to mislead: Kaspi sets it as soon as an order is *routed*
 * through its own delivery network, at acceptance time — well before
 * the parcel is actually assembled and physically handed to a courier.
 * Verified against production data: of 13 orders with
 * state IN (DELIVERY, KASPI_DELIVERY) and an active disposition, only 6
 * had courier_handover_at set (and assembled=true in the raw payload);
 * the other 7 had courier_handover_at=null (assembled=false) — they were
 * simply accepted, not shipped. `courierTransmissionPlanningDate` /
 * `plannedDeliveryDate` are schedule fields, not proof of handover, and
 * must not be treated as such. Delivery *mode* (courier network vs
 * pickup point) is a third, unrelated dimension and must not be used to
 * decide pipeline stage either.
 *
 * A separate real edge case: an order can sit in the KASPI_DELIVERY
 * pipeline state while its disposition is already CANCELLING (observed
 * live on 4 real orders) — that order is not "in transit", it's being
 * unwound, even if it was handed to a courier before the cancellation.
 */

const IN_TRANSIT_PIPELINE_STATES = ["DELIVERY", "KASPI_DELIVERY", "PICKUP"];
const CANCELLED_DISPOSITIONS = ["CANCELLED", "CANCELLING", "RETURNED"];
const COMPLETED_DISPOSITION = "COMPLETED";

export type OrderTransitInput = {
  /** `sales_orders.status` — Kaspi's `attributes.state` pipeline bucket. */
  kaspiState: string | null | undefined;
  /** `sales_orders.external_status` — Kaspi's `attributes.status` disposition. */
  kaspiDisposition: string | null | undefined;
  /**
   * `sales_orders.courier_handover_at` — the actual handover timestamp
   * (any truthy value = it happened). null/undefined means the order
   * has not physically left the seller yet, regardless of what state
   * or delivery mode says.
   */
  courierHandoverAt: string | number | Date | null | undefined;
};

export function isOrderInTransit(order: OrderTransitInput): boolean {
  const state = order.kaspiState ?? "";
  const disposition = order.kaspiDisposition ?? "";

  const handedToCourier = Boolean(order.courierHandoverAt);
  const inDeliveryPipelineState =
    IN_TRANSIT_PIPELINE_STATES.includes(state);
  const isCancelled = CANCELLED_DISPOSITIONS.includes(disposition);
  const isClosedOut = disposition === COMPLETED_DISPOSITION;

  return (
    handedToCourier &&
    inDeliveryPipelineState &&
    !isCancelled &&
    !isClosedOut
  );
}
